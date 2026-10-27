-- Restore the verified-worker gate for open job details while keeping access
-- for the client and the worker assigned to that job.
-- Run only in the dedicated CONTRATEI Supabase project.

-- PostgreSQL combines permissive SELECT policies with OR. Migration 010 added
-- the hired-worker rule without removing the narrower migration 003 policy,
-- leaving the broader policy able to expose every open job to any signed-in user.
drop policy if exists "clients and verified workers read relevant jobs"
  on public.job_requests;
drop policy if exists "clients and hired workers read their job"
  on public.job_requests;

create policy "clients hired workers and verified workers read relevant jobs"
on public.job_requests for select to authenticated
using (
  client_id = (select auth.uid())
  or assigned_worker_id = (select auth.uid())
  or (
    status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.can_work
        and p.verification_status = 'verified'
    )
  )
);

-- Keep future permissive policies from accidentally widening this access again.
create policy "restrict job reads to participants verified workers and support"
on public.job_requests as restrictive for select to authenticated
using (
  client_id = (select auth.uid())
  or assigned_worker_id = (select auth.uid())
  or (
    status = 'open'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.can_work
        and p.verification_status = 'verified'
    )
  )
  or exists (
    select 1 from public.staff_members s
    where s.user_id = (select auth.uid()) and s.role in ('owner', 'support')
  )
);
