-- Allow workers to replace a verification image without deleting the previous
-- stored object until the new upload succeeds.
-- Run only in the dedicated CONTRATEI Supabase project.

grant update (storage_path) on public.worker_verification_documents to authenticated;

create policy "workers replace their own identity document path before review"
on public.worker_verification_documents for update to authenticated
using (
  worker_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.can_work
      and p.verification_status in ('not_submitted', 'rejected')
  )
)
with check (
  worker_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/%'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.can_work
      and p.verification_status in ('not_submitted', 'rejected')
  )
);

drop policy if exists "workers remove private documents before review or after rejection"
on storage.objects;

create policy "workers remove their own private documents before review or after rejection"
on storage.objects for delete to authenticated
using (
  bucket_id = 'worker-verification'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.can_work
      and p.verification_status in ('not_submitted', 'rejected')
  )
);
