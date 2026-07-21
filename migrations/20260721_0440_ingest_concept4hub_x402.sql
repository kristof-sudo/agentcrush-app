-- Ingest Concept4Hub x402 compliance endpoints into bazaar_resources
-- Date: 2026-07-21
-- Task: SR-G7
--
-- Verification (daily-builder 2026-07-21, ~04:40 UTC):
--   curl -i https://concept-4-zeta.vercel.app/api/v1/services/verify-vat-de?vat_number=DE123456789
--     → HTTP 402, x-payment-required header (x402 v2), x-x402-network: base,
--       x-x402-price: USDC=0.05, EURC=0.0485, x-x402-recipient: 0x271D2069F0e98B8aDbfcaA26B499dA4406598213
--   curl -i https://concept-4-zeta.vercel.app/api/v1/compliance/verify-agent?agent_id=test
--     → HTTP 402, same payment structure
--   curl -i https://concept-4-zeta.vercel.app/api/v1/compliance/verify-biz?company_name=Acme&country=DE
--     → HTTP 402, x-x402-price: USDC=0.50, EURC=0.485 (10x, corporate lookup)
--
-- Notes:
--   - Original task description referenced /vat /ofac /kyc — those paths return 404.
--     The actual gated endpoints use /api/v1/services/ and /api/v1/compliance/ prefixes.
--     All three rows below are live-verified 2026-07-21.
--   - Ingest as orphan rows (no agent_id FK on bazaar_resources per schema).
--     Concept4Hub agent entity is deferred (no GitHub repo / social handle confirmed yet).
--   - Row 1 is the representative VAT endpoint (Germany). Concept4Hub exposes 28 per-country
--     VAT endpoints; we ingest only the canonical one to avoid flooding bazaar_resources.
--     The daily Bazaar sync will pick up the full set if/when they register in the CDP index.
--   - payload_hash computed via same algorithm as bazaar-resources-adapter.mjs:
--       sha256(JSON.stringify(canonicalize(raw_payload)))  (keys sorted recursively)
--   - Evidence tier: self-reported (live x402 gate confirmed, but no Bazaar index listing
--     nor on-chain identity corroboration for the operator entity yet).
--
-- Kris actions: apply this migration in Supabase.
-- No code changes required — rows will surface in /api/guard/v1 payTo resolution
-- once the GIN index (20260719_1200_guard_v1_wallet_binding.sql) is also applied.

INSERT INTO bazaar_resources (
  resource_url,
  type,
  x402_version,
  description,
  accepts,
  declared_schema,
  bazaar_info,
  quality,
  last_updated_at,
  raw_payload,
  payload_hash
)
VALUES

-- Row 1: EU VAT validation (representative; Germany endpoint)
(
  'https://concept-4-zeta.vercel.app/api/v1/services/verify-vat-de',
  'http',
  2,
  'EU KYB VAT Validation (Germany) — verifies VAT numbers via EU VIES system, returns business name, address, and compliance status. x402 v2 on Base. Concept4Hub compliance API.',
  '[
    {"scheme":"exact","network":"eip155:8453","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","amount":"50000","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","maxTimeoutSeconds":60},
    {"scheme":"exact","network":"eip155:8453","asset":"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42","amount":"48500","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","maxTimeoutSeconds":60}
  ]'::jsonb,
  '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"input":{"type":"object"},"output":{"type":"object"}}}'::jsonb,
  '{"input":{"type":"http","method":"GET","queryParams":{"country":"string","identifier":"string"}},"output":{"type":"json","example":{"valid":true,"vat_number":"string","country_code":"DE","business_name":"string","business_address":"string","compliance_status":"VALID_VAT","verification_date":"string"}}}'::jsonb,
  NULL,
  '2026-07-21T04:40:00.000Z'::timestamptz,
  '{"accepts":[{"amount":"50000","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","maxTimeoutSeconds":60,"network":"eip155:8453","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","scheme":"exact"},{"amount":"48500","asset":"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42","maxTimeoutSeconds":60,"network":"eip155:8453","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","scheme":"exact"}],"description":"EU KYB VAT Validation (Germany) — verifies VAT numbers via EU VIES system, returns business name, address, and compliance status. x402 v2 on Base. Concept4Hub compliance API.","extensions":{"bazaar":{"info":{"input":{"method":"GET","queryParams":{"country":"string","identifier":"string"},"type":"http"},"output":{"example":{"business_address":"string","business_name":"string","compliance_status":"VALID_VAT","country_code":"DE","valid":true,"vat_number":"string","verification_date":"string"},"type":"json"}},"schema":{"properties":{"input":{"type":"object"},"output":{"type":"object"}},"schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}}},"lastUpdated":"2026-07-21T04:40:00.000Z","quality":null,"resource":"https://concept-4-zeta.vercel.app/api/v1/services/verify-vat-de","type":"http","x402Version":2}'::jsonb,
  '4d6eeab2cf44467fb657a4ac771713625f5814205adb5cc6450d8b00a04460eb'
),

