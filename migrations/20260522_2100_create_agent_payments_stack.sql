-- Phase 3.5 Week 1: Agent Payments Stack Index
-- Date: 2026-05-22
-- Methodology: v1.0-aps (Agent Payments Stack)
--
-- A new category extension that mirrors Keyrock's "Agent Payments Stack" 6-layer
-- map (Who Pays The Agent?, May 2026) — kept live and methodology-disclosed
-- instead of as a static snapshot.
--
-- Layers (from Keyrock + extended for AgentCrush usage):
--   L0 — Settlement chain / network (Base, Tempo, Solana, VisaNet, Arc)
--   L1 — Wallets & Keys (Safe, AgentKit, MoonPay OWS, Privy, Dynamic, ZeroDev)
--   L2 — Routing & Abstraction (CCTP, deBridge, Bridge, LayerZero, BVNK)
--   L3 — Payment Protocol (x402, MPP, AP2, ACP, Nanopayments)
--   L4 — Governance & Policy (AP2, Visa, Mastercard Agentic Tokens, ERC-8004, AIS-1)
--   L5 — Application (Virtuals, ElizaOS, Felix, Nansen, Olas, Fetch Agent Launch)
--
-- This is a flat taxonomy of PROJECTS (companies / protocols / standards) —
-- distinct from `agents` which holds entities with handles. A project may be
-- present at multiple layers (Coinbase = L0 + L1 + L3, Stripe = L0 + L1 + L2 + L3).
--
-- Composite ranking is by `stack_coverage_score`:
--   L0 weight=4, L1 weight=3, L2 weight=2, L3 weight=4, L4 weight=5, L5 weight=3
-- (Governance > Settlement = Protocol > Wallets = Application > Routing).
-- Keyrock's commentary explicitly identifies governance as the most valuable
-- layer; settlement and protocol tie because both are sticky once deployed.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.agent_payments_stack_projects (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  website_url     TEXT,
  x_handle        TEXT,
  github_url      TEXT,
  layers          TEXT[] NOT NULL DEFAULT '{}',
  layer_evidence  JSONB NOT NULL DEFAULT '{}'::jsonb,
  backing_org     TEXT,
  funding_usd_millions NUMERIC,
  acquired_by     TEXT,
  acquisition_price_usd_millions NUMERIC,
  acquisition_date DATE,
  documented_volume_usd NUMERIC,
  documented_tx_count BIGINT,
  documented_partner_count INT,
  notes           TEXT,
  evidence_tier   TEXT,
  source          TEXT NOT NULL DEFAULT 'keyrock_may_2026',
  methodology_version TEXT NOT NULL DEFAULT 'v1.0-aps',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aps_layers ON public.agent_payments_stack_projects USING GIN (layers);
CREATE INDEX IF NOT EXISTS idx_aps_slug   ON public.agent_payments_stack_projects (slug);

-- Anonymous read (registry mirror pattern — public data per
-- 2026-05-22 RLS decision in Log/Memory)
ALTER TABLE public.agent_payments_stack_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'agent_payments_stack_projects'
      AND policyname = 'aps_anon_read'
  ) THEN
    CREATE POLICY aps_anon_read
      ON public.agent_payments_stack_projects
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Scoring + ranking view
DROP VIEW IF EXISTS public.agent_payments_stack_v1 CASCADE;

