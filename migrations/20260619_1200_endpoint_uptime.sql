-- 20260619_1200_endpoint_uptime.sql
--
-- RUNTIME liveness — the 3rd liveness family (code / economic / runtime).
-- Code liveness = github_pushed_at (is the repo maintained). Economic = x402_payers
-- (is it getting paid). Runtime = THIS: is the deployed endpoint actually responding.
--
-- Populated FORWARD by runtime/endpoint-uptime-worker.mjs (VPS timer): HTTP-checks
-- each agent's live endpoint, logs every check, and rolls up uptime %, p50 latency,
-- and current up/down onto the agent row. A 402/401/403 = UP (reachable, just gated);
-- only 5xx / timeout / DNS-fail = DOWN.
--
-- Apply: paste into the Supabase SQL editor. Degrades gracefully (nullable columns).

-- 1) append-only check log -----------------------------------------------------------
create table if not exists endpoint_checks (
  id          bigserial primary key,
  agent_id    uuid references agents(id) on delete cascade,
  endpoint_url text not null,
  source      text not null default 'agent_website',  -- agent_website | bazaar_x402 | mcp
  checked_at  timestamptz not null default now(),
  ok          boolean not null,
  status_code int,
  latency_ms  int,
  error       text
);
create index if not exists endpoint_checks_agent_idx   on endpoint_checks (agent_id, checked_at desc);
create index if not exists endpoint_checks_checked_idx  on endpoint_checks (checked_at desc);

-- 2) rolling runtime liveness on the agent row ---------------------------------------
alter table agents
  add column if not exists endpoint_url           text,
  add column if not exists endpoint_status         text,        -- up | down | unknown
  add column if not exists endpoint_uptime_7d       numeric,     -- 0..100
  add column if not exists endpoint_uptime_30d      numeric,     -- 0..100
  add column if not exists endpoint_p50_latency_ms  int,
  add column if not exists endpoint_last_ok_at      timestamptz,
  add column if not exists endpoint_checked_at      timestamptz;

-- 3) convenience view: per-agent rolling uptime from the raw log ---------------------
create or replace view agent_endpoint_uptime_v1 as
select
  a.id   as agent_id,
  a.handle,
  a.display_name,
  a.primary_category,
  a.endpoint_url,
  a.endpoint_status,
  a.endpoint_uptime_7d,
  a.endpoint_uptime_30d,
  a.endpoint_p50_latency_ms,
  a.endpoint_last_ok_at,
  a.endpoint_checked_at,
  (select count(*) from endpoint_checks c
     where c.agent_id = a.id and c.checked_at > now() - interval '7 days') as checks_7d
from agents a
where a.endpoint_url is not null
  and a.tier is distinct from 'archived';
