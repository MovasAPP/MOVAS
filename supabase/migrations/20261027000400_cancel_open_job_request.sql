-- Let a client cancel only their own open request, atomically closing pending proposals.
create or replace function public.cancel_open_job_request(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.job_requests
  set status = 'cancelled'
  where id = p_job_id
    and client_id = v_user_id
    and status = 'open';
  if not found then
    raise exception 'Request is not open or does not belong to this account';
  end if;

  update public.job_proposals
  set status = 'rejected'
  where job_id = p_job_id
    and status = 'pending';
end;
$$;

revoke all on function public.cancel_open_job_request(uuid) from public, anon;
grant execute on function public.cancel_open_job_request(uuid) to authenticated;