CREATE VIEW public.agent_payments_stack_v1 AS
SELECT
  p.*,
  COALESCE(array_length(p.layers, 1), 0) AS layers_spanned,
  (
    (CASE WHEN 'L0' = ANY(p.layers) THEN 4 ELSE 0 END) +
    (CASE WHEN 'L1' = ANY(p.layers) THEN 3 ELSE 0 END) +
    (CASE WHEN 'L2' = ANY(p.layers) THEN 2 ELSE 0 END) +
    (CASE WHEN 'L3' = ANY(p.layers) THEN 4 ELSE 0 END) +
    (CASE WHEN 'L4' = ANY(p.layers) THEN 5 ELSE 0 END) +
    (CASE WHEN 'L5' = ANY(p.layers) THEN 3 ELSE 0 END)
  ) AS stack_coverage_score,
  ROW_NUMBER() OVER (
    ORDER BY
      (CASE WHEN 'L0' = ANY(p.layers) THEN 4 ELSE 0 END) +
      (CASE WHEN 'L1' = ANY(p.layers) THEN 3 ELSE 0 END) +
      (CASE WHEN 'L2' = ANY(p.layers) THEN 2 ELSE 0 END) +
      (CASE WHEN 'L3' = ANY(p.layers) THEN 4 ELSE 0 END) +
      (CASE WHEN 'L4' = ANY(p.layers) THEN 5 ELSE 0 END) +
      (CASE WHEN 'L5' = ANY(p.layers) THEN 3 ELSE 0 END) DESC,
      COALESCE(array_length(p.layers, 1), 0) DESC,
      p.name ASC
  ) AS rank_overall
FROM public.agent_payments_stack_projects p;

GRANT SELECT ON public.agent_payments_stack_v1 TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: 35 projects from Keyrock + Fetch Agent Launch + standards bodies
-- (re-run safe via ON CONFLICT)
-- ---------------------------------------------------------------------------

INSERT INTO public.agent_payments_stack_projects
(slug, name, description, website_url, x_handle, layers, layer_evidence, backing_org,
 funding_usd_millions, acquired_by, acquisition_price_usd_millions, acquisition_date,
 documented_volume_usd, documented_tx_count, documented_partner_count, evidence_tier, notes)
VALUES

-- =========================================================================
-- L0 — Settlement
-- =========================================================================
('coinbase', 'Coinbase', 'Public crypto platform. Created x402, operates Base, runs CDP facilitator, ships Agentic Wallets, listed as AP2 partner — spans 5/6 layers.',
 'https://www.coinbase.com', '@coinbase', ARRAY['L0','L1','L2','L3','L4'],
 jsonb_build_object(
   'L0', jsonb_build_object('label','Base (Coinbase L2)','evidence_url','https://base.org'),
   'L1', jsonb_build_object('label','Agentic Wallets / AgentKit','evidence_url','https://docs.cdp.coinbase.com/agentkit'),
   'L2', jsonb_build_object('label','Internal routing infra','evidence_url',NULL),
   'L3', jsonb_build_object('label','x402 (creator)','evidence_url','https://www.x402.org'),
   'L4', jsonb_build_object('label','AP2 partner','evidence_url','https://cloud.google.com/blog/products/identity-security/ap2-payments-protocol')
 ),
 'Public (NASDAQ:COIN)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_api',
 '5/6 layers per Keyrock May 2026 mapping. x402 = 176M txns / $73M volume / 3,900 merchants.'),

('stripe', 'Stripe', 'Payments incumbent. Co-incubated Tempo L1, acquired Privy + Bridge, co-authored MPP. Spans 5/6 layers.',
 'https://www.stripe.com', '@stripe', ARRAY['L0','L1','L2','L3','L4'],
 jsonb_build_object(
   'L0', jsonb_build_object('label','Tempo L1 (Paradigm+Stripe)','evidence_url','https://tempo.xyz'),
   'L1', jsonb_build_object('label','Privy (acquired June 2025, 75M wallets)','evidence_url',NULL),
   'L2', jsonb_build_object('label','Bridge (acquired $1.1B)','evidence_url',NULL),
   'L3', jsonb_build_object('label','MPP (co-author with Tempo)','evidence_url','https://machinepayments.org'),
   'L4', jsonb_build_object('label','Compliance infra','evidence_url',NULL)
 ),
 'Private', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 '5/6 layers per Keyrock. MPP launched March 18 2026 with 100+ services.'),

