create table public.job_payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete restrict,
  proposal_id uuid not null references public.job_proposals (id) on delete restrict,
  client_id uuid not null references public.profiles (id) on delete restrict,
  worker_id uuid not null references public.profiles (id) on delete restrict,
  service_amount numeric(12,2) not null check (service_amount > 0),
  platform_fee numeric(12,2) generated always as (round(service_amount * 0.10, 2)) stored,
  customer_total numeric(12,2) generated always as (service_amount + round(service_amount * 0.10, 2)) stored,
  processing_fee numeric(12,2) check (processing_fee is null or processing_fee >= 0),
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  provider_preference_id text unique,
  provider_payment_id text unique,
  checkout_url text,
  status text not null default 'creating' check (status in ('creating', 'pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded', 'charged_back', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proposal_id)
);

create unique index job_payments_one_active_per_job_idx
  on public.job_payments (job_id)
  where status in ('creating', 'pending', 'approved');
create index job_payments_client_idx on public.job_payments (client_id, created_at desc);
create index job_payments_worker_idx on public.job_payments (worker_id, created_at desc);

create trigger job_payments_set_updated_at before update on public.job_payments
for each row execute function public.set_updated_at();

alter table public.job_payments enable row level security;
revoke all on public.job_payments from public, anon, authenticated;
grant select (id, job_id, proposal_id, client_id, worker_id, service_amount, platform_fee, customer_total, processing_fee, status, created_at, updated_at)
  on public.job_payments to authenticated;
grant all on public.job_payments to service_role;

create policy "payment participants read payment status only"
on public.job_payments for select to authenticated
using (client_id = (select auth.uid()) or worker_id = (select auth.uid()));

create or replace function public.prepare_job_payment(p_client_id uuid, p_proposal_id uuid)
returns table (
  payment_id uuid,
  job_id uuid,
  proposal_id uuid,
  worker_id uuid,
  service_amount numeric,
  platform_fee numeric,
  customer_total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.job_requests%rowtype;
  v_proposal public.job_proposals%rowtype;
  v_payment public.job_payments%rowtype;
begin
  select * into v_job from public.job_requests j
  where j.client_id = p_client_id and j.status = 'open'
    and j.id = (select p.job_id from public.job_proposals p where p.id = p_proposal_id)
  for update;
  if not found then raise exception 'Este pedido não pode iniciar uma contratação.'; end if;

  select * into v_proposal from public.job_proposals p
  where p.id = p_proposal_id and p.job_id = v_job.id and p.status = 'pending'
  for update;
  if not found then raise exception 'Esta proposta não está disponível.'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_proposal.worker_id and p.can_work and p.verification_status = 'verified'
  ) then raise exception 'O perfil do profissional não está disponível para contratação.'; end if;

  if not exists (
    select 1 from public.payment_provider_accounts a where a.user_id = v_proposal.worker_id
  ) then raise exception 'O profissional ainda não conectou a conta Mercado Pago.'; end if;

  select * into v_payment from public.job_payments p
  where p.proposal_id = v_proposal.id for update;
  if found then
    if v_payment.status in ('creating', 'pending', 'approved') then
      raise exception 'Já existe um pagamento ativo para esta proposta.';
    end if;
    update public.job_payments set
      service_amount = v_proposal.amount,
      status = 'creating',
      provider_preference_id = null,
      provider_payment_id = null,
      checkout_url = null,
      processing_fee = null
    where id = v_payment.id returning * into v_payment;
  else
    insert into public.job_payments (job_id, proposal_id, client_id, worker_id, service_amount)
    values (v_job.id, v_proposal.id, p_client_id, v_proposal.worker_id, v_proposal.amount)
    returning * into v_payment;
  end if;

  update public.job_requests set status = 'awaiting_payment' where id = v_job.id;

  return query select v_payment.id, v_payment.job_id, v_payment.proposal_id, v_payment.worker_id,
    v_payment.service_amount, v_payment.platform_fee, v_payment.customer_total;
end;
$$;