-- Row 2: AI Agent KYA (Know Your Agent) trust score
(
  'https://concept-4-zeta.vercel.app/api/v1/compliance/verify-agent',
  'http',
  2,
  'AI Agent identity and KYA (Know Your Agent) trust score — verifies agent ownership, cryptographic delegation signature, spend limits, and risk analysis. x402 v2 on Base. Concept4Hub compliance API.',
  '[
    {"scheme":"exact","network":"eip155:8453","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","amount":"50000","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","maxTimeoutSeconds":60},
    {"scheme":"exact","network":"eip155:8453","asset":"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42","amount":"48500","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","maxTimeoutSeconds":60}
  ]'::jsonb,
  '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"input":{"type":"object"},"output":{"type":"object"}}}'::jsonb,
  '{"input":{"type":"http","method":"GET","queryParams":{"agent_id":"string","owner_address":"string"}},"output":{"type":"json","example":{"agent_id":"agent_robo_01","owner_address":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","verification_status":"Verified","trust_score":95.0,"authorization_proof":"Valid cryptographic delegation signature verified on-chain","spend_limits_usdc":500.0,"risk_analysis":"Agent is reliable with a verified owner."}}}'::jsonb,
  NULL,
  '2026-07-21T04:40:00.000Z'::timestamptz,
  '{"accepts":[{"amount":"50000","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","maxTimeoutSeconds":60,"network":"eip155:8453","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","scheme":"exact"},{"amount":"48500","asset":"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42","maxTimeoutSeconds":60,"network":"eip155:8453","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","scheme":"exact"}],"description":"AI Agent identity and KYA (Know Your Agent) trust score — verifies agent ownership, cryptographic delegation signature, spend limits, and risk analysis. x402 v2 on Base. Concept4Hub compliance API.","extensions":{"bazaar":{"info":{"input":{"method":"GET","queryParams":{"agent_id":"string","owner_address":"string"},"type":"http"},"output":{"example":{"agent_id":"agent_robo_01","authorization_proof":"Valid cryptographic delegation signature verified on-chain","owner_address":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","risk_analysis":"Agent is reliable with a verified owner.","spend_limits_usdc":500,"trust_score":95,"verification_status":"Verified"},"type":"json"}},"schema":{"properties":{"input":{"type":"object"},"output":{"type":"object"}},"schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}}},"lastUpdated":"2026-07-21T04:40:00.000Z","quality":null,"resource":"https://concept-4-zeta.vercel.app/api/v1/compliance/verify-agent","type":"http","x402Version":2}'::jsonb,
  '2db5f8c1eccf65bdf3576d08d42146a0ceba60f1d007dbcf770960cc3b7b1c4d'
),

-- Row 3: Corporate KYB (Know Your Business) registry validation — $0.50/call
(
  'https://concept-4-zeta.vercel.app/api/v1/compliance/verify-biz',
  'http',
  2,
  'Corporate identity and KYB (Know Your Business) registry validation — validates company registration, directors, and tax status. x402 v2 on Base, price $0.50/call. Concept4Hub compliance API.',
  '[
    {"scheme":"exact","network":"eip155:8453","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","amount":"500000","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","maxTimeoutSeconds":60},
    {"scheme":"exact","network":"eip155:8453","asset":"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42","amount":"485000","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","maxTimeoutSeconds":60}
  ]'::jsonb,
  '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"input":{"type":"object"},"output":{"type":"object"}}}'::jsonb,
  '{"input":{"type":"http","method":"GET","queryParams":{"country":"string","identifier":"string"}},"output":{"type":"json","example":{"legal_name":"IBERIA AGENTIC SOLUCIONES SL","registration_number":"B12345678","status":"ACTIVA","registered_address":"Calle Gran Via 45, Madrid","directors":["Garcia Lopez Manuel","Perez Gomez Maria"],"tax_status":"Valid","kyc_risk_rating":"Low","analysis_summary":"Company active and validly registered."}}}'::jsonb,
  NULL,
  '2026-07-21T04:40:00.000Z'::timestamptz,
  '{"accepts":[{"amount":"500000","asset":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","maxTimeoutSeconds":60,"network":"eip155:8453","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","scheme":"exact"},{"amount":"485000","asset":"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42","maxTimeoutSeconds":60,"network":"eip155:8453","payTo":"0x271D2069F0e98B8aDbfcaA26B499dA4406598213","scheme":"exact"}],"description":"Corporate identity and KYB (Know Your Business) registry validation — validates company registration, directors, and tax status. x402 v2 on Base, price $0.50/call. Concept4Hub compliance API.","extensions":{"bazaar":{"info":{"input":{"method":"GET","queryParams":{"country":"string","identifier":"string"},"type":"http"},"output":{"example":{"analysis_summary":"Company active and validly registered.","directors":["Garcia Lopez Manuel","Perez Gomez Maria"],"kyc_risk_rating":"Low","legal_name":"IBERIA AGENTIC SOLUCIONES SL","registered_address":"Calle Gran Via 45, Madrid","registration_number":"B12345678","status":"ACTIVA","tax_status":"Valid"},"type":"json"}},"schema":{"properties":{"input":{"type":"object"},"output":{"type":"object"}},"schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}}},"lastUpdated":"2026-07-21T04:40:00.000Z","quality":null,"resource":"https://concept-4-zeta.vercel.app/api/v1/compliance/verify-biz","type":"http","x402Version":2}'::jsonb,
  '2aa0f038d308c06ca96147d4e1d00e2ff7ab758277411b0c017b7353f206d7b0'
)

ON CONFLICT (resource_url) DO UPDATE SET
  description      = EXCLUDED.description,
  accepts          = EXCLUDED.accepts,
  declared_schema  = EXCLUDED.declared_schema,
  bazaar_info      = EXCLUDED.bazaar_info,
  x402_version     = EXCLUDED.x402_version,
  raw_payload      = EXCLUDED.raw_payload,
  payload_hash     = EXCLUDED.payload_hash,
  last_updated_at  = EXCLUDED.last_updated_at,
  last_seen_at     = NOW();
