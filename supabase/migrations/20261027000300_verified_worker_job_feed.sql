-- Restrict the details of open requests to verified working profiles.
-- Job owners keep access to their own requests at every status.

drop policy if exists "clients read own jobs and workers read open jobs"
  on public.job_requests;

create policy "clients and verified workers read relevant jobs"
on public.job_requests for select to authenticated
using (
  client_id = (select auth.uid())
  or (
    status = 'open'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.can_work
        and p.verification_status = 'verified'
    )
  )
);