create or replace function public.save_job_payment_preference(
  p_payment_id uuid,
  p_preference_id text,
  p_checkout_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_preference_id is null or p_checkout_url is null or p_checkout_url !~ '^https://(www[.])?mercadopago[.]com[.]br(/|$)' then
    raise exception 'Invalid Mercado Pago checkout response';
  end if;
  update public.job_payments
  set provider_preference_id = p_preference_id, checkout_url = p_checkout_url, status = 'pending'
  where id = p_payment_id and status = 'creating';
  if not found then raise exception 'Payment attempt is no longer active'; end if;
end;
$$;

create or replace function public.fail_job_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  update public.job_payments
  set status = 'failed', checkout_url = null
  where id = p_payment_id and status = 'creating'
  returning job_id into v_job_id;
  if v_job_id is not null then
    update public.job_requests set status = 'open'
    where id = v_job_id and status = 'awaiting_payment' and assigned_worker_id is null;
  end if;
end;
$$;

create or replace function public.apply_mercado_pago_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_status text,
  p_transaction_amount numeric,
  p_marketplace_fee numeric,
  p_provider_seller_id text,
  p_processing_fee numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.job_payments%rowtype;
  v_job public.job_requests%rowtype;
  v_provider_seller_id text;
begin
  if p_status not in ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded', 'charged_back') then
    raise exception 'Unsupported payment status';
  end if;
  if p_provider_payment_id is null or p_provider_payment_id = '' then raise exception 'Payment identifier required'; end if;

  select * into v_payment from public.job_payments p where p.id = p_payment_id for update;
  if not found then raise exception 'Payment attempt not found'; end if;
  select a.provider_user_id into v_provider_seller_id
  from public.payment_provider_accounts a where a.user_id = v_payment.worker_id;
  if v_provider_seller_id is null or v_provider_seller_id <> p_provider_seller_id then raise exception 'Seller account mismatch'; end if;
  if round(coalesce(p_transaction_amount, -1), 2) <> round(v_payment.customer_total, 2)
    or round(coalesce(p_marketplace_fee, -1), 2) <> round(v_payment.platform_fee, 2) then
    raise exception 'Payment amount mismatch';
  end if;

  select * into v_job from public.job_requests j where j.id = v_payment.job_id for update;
  if not found then raise exception 'Job not found'; end if;

  if v_payment.status = 'approved' then
    if p_status = 'approved' then
      if v_payment.provider_payment_id = p_provider_payment_id then return; end if;
      raise exception 'A different payment already completed this job';
    end if;
    if p_status not in ('refunded', 'charged_back') then return; end if;
  end if;

  if p_status = 'approved' then
    if v_job.status <> 'awaiting_payment' or v_job.assigned_worker_id is not null then
      raise exception 'Job is no longer awaiting payment';
    end if;
    update public.job_payments set status = 'approved', provider_payment_id = p_provider_payment_id,
      processing_fee = p_processing_fee where id = v_payment.id;
    update public.job_requests set status = 'in_progress', assigned_worker_id = v_payment.worker_id
    where id = v_payment.job_id;
    update public.job_proposals set status = 'accepted'
    where id = v_payment.proposal_id and status = 'pending';
    if not found then raise exception 'Selected proposal is no longer pending'; end if;
    update public.job_proposals set status = 'rejected'
    where job_id = v_payment.job_id and id <> v_payment.proposal_id and status = 'pending';
    return;
  end if;

  update public.job_payments set status = p_status, provider_payment_id = p_provider_payment_id,
    processing_fee = p_processing_fee where id = v_payment.id;
  if p_status in ('rejected', 'cancelled', 'expired') and v_job.status = 'awaiting_payment' then
    update public.job_requests set status = 'open'
    where id = v_payment.job_id and assigned_worker_id is null;
  end if;
end;
$$;

revoke all on function public.prepare_job_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_job_payment_preference(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_job_payment(uuid) from public, anon, authenticated;
revoke all on function public.apply_mercado_pago_payment(uuid, text, text, numeric, numeric, text, numeric) from public, anon, authenticated;
grant execute on function public.prepare_job_payment(uuid, uuid) to service_role;
grant execute on function public.save_job_payment_preference(uuid, text, text) to service_role;
grant execute on function public.fail_job_payment(uuid) to service_role;
grant execute on function public.apply_mercado_pago_payment(uuid, text, text, numeric, numeric, text, numeric) to service_role;
