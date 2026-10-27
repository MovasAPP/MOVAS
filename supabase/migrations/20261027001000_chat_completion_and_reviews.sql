-- Hired workers retain access to their request and private work photos after payment.
drop policy if exists "clients read own jobs and workers read open jobs" on public.job_requests;
create policy "clients and hired workers read their job"
on public.job_requests for select to authenticated
using (client_id = (select auth.uid()) or status = 'open' or assigned_worker_id = (select auth.uid()));

drop policy if exists "job photos readable by job owner or verified workers for open jobs" on public.job_photos;
create policy "clients and eligible workers read job photos"
on public.job_photos for select to authenticated
using (exists (
  select 1 from public.job_requests j where j.id = job_id and (
    j.client_id = (select auth.uid()) or j.assigned_worker_id = (select auth.uid())
    or (j.status = 'open' and exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_work and p.verification_status = 'verified'
    ))
  )
));

drop policy if exists "job owners and verified workers view photos for open work" on storage.objects;
create policy "job participants and verified workers view job photos"
on storage.objects for select to authenticated
using (bucket_id = 'job-photos' and exists (
  select 1 from public.job_requests j where j.id::text = (storage.foldername(name))[1] and (
    j.client_id = (select auth.uid()) or j.assigned_worker_id = (select auth.uid())
    or (j.status = 'open' and exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_work and p.verification_status = 'verified'
    ))
  )
));

create policy "job participants can see each other public profiles"
on public.profiles for select to authenticated
using (
  exists (select 1 from public.job_requests j where j.client_id = (select auth.uid())
    and (j.assigned_worker_id = profiles.id or exists (
      select 1 from public.job_proposals p where p.job_id = j.id and p.worker_id = profiles.id
    )))
  or exists (select 1 from public.job_requests j where j.assigned_worker_id = (select auth.uid()) and j.client_id = profiles.id)
);

create table public.job_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index job_messages_job_created_idx on public.job_messages (job_id, created_at);
alter table public.job_messages enable row level security;
revoke all on public.job_messages from public, anon, authenticated;
grant select on public.job_messages to authenticated;
grant insert (job_id, sender_id, body) on public.job_messages to authenticated;
create policy "participants read private job messages"
on public.job_messages for select to authenticated
using (exists (select 1 from public.job_requests j where j.id = job_id
  and j.status in ('in_progress', 'completion_pending', 'completed')
  and (j.client_id = (select auth.uid()) or j.assigned_worker_id = (select auth.uid()))));
create policy "participants send private job messages"
on public.job_messages for insert to authenticated
with check (sender_id = (select auth.uid()) and exists (
  select 1 from public.job_requests j where j.id = job_id
    and j.status in ('in_progress', 'completion_pending')
    and (j.client_id = (select auth.uid()) or j.assigned_worker_id = (select auth.uid()))
));

create or replace function public.request_job_completion(p_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.job_requests set status = 'completion_pending'
  where id = p_job_id and assigned_worker_id = (select auth.uid()) and status = 'in_progress';
  if not found then raise exception 'Este serviço não pode ser marcado como concluído.'; end if;
end;
$$;
create or replace function public.confirm_job_completion(p_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.job_requests set status = 'completed', completed_at = now()
  where id = p_job_id and client_id = (select auth.uid()) and status = 'completion_pending';
  if not found then raise exception 'Não há conclusão pendente para confirmar.'; end if;
end;
$$;
revoke all on function public.request_job_completion(uuid) from public, anon;
revoke all on function public.confirm_job_completion(uuid) from public, anon;
grant execute on function public.request_job_completion(uuid) to authenticated;
grant execute on function public.confirm_job_completion(uuid) to authenticated;

create table public.job_reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  subject_id uuid not null references public.profiles (id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id),
  check (reviewer_id <> subject_id)
);
create index job_reviews_subject_created_idx on public.job_reviews (subject_id, created_at desc);
alter table public.job_reviews enable row level security;
revoke all on public.job_reviews from public, anon, authenticated;
grant select on public.job_reviews to authenticated;
grant insert (job_id, reviewer_id, subject_id, rating, comment) on public.job_reviews to authenticated;
create policy "review participants read their job reviews"
on public.job_reviews for select to authenticated
using (reviewer_id = (select auth.uid()) or subject_id = (select auth.uid())
  or exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.role in ('owner', 'support')));
create policy "participants review each other after confirmed completion"
on public.job_reviews for insert to authenticated
with check (reviewer_id = (select auth.uid()) and exists (
  select 1 from public.job_requests j where j.id = job_id and j.status = 'completed'
    and ((j.client_id = reviewer_id and j.assigned_worker_id = subject_id)
      or (j.assigned_worker_id = reviewer_id and j.client_id = subject_id))
));
create or replace function public.get_public_worker_ratings(p_worker_ids uuid[])
returns table (worker_id uuid, average_rating numeric, review_count bigint)
language sql stable security definer set search_path = '' as $$
  select r.subject_id, round(avg(r.rating)::numeric, 2), count(*)
  from public.job_reviews r where r.subject_id = any(coalesce(p_worker_ids, '{}'::uuid[]))
  group by r.subject_id;
$$;
revoke all on function public.get_public_worker_ratings(uuid[]) from public;
grant execute on function public.get_public_worker_ratings(uuid[]) to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'job_messages') then
    alter publication supabase_realtime add table public.job_messages;
  end if;
end;
$$;
