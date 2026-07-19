-- Guard v1 — wallet-binding integrity (SR-H2, strategy review 2026-07-14 + R3 2026-07-19)
--
-- Purpose: let the payment path answer "is this payTo address consistent with
--          what the counterparty advertises and has registered on-chain?"
--          BEFORE funds move. Two pieces:
--
--   1. GIN index on bazaar_resources.accepts — /api/guard/v1 resolves a payTo
--      address against the 46K+ Bazaar listings via jsonb containment
--      (accepts @> '[{"payTo": "0x…"}]'). Without the index that is a seq scan
--      on every Guard call.
--
--   2. wallet_binding_check_v1 view — for agents matched to an ERC-8004
--      registration (agent_erc8004_registrations), compares the registered
--      owner_address against payTo addresses the agent's own domain advertises
--      in Bazaar. Consumed by src/lib/verifyCounterparty.js as a
--      proceed→caution downgrade (reason_code: wallet_address_mismatch).
--
-- DATA REALITY (checked live 2026-07-19): agent_erc8004_registrations has 1
-- matched row (crewai, website_url NULL) — so the view returns ~0 usable
-- bindings TODAY and lights up as the 8004scan matcher and website backfills
-- grow. That is expected and fine: the view is the growth path; the Bazaar
-- containment lookup (piece 1) is what carries Guard v1 on day one.
-- x402_payers is NOT referenced: B23's migration is still PENDING APPLY —
-- fold it into this view (payee_address seen on-chain) once applied.
--
-- STATUS: PENDING APPLY by Kris.

-- ── 1. containment index for payTo lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS bazaar_resources_accepts_gin
  ON bazaar_resources USING GIN (accepts jsonb_path_ops);

-- ── 2. wallet-binding view ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW wallet_binding_check_v1 AS
WITH agent_bazaar_paytos AS (
  -- payTo addresses advertised by Bazaar resources served from the agent's own
  -- website host. Host match is deliberately conservative: exact host equality
  -- after stripping scheme + path + leading www.
  SELECT
    a.id AS agent_id,
    lower(acc->>'payTo') AS advertised_payto,
    br.resource_url
  FROM agents a
  JOIN bazaar_resources br
    ON br.removed_at IS NULL
   AND regexp_replace(split_part(regexp_replace(br.resource_url, '^https?://', ''), '/', 1), '^www\.', '')
     = regexp_replace(split_part(regexp_replace(a.website_url,   '^https?://', ''), '/', 1), '^www\.', '')
  CROSS JOIN LATERAL jsonb_array_elements(br.accepts) AS acc
  WHERE a.website_url IS NOT NULL
    AND acc->>'payTo' IS NOT NULL
)
SELECT
  reg.agent_id,
  reg.agent_handle,
  lower(reg.owner_address)              AS registered_owner,
  abp.advertised_payto,
  abp.resource_url,
  CASE
    WHEN abp.advertised_payto IS NULL                       THEN 'no_endpoint_data'
    WHEN abp.advertised_payto = lower(reg.owner_address)    THEN 'match'
    ELSE 'mismatch'
  END AS binding_status
FROM agent_erc8004_registrations reg
LEFT JOIN agent_bazaar_paytos abp ON abp.agent_id = reg.agent_id;

COMMENT ON VIEW wallet_binding_check_v1 IS
  'Guard v1 (SR-H2): ERC-8004 registered owner vs Bazaar-advertised payTo per agent. match/mismatch/no_endpoint_data. mismatch drives a proceed→caution downgrade in verifyCounterparty — it is NOT a fraud verdict (separate treasury addresses are legitimate).';