('circle', 'Circle', 'USDC issuer (98.6% of agent payment settlement). Spans 4/6 layers via Arc + CCTP + Nanopayments.',
 'https://www.circle.com', '@circle', ARRAY['L0','L1','L2','L3'],
 jsonb_build_object(
   'L0', jsonb_build_object('label','Arc (nanopayments chain)','evidence_url','https://www.circle.com/arc'),
   'L1', jsonb_build_object('label','USDC reserve mgmt','evidence_url',NULL),
   'L2', jsonb_build_object('label','CCTP ($126B+ lifetime)','evidence_url','https://www.circle.com/cctp'),
   'L3', jsonb_build_object('label','Circle Nanopayments','evidence_url',NULL)
 ),
 'Public (NYSE:CRCL)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_api',
 'CCTP processed $126B+ in volume per Keyrock. USDC = 98.6% of agent settlement, both validation and concentration risk.'),

('base-chain', 'Base', 'Coinbase L2. Dominant settlement chain for agent payments (74% of x402 volume, 119M of 161M x402 txns).',
 'https://base.org', '@base', ARRAY['L0'],
 jsonb_build_object('L0', jsonb_build_object('label','OP-stack L2 by Coinbase','evidence_url','https://base.org')),
 'Coinbase', NULL, NULL, NULL, NULL, NULL, 119000000, NULL, 'verified_onchain',
 'Per Keyrock May 2026: 1.5% of global stablecoin supply but 14.6% of adjusted volume — ~10x velocity multiplier.'),

('tempo', 'Tempo', 'Payments-focused L1, sub-second finality, <$0.001 fees. Co-author of MPP. $500M Series A at $5B val, March 2026.',
 'https://tempo.xyz', '@tempo', ARRAY['L0'],
 jsonb_build_object('L0', jsonb_build_object('label','Tempo mainnet (March 2026)','evidence_url','https://tempo.xyz')),
 'Paradigm + Stripe', 500, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 'Co-incubated by Paradigm and Stripe. Mainnet launched alongside MPP March 18 2026.'),

('solana', 'Solana', 'L1 carrying meaningful x402 + MPP volume. ~5.1% stablecoin supply, ~32.6% adjusted volume (~6x Ethereum velocity).',
 'https://solana.com', '@solana', ARRAY['L0'],
 jsonb_build_object('L0', jsonb_build_object('label','Solana L1','evidence_url','https://solana.com')),
 'Solana Foundation', NULL, NULL, NULL, NULL, NULL, 35000000, NULL, 'verified_onchain',
 'Per Keyrock: ~35M of 161M x402 txns settle on Solana. Pay.sh gateway (Google Cloud + Solana Foundation, May 2026) routes Gemini/BigQuery via x402/MPP.'),

('arc-circle', 'Arc', 'Circle''s settlement chain optimized for nanopayments.',
 'https://www.circle.com/arc', '@circle', ARRAY['L0'],
 jsonb_build_object('L0', jsonb_build_object('label','Arc nanopayment chain','evidence_url','https://www.circle.com/arc')),
 'Circle', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 'Surfaced in Keyrock''s 6-layer map as the nanopayments-specialized settlement chain.'),

('visanet', 'VisaNet', 'Visa''s card processing network. Underlies Intelligent Commerce tokenized credentials for agents.',
 'https://www.visa.com', '@Visa', ARRAY['L0'],
 jsonb_build_object('L0', jsonb_build_object('label','VisaNet (card-rail settlement)','evidence_url',NULL)),
 'Visa', NULL, NULL, NULL, NULL, 14500000000000, NULL, NULL, 'public_webpage',
 '$14.5T annual Visa volume = the entire agent payments market is 0.0003% of that. Card-rail $0.30 fixed fee excludes 76% of agent activity.'),

-- =========================================================================
-- L1 — Wallets & Keys
-- =========================================================================
('safe-wallet', 'Safe', 'Independent smart-account infra. 18.3M smart accounts, $100B+ secured, $600B in 2025 volume. 37% of Gnosis Safe txns by AI agents (Olas), peaks at 75%.',
 'https://safe.global', '@safe', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','18.3M smart accounts','evidence_url','https://safe.global')),
 'Independent', NULL, NULL, NULL, NULL, 600000000000, NULL, NULL, 'public_api',
 'Per Keyrock: 75% of Safe transactions on Gnosis Chain on peak days are AI agents via Olas network.'),

