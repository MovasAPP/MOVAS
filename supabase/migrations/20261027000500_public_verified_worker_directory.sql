-- The marketplace home page is browsable before sign-in.
-- Only verified public profiles and active service listings are exposed to anon;
-- private profiles, identity documents, phone numbers, job requests and proposals remain restricted.

grant select (id, public_name, city) on public.profiles to anon;
grant select (id, worker_id, category_id, title, city, state_code, starting_price, price_unit, active, created_at)
  on public.worker_services to anon;
grant select on public.service_categories to anon;

create policy "public visitors read verified worker profiles"
on public.profiles for select to anon
using (can_work and verification_status = 'verified');

create policy "public visitors read active verified worker services"
on public.worker_services for select to anon
using (
  active
  and exists (
    select 1
    from public.profiles p
    where p.id = worker_id
      and p.can_work
      and p.verification_status = 'verified'
  )
);

create policy "public visitors read active service categories"
on public.service_categories for select to anon
using (active);
