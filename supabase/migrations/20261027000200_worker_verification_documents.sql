-- Private identity document submission for CONTRATEI worker verification.
-- Run only in the dedicated CONTRATEI Supabase project.

create table public.worker_verification_documents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('identity_front', 'identity_back')),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  unique (worker_id, document_type),
  check (storage_path like worker_id::text || '/%')
);

create index worker_verification_documents_worker_idx
  on public.worker_verification_documents (worker_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('worker-verification', 'worker-verification', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.worker_verification_documents enable row level security;
revoke all on public.worker_verification_documents from anon, authenticated;
grant select, insert, delete on public.worker_verification_documents to authenticated;

create policy "workers and verification staff read identity document records"
on public.worker_verification_documents for select to authenticated
using (
  worker_id = (select auth.uid())
  or exists (
    select 1 from public.staff_members s
    where s.user_id = (select auth.uid()) and s.role in ('owner', 'verifier')
  )
);

create policy "workers add their own documents before verification review"
on public.worker_verification_documents for insert to authenticated
with check (
  worker_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.can_work
      and p.verification_status in ('not_submitted', 'rejected')
  )
);

create policy "workers remove their documents before or after a rejected review"
on public.worker_verification_documents for delete to authenticated
using (
  worker_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.verification_status in ('not_submitted', 'rejected')
  )
);

create policy "workers upload only their registered verification documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'worker-verification'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.worker_verification_documents d
    where d.worker_id = (select auth.uid()) and d.storage_path = name
  )
);

create policy "workers and verification staff read private verification files"
on storage.objects for select to authenticated
using (
  bucket_id = 'worker-verification'
  and exists (
    select 1 from public.worker_verification_documents d
    where d.storage_path = name
      and (
        d.worker_id = (select auth.uid())
        or exists (
          select 1 from public.staff_members s
          where s.user_id = (select auth.uid()) and s.role in ('owner', 'verifier')
        )
      )
  )
);

create policy "workers remove private documents before review or after rejection"
on storage.objects for delete to authenticated
using (
  bucket_id = 'worker-verification'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.worker_verification_documents d
    join public.profiles p on p.id = d.worker_id
    where d.worker_id = (select auth.uid())
      and d.storage_path = name
      and p.verification_status in ('not_submitted', 'rejected')
  )
);

create or replace function public.submit_worker_verification()
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
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.can_work and p.verification_status in ('not_submitted', 'rejected')
  ) then
    raise exception 'Worker profile is not ready for verification submission';
  end if;
  if not exists (
    select 1 from public.worker_verification_documents d
    where d.worker_id = v_user_id and d.document_type = 'identity_front'
  ) or not exists (
    select 1 from public.worker_verification_documents d
    where d.worker_id = v_user_id and d.document_type = 'identity_back'
  ) then
    raise exception 'Upload the front and back of your identity document';
  end if;
  update public.profiles set verification_status = 'pending' where id = v_user_id;
end;
$$;

create or replace function public.review_worker_verification(
  p_worker_id uuid,
  p_status public.verification_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.staff_members s
    where s.user_id = (select auth.uid()) and s.role in ('owner', 'verifier')
  ) then
    raise exception 'Not authorized to review identity verification';
  end if;
  if p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Invalid verification status';
  end if;
  if p_status = 'verified' and (
    not exists (select 1 from public.worker_verification_documents d where d.worker_id = p_worker_id and d.document_type = 'identity_front')
    or not exists (select 1 from public.worker_verification_documents d where d.worker_id = p_worker_id and d.document_type = 'identity_back')
  ) then
    raise exception 'Both identity document images are required before verification';
  end if;
  update public.profiles
  set verification_status = p_status
  where id = p_worker_id and can_work;
  if not found then
    raise exception 'Worker profile not found';
  end if;
end;
$$;

revoke all on function public.submit_worker_verification() from public, anon;
grant execute on function public.submit_worker_verification() to authenticated;
revoke all on function public.review_worker_verification(uuid, public.verification_status) from public, anon;
grant execute on function public.review_worker_verification(uuid, public.verification_status) to authenticated;