('coinbase-agentkit', 'Coinbase AgentKit', 'Coinbase''s agent wallet SDK. Tens of thousands of agents deployed with session caps + per-tx limits + allowlists.',
 'https://docs.cdp.coinbase.com/agentkit', '@coinbasedev', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','Agentic Wallets (Feb 2026 upgrade)','evidence_url','https://docs.cdp.coinbase.com/agentkit')),
 'Coinbase', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 'Built-in policy-gated signing — Keyrock''s "fully autonomous wallet-as-credential" anchor for x402.'),

('moonpay-ows', 'MoonPay Open Wallet Standard', 'Cross-chain wallet interop standard launched March 23 2026 with 15 contributors (PayPal, OKX, Solana Foundation, etc.).',
 'https://www.moonpay.com', '@moonpay', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','OWS — 8 chain families','evidence_url',NULL)),
 'MoonPay', NULL, NULL, NULL, NULL, NULL, 15, NULL, 'public_webpage',
 'Standardizes agent-wallet interaction across 8 chain families.'),

('privy', 'Privy', 'Embedded wallet provider, 75M crypto wallets. Acquired by Stripe June 2025.',
 'https://privy.io', '@privy_io', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','75M wallets (pre-acq)','evidence_url',NULL)),
 'Stripe (acquired)', NULL, 'Stripe', NULL, '2025-06-01', NULL, NULL, NULL, 'public_webpage',
 'Now part of Stripe agent payments stack.'),

('dynamic-xyz', 'Dynamic', 'Onchain account SDK powering 50M wallets for Kraken / Magic Eden / etc. Acquired by Fireblocks ~$90M October 2025.',
 'https://www.dynamic.xyz', '@dynamic_xyz', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','50M accounts','evidence_url',NULL)),
 'Fireblocks (acquired)', NULL, 'Fireblocks', 90, '2025-10-01', NULL, NULL, NULL, 'public_webpage',
 NULL),

('zerodev', 'ZeroDev', 'ERC-7579 modular smart-account SDK. Acquired by Offchain Labs (Arbitrum).',
 'https://zerodev.app', '@zerodev_app', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','ERC-7579 smart-account SDK','evidence_url',NULL)),
 'Offchain Labs (acquired)', NULL, 'Offchain Labs', NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 NULL),

('near-ai-wallets', 'NEAR AI Wallets', 'Agent wallet infra on NEAR.',
 'https://near.ai', '@nearprotocol', ARRAY['L1'],
 jsonb_build_object('L1', jsonb_build_object('label','NEAR AI Wallets','evidence_url','https://near.ai')),
 'NEAR Foundation', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 NULL),

-- =========================================================================
-- L2 — Routing & Abstraction
-- =========================================================================
('circle-cctp', 'Circle CCTP', 'Cross-chain USDC transfer protocol. $126B+ lifetime volume per Keyrock.',
 'https://www.circle.com/cctp', '@circle', ARRAY['L2'],
 jsonb_build_object('L2', jsonb_build_object('label','CCTP — $126B+ lifetime volume','evidence_url','https://www.circle.com/cctp')),
 'Circle', NULL, NULL, NULL, NULL, 126000000000, NULL, NULL, 'public_api',
 NULL),

('debridge', 'deBridge', 'Cross-chain bridging — $1B+ TVL surfaced in Keyrock L2 map.',
 'https://debridge.finance', '@deBridgeFinance', ARRAY['L2'],
 jsonb_build_object('L2', jsonb_build_object('label','Cross-chain liquidity routing','evidence_url','https://debridge.finance')),
 'Independent', NULL, NULL, NULL, NULL, 1000000000, NULL, NULL, 'public_webpage',
 NULL),

('bridge-stripe', 'Bridge', 'Stablecoin orchestration. Acquired by Stripe for $1.1B (largest crypto acq of 2025).',
 'https://bridge.xyz', '@stablecoin', ARRAY['L2'],
 jsonb_build_object('L2', jsonb_build_object('label','Stablecoin routing','evidence_url',NULL)),
 'Stripe (acquired)', NULL, 'Stripe', 1100, NULL, NULL, NULL, NULL, 'public_webpage',
 NULL),

