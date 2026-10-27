-- CONTRATEI marketplace schema (initial draft).
-- Run only in the dedicated CONTRATEI Supabase project after reviewing this migration.
-- Identity documents and payment credentials intentionally do not belong in these tables.

create extension if not exists pgcrypto with schema extensions;

create type public.verification_status as enum ('not_submitted', 'pending', 'verified', 'rejected');
create type public.job_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type public.proposal_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type public.staff_role as enum ('owner', 'verifier', 'support');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  public_name text not null default 'Novo usuário' check (char_length(public_name) between 2 and 80),
  avatar_path text,
  city text,
  state_code char(2) not null default 'RS',
  can_hire boolean not null default true,
  can_work boolean not null default false,
  verification_status public.verification_status not null default 'not_submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contact data is private by design and is not exposed through public worker/profile queries.
create table public.private_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now()
);

-- Staff roles are assigned manually by the project owner through the Supabase SQL Editor.
-- The authenticated app cannot grant itself or another user a staff role.

create table public.service_categories (
  id text primary key,
  label text not null unique,
  icon text not null default '✦',
  active boolean not null default true,
  sort_order smallint not null default 0
);

insert into public.service_categories (id, label, icon, sort_order) values
  ('babysitting', 'Babá', '🧸', 10),
  ('cleaning', 'Limpeza', '🧹', 20),
  ('repairs', 'Reparos', '🛠️', 30),
  ('electrical', 'Elétrica', '⚡', 40),
  ('installation', 'Instalação', '🔧', 50),
  ('painting', 'Pintura', '🖌️', 60),
  ('automation', 'Automação', '📡', 70),
  ('other', 'Outro', '✦', 100)
on conflict (id) do nothing;

create table public.worker_services (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id) on delete cascade,
  category_id text not null references public.service_categories (id),
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  city text not null,
  state_code char(2) not null default 'RS',
  starting_price numeric(12,2) check (starting_price is null or starting_price >= 0),
  price_unit text not null default 'quote' check (price_unit in ('quote', 'hour', 'job', 'day')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  category_id text not null references public.service_categories (id),
  description text not null check (char_length(description) between 10 and 5000),
  city text not null,
  state_code char(2) not null default 'RS',
  preferred_date date,
  budget_min numeric(12,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(12,2) check (budget_max is null or budget_max >= 0),
  requires_epi boolean not null default false,
  epi_details text check (epi_details is null or char_length(epi_details) <= 500),
  requires_mei boolean not null default false,
  requires_invoice boolean not null default false,
  status public.job_status not null default 'open',
  assigned_worker_id uuid references public.profiles (id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_max >= budget_min),
  check ((status = 'in_progress' and assigned_worker_id is not null) or status <> 'in_progress')
);

create table public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (storage_path like job_id::text || '/' || uploaded_by::text || '/%')
);

-- Work photos are private too. Object paths must follow {job_id}/{uploader_user_id}/{filename}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.job_proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  platform_fee numeric(12,2) generated always as (round(amount * 0.10, 2)) stored,
  customer_total numeric(12,2) generated always as (amount + round(amount * 0.10, 2)) stored,
  payment_processing_fee_note text not null default 'A taxa do meio de pagamento será informada antes da confirmação.',
  message text not null check (char_length(message) between 5 and 1500),
  status public.proposal_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create index worker_services_discovery_idx on public.worker_services (state_code, city, category_id) where active;
create index job_requests_feed_idx on public.job_requests (state_code, city, category_id, created_at desc) where status = 'open';
create index job_proposals_job_idx on public.job_proposals (job_id, created_at desc);
create index job_proposals_worker_idx on public.job_proposals (worker_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger private_profiles_set_updated_at before update on public.private_profiles
for each row execute function public.set_updated_at();
create trigger worker_services_set_updated_at before update on public.worker_services
for each row execute function public.set_updated_at();
create trigger job_requests_set_updated_at before update on public.job_requests
for each row execute function public.set_updated_at();
create trigger job_proposals_set_updated_at before update on public.job_proposals
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, public_name)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'public_name'), 80), ''), 'Novo usuário')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.review_worker_verification(
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
  update public.profiles
  set verification_status = p_status
  where id = p_worker_id and can_work;
  if not found then
    raise exception 'Worker profile not found';
  end if;
end;
$$;

-- Also create profiles for any test/development accounts created before this migration is applied.
insert into public.profiles (id, public_name)
select u.id, coalesce(nullif(left(trim(u.raw_user_meta_data ->> 'public_name'), 80), ''), 'Novo usuário')
from auth.users u
on conflict (id) do nothing;

-- RLS and grants are defined explicitly. Client code never receives an admin/service key.
alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.service_categories enable row level security;
alter table public.worker_services enable row level security;
alter table public.job_requests enable row level security;
alter table public.job_photos enable row level security;
alter table public.job_proposals enable row level security;

revoke all on public.profiles, public.private_profiles, public.staff_members,
  public.service_categories, public.worker_services, public.job_requests,
  public.job_photos, public.job_proposals from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, public_name) on public.profiles to authenticated;
grant update (public_name, avatar_path, city, state_code, can_hire, can_work) on public.profiles to authenticated;

grant select on public.private_profiles to authenticated;
grant insert (user_id, phone_e164) on public.private_profiles to authenticated;
grant update (phone_e164) on public.private_profiles to authenticated;

grant select on public.staff_members to authenticated;
revoke all on function public.review_worker_verification(uuid, public.verification_status) from public, anon;
grant execute on function public.review_worker_verification(uuid, public.verification_status) to authenticated;
grant select on public.service_categories to authenticated;

