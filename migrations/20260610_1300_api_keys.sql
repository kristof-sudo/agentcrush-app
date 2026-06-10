-- 20260610_1300_api_keys.sql
-- Pro API keys for the $29/mo AgentCrush Pro subscription (Stripe).
-- Plaintext key lives in key_once only until first retrieval, then nulled.
-- RLS enabled with no policies: service-role access only.

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  key_prefix text not null,
  key_once text,
  email text,
  plan text not null default 'pro',
  status text not null default 'active' check (status in ('active', 'past_due', 'revoked')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_session_idx on api_keys (stripe_checkout_session_id);
create index if not exists api_keys_subscription_idx on api_keys (stripe_subscription_id);

alter table api_keys enable row level security;
