create table public.job_disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.job_requests (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (reason in ('service_quality', 'not_completed', 'payment', 'safety', 'other')),
  details text not null check (char_length(trim(details)) between 10 and 3000),
  status text not null default 'open' check (status in ('open', 'resolved', 'closed')),
  resolution text check (resolution is null or char_length(resolution) <= 3000),
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger job_disputes_set_updated_at before update on public.job_disputes
for each row execute function public.set_updated_at();
alter table public.job_disputes enable row level security;
revoke all on public.job_disputes from public, anon, authenticated;
grant select on public.job_disputes to authenticated;
grant insert (job_id, opened_by, reason, details) on public.job_disputes to authenticated;
grant update (status, resolution, resolved_by) on public.job_disputes to authenticated;
create policy "dispute participants and support read disputes"
on public.job_disputes for select to authenticated
using (opened_by = (select auth.uid())
  or exists (select 1 from public.job_requests j where j.id = job_id
    and (j.client_id = (select auth.uid()) or j.assigned_worker_id = (select auth.uid())))
  or exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.role in ('owner', 'support')));
create policy "participants open a dispute on active work"
on public.job_disputes for insert to authenticated
with check (opened_by = (select auth.uid()) and status = 'open' and resolution is null and resolved_by is null
  and exists (select 1 from public.job_requests j where j.id = job_id
    and j.status in ('in_progress', 'completion_pending', 'completed')
    and (j.client_id = (select auth.uid()) or j.assigned_worker_id = (select auth.uid()))));
create policy "support resolves disputes"
on public.job_disputes for update to authenticated
using (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.role in ('owner', 'support')))
with check (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.role in ('owner', 'support')));

create policy "support staff read jobs"
on public.job_requests for select to authenticated
using (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.role in ('owner', 'support')));

create policy "support sees public profiles involved in disputes"
on public.profiles for select to authenticated
using (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.role in ('owner', 'support'))
  and exists (select 1 from public.job_disputes d join public.job_requests j on j.id = d.job_id
    where j.client_id = profiles.id or j.assigned_worker_id = profiles.id));

create or replace function public.confirm_job_completion(p_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.job_disputes d where d.job_id = p_job_id and d.status = 'open') then
    raise exception 'A conclusão fica bloqueada enquanto o suporte analisa uma solicitação aberta.';
  end if;
  update public.job_requests set status = 'completed', completed_at = now()
  where id = p_job_id and client_id = (select auth.uid()) and status = 'completion_pending';
  if not found then raise exception 'Não há conclusão pendente para confirmar.'; end if;
end;
$$;