('layerzero', 'LayerZero', 'Omnichain messaging. Acquired Stargate $120M.',
 'https://layerzero.network', '@LayerZero_Labs', ARRAY['L2'],
 jsonb_build_object('L2', jsonb_build_object('label','Cross-chain messaging','evidence_url','https://layerzero.network')),
 'Independent', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 NULL),

('bvnk', 'BVNK', 'Stablecoin payment infra. Acquired by Mastercard $1.8B.',
 'https://www.bvnk.com', '@BVNK_', ARRAY['L2'],
 jsonb_build_object('L2', jsonb_build_object('label','Stablecoin payments infra','evidence_url',NULL)),
 'Mastercard (acquired)', NULL, 'Mastercard', 1800, NULL, NULL, NULL, NULL, 'public_webpage',
 NULL),

-- =========================================================================
-- L3 — Payment Protocol
-- =========================================================================
('x402', 'x402', 'HTTP 402-native open protocol for stablecoin agent payments. Created by Coinbase May 2025. ~176M txns, ~$73M cumulative, 3,900 merchants.',
 'https://www.x402.org', '@x402org', ARRAY['L3'],
 jsonb_build_object('L3', jsonb_build_object('label','x402 protocol + facilitator','evidence_url','https://www.x402.org')),
 'Coinbase / x402 Foundation (Linux Foundation)', NULL, NULL, NULL, NULL, 73200000, 176000000, 3900, 'verified_onchain',
 'AgentCrush already has 7 endpoints in CDP Bazaar. Headline numbers may overstate true commercial throughput by ~50% per Allium Labs; sustained organic run rate is $11-15M/week as of Q1 2026.'),

('mpp', 'Machine Payments Protocol (MPP)', 'Payment-method-agnostic agent payment protocol. Cards + crypto + Lightning + bank transfers via unified HTTP flow. Stripe + Tempo, March 18 2026.',
 'https://machinepayments.org', '@machinepayments', ARRAY['L3'],
 jsonb_build_object('L3', jsonb_build_object('label','MPP — Challenge/Credential/Receipt flow','evidence_url','https://machinepayments.org')),
 'Stripe + Tempo', NULL, NULL, NULL, NULL, 3730, 34000, 100, 'self_reported',
 'First-week (week of launch): $3,730 across ~34,000 txns / 913 agents — developer-experimentation scale. Sessions feature enables sub-cent streaming.'),

('google-ap2', 'Google AP2 (Agent Payments Protocol)', 'Delegated authorisation framework via Verifiable Digital Credentials ("Mandates"). Announced Sept 2025 with 60+ partners.',
 'https://cloud.google.com/blog/products/identity-security/ap2-payments-protocol', '@googlecloud', ARRAY['L3','L4'],
 jsonb_build_object(
   'L3', jsonb_build_object('label','AP2 mandates','evidence_url',NULL),
   'L4', jsonb_build_object('label','Cart/Intent/Payment mandate framework','evidence_url',NULL)
 ),
 'Google', NULL, NULL, NULL, NULL, NULL, NULL, 60, 'public_webpage',
 'Spans L3+L4 — Coinbase, Mastercard, PayPal, Amex, Shopify, Walmart as partners.'),

('acp-stripe-openai', 'Agentic Commerce Protocol (ACP)', 'OpenAI + Stripe protocol for agent commerce. Surfaced in Keyrock L3 column.',
 NULL, NULL, ARRAY['L3'],
 jsonb_build_object('L3', jsonb_build_object('label','ACP (OpenAI + Stripe)','evidence_url',NULL)),
 'OpenAI + Stripe', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'marketplace_reported',
 NULL),

('circle-nanopayments', 'Circle Nanopayments', 'Sub-cent payment primitive on Arc.',
 'https://www.circle.com', '@circle', ARRAY['L3'],
 jsonb_build_object('L3', jsonb_build_object('label','Nanopayments on Arc','evidence_url',NULL)),
 'Circle', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 NULL),

