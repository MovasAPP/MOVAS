-- Add the MOVA$ owner account to the verification review team.
-- Replace the placeholder with the UUID from Supabase Authentication > Users.
-- Run only in the dedicated MOVA$ Supabase project.

insert into public.staff_members (user_id, role)
values ('COLE-AQUI-O-UUID-DA-SUA-CONTA'::uuid, 'owner')
on conflict (user_id) do update set role = excluded.role;
