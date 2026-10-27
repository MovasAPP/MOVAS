-- Prevent out-of-order Mercado Pago notifications from reopening a closed
-- payment attempt or assigning work after a terminal payment state.
-- Run only in the dedicated CONTRATEI Supabase project.

create or replace function public.apply_mercado_pago_payment(
  p_attempt_id uuid,
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

  select * into v_payment from public.job_payments p where p.attempt_id = p_attempt_id for update;
  if not found then return; end if;
  select a.provider_user_id into v_provider_seller_id
  from public.payment_provider_accounts a where a.user_id = v_payment.worker_id;
  if v_provider_seller_id is null or v_provider_seller_id <> p_provider_seller_id then raise exception 'Seller account mismatch'; end if;
  if round(coalesce(p_transaction_amount, -1), 2) <> round(v_payment.customer_total, 2)
    or round(coalesce(p_marketplace_fee, -1), 2) <> round(v_payment.platform_fee, 2) then
    raise exception 'Payment amount mismatch';
  end if;

  select * into v_job from public.job_requests j where j.id = v_payment.job_id for update;
  if not found then raise exception 'Job not found'; end if;

  -- Terminal attempts stay terminal if an older webhook arrives late.
  if v_payment.status in ('rejected', 'cancelled', 'expired', 'refunded', 'charged_back', 'failed') then
    return;
  end if;

  -- A refund or chargeback before our approval event must never assign the job.
  if p_status in ('refunded', 'charged_back') then
    update public.job_payments set status = p_status, provider_payment_id = p_provider_payment_id,
      processing_fee = p_processing_fee where id = v_payment.id;
    if v_payment.status in ('creating', 'pending') then
      update public.job_requests set status = 'open'
      where id = v_payment.job_id and status = 'awaiting_payment' and assigned_worker_id is null;
    end if;
    return;
  end if;

  if v_payment.status = 'approved' then
    if p_status = 'approved' then
      if v_payment.provider_payment_id = p_provider_payment_id then return; end if;
      raise exception 'A different payment already completed this job';
    end if;
    return;
  end if;

  if p_status = 'approved' then
    if v_payment.status not in ('creating', 'pending') then
      raise exception 'This payment attempt is no longer active';
    end if;
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

revoke all on function public.apply_mercado_pago_payment(uuid, text, text, numeric, numeric, text, numeric) from public, anon, authenticated;
grant execute on function public.apply_mercado_pago_payment(uuid, text, text, numeric, numeric, text, numeric) to service_role;