-- =========================================================================
-- L4 — Governance & Policy
-- =========================================================================
('visa-intelligent-commerce', 'Visa Intelligent Commerce', 'Tokenised card credentials for agents with programmable spend controls. Pilots 2025.',
 'https://corporate.visa.com/en/products/intelligent-commerce.html', '@Visa', ARRAY['L4'],
 jsonb_build_object('L4', jsonb_build_object('label','Visa Intelligent Commerce','evidence_url',NULL)),
 'Visa', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 '100M+ merchant endpoints — distribution advantage. Visa CLI in limited beta brings card rails to dev terminal. Published MPP payment-method spec.'),

('mastercard-agentic-tokens', 'Mastercard Agentic Tokens', 'Mastercard''s agent-credential framework. Also acquired BVNK $1.8B.',
 'https://www.mastercard.com', '@Mastercard', ARRAY['L4'],
 jsonb_build_object('L4', jsonb_build_object('label','Agentic Tokens','evidence_url',NULL)),
 'Mastercard', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 'Published MPP spec — protocol participant rather than competitor.'),

('amex-ace', 'American Express ACE', 'Agentic Commerce Experiences developer kit + Agent Purchase Protection (first card network to cover agent errors). Launched April 14 2026.',
 'https://www.americanexpress.com', '@AmericanExpress', ARRAY['L4'],
 jsonb_build_object('L4', jsonb_build_object('label','ACE + Agent Purchase Protection','evidence_url',NULL)),
 'American Express', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 'Liability-position play, not a protocol spec — closed-loop network eliminates 4-party coordination.'),

('erc-8004', 'ERC-8004', 'On-chain agent identity + reputation standard (proposed). Co-authored by Erik Reppel (x402 creator).',
 'https://eips.ethereum.org', NULL, ARRAY['L4'],
 jsonb_build_object('L4', jsonb_build_object('label','Agent identity EIP draft','evidence_url',NULL)),
 'Ethereum Magicians (open)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_webpage',
 'AgentCrush has 1 verified ERC-8004 agent (crewai token #17997). Reppel: "one attempt to solve a really complex problem" — more standards expected.'),

('ais-1', 'AIS-1', 'Open standard for AI agent identity, live on Base mainnet. Public comment period closes June 30 2026.',
 NULL, NULL, ARRAY['L4'],
 jsonb_build_object('L4', jsonb_build_object('label','Agent identity standard (Base)','evidence_url',NULL)),
 'Open / Base', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'self_reported',
 'AgentCrush should review during public comment window — see Decisions/2026-05-22-phase-35.'),

-- =========================================================================
-- L5 — Application
-- =========================================================================
('virtuals-protocol', 'Virtuals Protocol', 'Tokenised AI agent platform on Base. ~18,000 agents, ~$470M "agentic GDP" in VIRTUAL tokens. Already indexed in AgentCrush tokenized v1.1.',
 'https://virtuals.io', '@virtuals_io', ARRAY['L5'],
 jsonb_build_object('L5', jsonb_build_object('label','Tokenised agent marketplace','evidence_url','https://virtuals.io')),
 'Virtuals', NULL, NULL, NULL, NULL, 470000000, NULL, NULL, 'marketplace_reported',
 'Top agent Ethy AI = 2M+ autonomous transactions. Revenue Network (Feb 2026) enables agent-to-agent service requests.'),

('eliza-os', 'ElizaOS', 'Open-source agent framework, 63 repos. Originally incubated by ai16z.',
 'https://elizaos.ai', '@elizaOS', ARRAY['L5'],
 jsonb_build_object('L5', jsonb_build_object('label','Composable agent framework','evidence_url','https://elizaos.ai')),
 'ai16z + open contributors', NULL, NULL, NULL, NULL, NULL, NULL, 63, 'public_webpage',
 'Already on Keyrock L5 panel.'),

('felix', 'Felix', 'Agent framework — surfaced in Keyrock L5 panel.',
 NULL, NULL, ARRAY['L5'],
 jsonb_build_object('L5', jsonb_build_object('label','Agent framework','evidence_url',NULL)),
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'marketplace_reported',
 'TBD — pending more public information.'),

