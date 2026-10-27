-- Private Mercado Pago OAuth credentials for verified CONTRATEI workers.
-- Tokens are encrypted by Edge Functions before being stored.

create table public.payment_provider_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  provider_user_id text not null unique,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_provider_accounts enable row level security;
revoke all on public.payment_provider_accounts from public, anon, authenticated;
grant all on public.payment_provider_accounts to service_role;

create table public.mercado_pago_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  return_platform text not null check (return_platform in ('web', 'native')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.mercado_pago_oauth_states enable row level security;
revoke all on public.mercado_pago_oauth_states from public, anon, authenticated;
grant all on public.mercado_pago_oauth_states to service_role;

create or replace function public.consume_mercado_pago_oauth_state(p_state_hash text)
returns table (user_id uuid, return_platform text)
language sql
security definer
set search_path = ''
as $$
  delete from public.mercado_pago_oauth_states s
  where s.state_hash = p_state_hash
    and s.expires_at > now()
  returning s.user_id, s.return_platform;
$$;

revoke all on function public.consume_mercado_pago_oauth_state(text) from public, anon, authenticated;
grant execute on function public.consume_mercado_pago_oauth_state(text) to service_role;