grant select on public.worker_services to authenticated;
grant insert (worker_id, category_id, title, description, city, state_code, starting_price, price_unit, active)
  on public.worker_services to authenticated;
grant update (category_id, title, description, city, state_code, starting_price, price_unit, active)
  on public.worker_services to authenticated;
grant delete on public.worker_services to authenticated;

grant select on public.job_requests to authenticated;
grant insert (client_id, category_id, description, city, state_code, preferred_date, budget_min, budget_max,
  requires_epi, epi_details, requires_mei, requires_invoice) on public.job_requests to authenticated;
grant update (category_id, description, city, state_code, preferred_date, budget_min, budget_max,
  requires_epi, epi_details, requires_mei, requires_invoice) on public.job_requests to authenticated;

grant select on public.job_photos to authenticated;
grant insert (job_id, uploaded_by, storage_path) on public.job_photos to authenticated;
grant delete on public.job_photos to authenticated;

grant select on public.job_proposals to authenticated;
grant insert (job_id, worker_id, amount, message) on public.job_proposals to authenticated;
grant update (status) on public.job_proposals to authenticated;

create policy "profiles are visible to their owner and verified workers"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (can_work and verification_status = 'verified')
  or exists (
    select 1 from public.staff_members s
    where s.user_id = (select auth.uid()) and s.role in ('owner', 'verifier')
  )
);
create policy "users create their own initial profile"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()) and verification_status = 'not_submitted' and can_hire and not can_work);
create policy "users edit their own public profile fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "users read their private contact data"
on public.private_profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy "users create their private contact data"
on public.private_profiles for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "users update their private contact data"
on public.private_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "staff can read only their own role"
on public.staff_members for select to authenticated
using (user_id = (select auth.uid()));
-- No authenticated INSERT, UPDATE, or DELETE grant exists for staff_members.

create policy "signed-in users read active service categories"
on public.service_categories for select to authenticated using (active);

create policy "verified workers publish active services"
on public.worker_services for select to authenticated
using (
  worker_id = (select auth.uid())
  or (active and exists (
    select 1 from public.profiles p
    where p.id = worker_id and p.can_work and p.verification_status = 'verified'
  ))
);
create policy "workers create their own services"
on public.worker_services for insert to authenticated
with check (
  worker_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = worker_id and p.can_work)
);
create policy "workers update their own services"
on public.worker_services for update to authenticated
using (worker_id = (select auth.uid()))
with check (worker_id = (select auth.uid()));
create policy "workers delete their own services"
on public.worker_services for delete to authenticated
using (worker_id = (select auth.uid()));

create policy "clients read own jobs and workers read open jobs"
on public.job_requests for select to authenticated
using (client_id = (select auth.uid()) or status = 'open');
create policy "clients create their own jobs"
on public.job_requests for insert to authenticated
with check (client_id = (select auth.uid()) and status = 'open' and assigned_worker_id is null);
create policy "clients edit their open jobs"
on public.job_requests for update to authenticated
using (client_id = (select auth.uid()) and status = 'open')
with check (client_id = (select auth.uid()) and status = 'open' and assigned_worker_id is null);

create policy "job photos readable by job owner or verified workers for open jobs"
on public.job_photos for select to authenticated
using (
  exists (
    select 1 from public.job_requests j
    where j.id = job_id
      and (j.client_id = (select auth.uid()) or (j.status = 'open' and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.can_work and p.verification_status = 'verified'
      )))
  )
);
create policy "job owners attach photos to their own open jobs"
on public.job_photos for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and storage_path like job_id::text || '/' || (select auth.uid())::text || '/%'
  and exists (
    select 1 from public.job_requests j
    where j.id = job_id and j.client_id = (select auth.uid()) and j.status = 'open'
  )
);
create policy "job owners remove their own job photos"
on public.job_photos for delete to authenticated
using (
  uploaded_by = (select auth.uid()) and exists (
    select 1 from public.job_requests j where j.id = job_id and j.client_id = (select auth.uid())
  )
);

create policy "clients upload photos only to their own open jobs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.job_requests j
    where j.id::text = (storage.foldername(name))[1]
      and j.client_id = (select auth.uid()) and j.status = 'open'
  )
);
create policy "job owners and verified workers view photos for open work"
on storage.objects for select to authenticated
using (
  bucket_id = 'job-photos'
  and exists (
    select 1 from public.job_requests j
    where j.id::text = (storage.foldername(name))[1]
      and (
        j.client_id = (select auth.uid())
        or (j.status = 'open' and exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid()) and p.can_work and p.verification_status = 'verified'
        ))
      )
  )
);
create policy "clients delete photos from their own jobs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.job_requests j
    where j.id::text = (storage.foldername(name))[1] and j.client_id = (select auth.uid())
  )
);

create policy "clients and proposal owners read proposals"
on public.job_proposals for select to authenticated
using (
  worker_id = (select auth.uid()) or exists (
    select 1 from public.job_requests j where j.id = job_id and j.client_id = (select auth.uid())
  )
);
create policy "verified workers propose on open jobs"
on public.job_proposals for insert to authenticated
with check (
  worker_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p where p.id = worker_id and p.can_work and p.verification_status = 'verified'
  )
  and exists (
    select 1 from public.job_requests j where j.id = job_id and j.status = 'open' and j.client_id <> (select auth.uid())
  )
);
create policy "workers withdraw their own pending proposals"
on public.job_proposals for update to authenticated
using (worker_id = (select auth.uid()) and status = 'pending')
with check (worker_id = (select auth.uid()) and status = 'withdrawn');

-- Job assignment/completion and proposal acceptance are intentionally not exposed as client-side updates.
-- Add narrowly scoped database functions after connecting payments, cancellation, and dispute rules.