('nansen-x402', 'Nansen (x402 surface)', 'Onchain analytics. Headless merchant via x402: $0.01/query in USDC on Base.',
 'https://agents.nansen.ai', '@nansen', ARRAY['L5'],
 jsonb_build_object('L5', jsonb_build_object('label','Pay-per-request analytics','evidence_url','https://agents.nansen.ai')),
 'Nansen', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'public_api',
 'Cited as canonical headless-merchant example throughout Keyrock report.'),

('olas', 'Olas', 'Autonomous-agent network on Gnosis Chain. Drives 75% of Safe transactions on peak days, 37% all-time.',
 'https://olas.network', '@autonolas', ARRAY['L5'],
 jsonb_build_object('L5', jsonb_build_object('label','Autonomous service agents','evidence_url','https://olas.network')),
 'Valory / Olas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'verified_onchain',
 'Production-scale agent activity already settling onchain.'),

('fetch-agent-launch', 'Fetch.ai Agent Launch', 'Bonding-curve launchpad for Agentverse-verified agent tokens on BNB Chain. Launched May 20 2026. 120 FET deploy, 30K FET → PancakeSwap graduation, LP burned at graduation.',
 'https://agent-launch.ai', '@Fetch_ai', ARRAY['L5'],
 jsonb_build_object('L5', jsonb_build_object('label','Agent token launchpad (BNB)','evidence_url','https://agent-launch.ai')),
 'Fetch.ai / ASI Alliance', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'self_reported',
 '2.7M agents on Agentverse, 150K active deployments on BNB Chain (+43,000% since Jan 2026 per Fetch press release). Tokens auto-pull Agentverse metadata — "structurally impossible to launch a token pointing at nothing."'),

-- =========================================================================
-- Extras explicitly mentioned in Keyrock but not in the 6-layer summary panel
-- =========================================================================
('brex', 'Brex', 'Programmable card infrastructure. Acquired by Capital One $5.15B (largest 2025 agent-payments-adjacent acq).',
 'https://www.brex.com', '@brexHQ', ARRAY['L1','L4'],
 jsonb_build_object(
   'L1', jsonb_build_object('label','Programmable corporate wallets','evidence_url',NULL),
   'L4', jsonb_build_object('label','Agent spend controls','evidence_url',NULL)
 ),
 'Capital One (acquired)', NULL, 'Capital One', 5150, NULL, NULL, NULL, NULL, 'public_webpage',
 'Programmable card infra is a foundation for agent spend controls per Keyrock framing.'),

('cow-protocol', 'CoW Protocol', 'Intent-based DEX aggregator with competing solver network. $33B+ lifetime volume, 30+ solver teams. Shields agent trades from MEV.',
 'https://cow.fi', '@CoWSwap', ARRAY['L2'],
 jsonb_build_object('L2', jsonb_build_object('label','Solver-network intent routing','evidence_url','https://cow.fi')),
 'CoW DAO', NULL, NULL, NULL, NULL, 33000000000, NULL, 30, 'verified_onchain',
 'Cited by Keyrock as the institutional market-maker opportunity at the agent-payments infrastructure layer.')

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  website_url = EXCLUDED.website_url,
  x_handle = EXCLUDED.x_handle,
  layers = EXCLUDED.layers,
  layer_evidence = EXCLUDED.layer_evidence,
  backing_org = EXCLUDED.backing_org,
  funding_usd_millions = EXCLUDED.funding_usd_millions,
  acquired_by = EXCLUDED.acquired_by,
  acquisition_price_usd_millions = EXCLUDED.acquisition_price_usd_millions,
  acquisition_date = EXCLUDED.acquisition_date,
  documented_volume_usd = EXCLUDED.documented_volume_usd,
  documented_tx_count = EXCLUDED.documented_tx_count,
  documented_partner_count = EXCLUDED.documented_partner_count,
  notes = EXCLUDED.notes,
  evidence_tier = EXCLUDED.evidence_tier,
  source = EXCLUDED.source,
  methodology_version = EXCLUDED.methodology_version,
  updated_at = NOW();
