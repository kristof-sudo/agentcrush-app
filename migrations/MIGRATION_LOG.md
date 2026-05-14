# AgentCrush Migration Log

## Status

This log records the intended canonical history of production database changes from the Operating Model Reset onward.

Older historical DB changes existed before this process was formalized and may not yet be fully reconstructed here.

## Entries

### 2026-05-14
- `migrations/20260514_2100_update_evidence_ready_rule.sql` — Update `agent_score_v2_rank_comparison.evidence_ready_for_public_rank` rule. Adds third OR clause: `(github_score >= 90 OR package_usage_score >= 90 OR ecosystem_score >= 90) AND (count of signals > 50) >= 2`. Top-tier on any primary signal counts, provided multi-signal corroboration (prevents vanity-metric / signal-manipulation promotions). Kris-approved 2026-05-14 — canonicalizes the app-layer override that was previously in `src/app/rankings/page.js`. After this is applied, the override line in /rankings can be removed. All downstream views (`agent_score_v2_top50_public_candidate`, etc.) inherit automatically. `CREATE OR REPLACE` only — no schema change.
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260514_1716_create_a2a_agents.sql` — Create `a2a_agents` table for the external A2A (Agent-to-Agent Protocol) activity crawler v0. Read-only mirror of GitHub repos that declare A2A support via topics (`a2a-protocol`, `agent2agent`, `agent-to-agent`, `a2a`, `agent-protocol`), dependencies (`@google/a2a-sdk`, `@a2a-project`), or description keyword (`"A2A protocol"`). One row per `repo_full_name` (UNIQUE). Stores normalized fields (repo_url, name, owner, description, stars, forks, language, topics, homepage_url, discovery_method, last_pushed_at, signal_strength 0..100) plus `raw_payload` and a sha256 `payload_hash` for change detection. Indexes on `signal_strength DESC`, `stars DESC`, `last_seen_at DESC`, `discovery_method`. `updated_at` touch trigger. v0 scope is GitHub discovery only; live-endpoint pinging is deferred to v1. No scoring impact. Populated by `runtime/a2a-crawler.mjs`.
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260514_1200_create_virtuals_agents.sql` — Create `virtuals_agents` table for the daily Virtuals Protocol agent-index mirror. One row per Virtuals numeric id; stores name, ticker, description, token_address (Base), market_cap / fdv / tvl / price denominated in VIRTUAL token (Virtuals API native), liquidity_usd + volume_24h_usd (USD-denominated), holders, top10_holder_pct, price_change_pct_24h, category, archetype (`role`), image/twitter URLs, plus full raw_payload JSONB and a sha256 payload_hash for change detection. Indexes on name, token_address, market_cap_virtual DESC, market_cap_usd DESC, last_seen_at DESC, ticker. updated_at touch trigger. Read-only mirror, no scoring impact. Populated by `runtime/virtuals-agents-adapter.mjs`.
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260514_0530_create_agentverse_agents.sql` — Create `agentverse_agents` table for the Agentverse (Fetch.ai) read-only adapter. Read-only mirror of the public `POST https://agentverse.ai/v1/search/agents` index. PK `agentverse_id` (bech32 address). Stores normalized fields (name, description, category, address, endpoint_url, is_active, status, protocols, runtime, interactions_count, rating, uptime_pct, tags) plus `raw_payload` and a sha256 `payload_hash` for change detection. Indexes on name, address, is_active, last_seen_at DESC, payload_hash. `updated_at` touch trigger. Idempotent upserts on `agentverse_id`; `last_seen_at` bumps every run. No scoring impact. Populated by `runtime/agentverse-agents-adapter.mjs`.
  **STATUS: Written — requires manual apply via Supabase dashboard.**

### 2026-05-13
- `migrations/20260513_2030_erc8004_registry_multichain_checkpoint.sql` — Multi-chain + checkpoint support for `erc8004_registry`. Adds `mint_block` column, changes PK from `(token_id)` to `(token_id, chain)` (same token id can exist on Base AND Ethereum), creates `erc8004_sync_state` table for per-chain checkpoint (last_scanned_block, run history, error state) so daily runs resume from where they left off instead of re-scanning the full block range. Compatible with v1 (additive on empty table).
  **STATUS: APPLIED 2026-05-13 by Kris via Supabase dashboard.**
- `migrations/20260513_1948_create_erc8004_registry_sync.sql` — Create `erc8004_registry` table for the daily ERC-8004 AgentRegistry sync on Base mainnet (contract `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`). Stores `token_id` (PK), `owner_address`, `metadata_uri`, `agent_name`, `endpoints` (jsonb), `x402_supported`, `metadata_hash` (sha256 for change detection), `chain` (default `'base'`), `registered_at` (set on insert), `last_seen_at` (bumped each run). Indexes on `agent_name`, `owner_address`, partial index on `x402_supported`, and `registered_at DESC` for "new this week" queries. Distinct from `agent_erc8004_registrations` (AC-agent ↔ token matches via 8004scan). Populated by `runtime/erc8004-registry-sync.mjs`.
  **STATUS: APPLIED 2026-05-13 by Kris via Supabase dashboard.**
- `migrations/20260513_1500_add_bot_fetch_friendliness.sql` — Add `agents.bot_fetch_friendliness` (jsonb) and `agents.bot_fetch_friendliness_score` (smallint) plus index `idx_agents_bot_fetch_friendliness_score`. Stores per-agent machine-discoverability scan results: presence of `/.well-known/x402`, `/.well-known/agent-card.json`, `/.well-known/mcp.json`, OpenAPI spec, and permissive robots.txt. Display-only — NOT a ranking input. Populated by `runtime/bot-fetch-friendliness-scanner.mjs`.
  **STATUS: APPLIED 2026-05-13 by Kris via Supabase dashboard.**
- `migrations/20260513_1235_create_bazaar_resources.sql` — Create `bazaar_resources` table for the CDP Bazaar `/discovery/resources` adapter v0. Read-only mirror of Coinbase's public Bazaar index; one row per `resource_url`. Stores normalized fields (description, accepts, declared_schema, quality, last_updated_at) plus raw_payload and a payload_hash for change detection. Idempotent upserts; missing rows on subsequent runs get `removed_at` set. No scoring impact. Populated by `runtime/bazaar-resources-adapter.mjs`.
  **STATUS: APPLIED 2026-05-13 by Kris via Supabase dashboard.**

### 2026-05-05
- `supabase/migrations/20260505_1000_add_payment_rails_supported.sql` — Add `agents.payment_rails_supported` JSONB column (NOT NULL, default `'[]'`). Stores protocol/payment rail coverage per agent as an array of rail objects with fields: rail, status, evidence_tier, source_url, last_checked_at, notes. No scoring impact. Manual population only. Example seed at `scripts/seed-examples/payment-rails-example.json`.
  **STATUS: Written — requires manual apply via Supabase dashboard.**

### 2026-04-26
- `supabase/migrations/20260426_1800_create_agent_erc8004_registrations.sql` — Read-only ERC-8004
  identity registry match storage. Table `agent_erc8004_registrations` with FK to agents, unique
  constraint on (agent_id, chain_id, registry_address, token_id), indexes on agent_id,
  agent_handle, x402_supported, last_checked_at, chain_id, match_confidence. No scoring impact.
  Populated by `scripts/sync-erc8004-registrations.mjs --write`.
  **STATUS: Written, requires manual apply via Supabase dashboard.**

### 2026-04-25
- `supabase/migrations/20260425_1600_add_agents_tier.sql` — Phase 5.1 tiered indexing foundation.
  Adds agents.tier (text NOT NULL DEFAULT 'indexed', CHECK IN evidence_ranked/indexed/archived),
  agents.tier_promoted_at (timestamptz), and idx_agents_tier index. Backfills ~39 agents to
  evidence_ranked based on evidence_ready_for_public_rank from agent_score_v2_rank_comparison.
  Does not modify rankings, score_total, global_rank, or call recalc_rankings.
  **STATUS: Written, requires manual apply via Supabase dashboard.**
- `supabase/migrations/20260425_1400_add_score_v2c_shadow_formula.sql` — Phase 5 shadow scoring
  Phase 2: adds score_v2_c conservative formula. Fixed denominator (0.90), missing-signal prior
  = 20. Replaces agent_score_v2_preview and agent_score_v2_rank_comparison to add rank_v2_c,
  rank_delta_c, score_delta_c, coverage_tier, evidence_ready_for_public_rank,
  score_v2_c_public_candidate. Adds agent_score_v2_top50_c,
  agent_score_v2_top50_public_candidate, agent_score_v2_formula_comparison_summary,
  agent_score_v2_large_movers_c. Zero live writes. **STATUS: Written, requires manual apply.**
- `supabase/migrations/20260425_1200_create_score_v2_shadow_views.sql` — Phase 5 shadow scoring
  infrastructure. Creates 8 read-only views: `agent_score_v2_github` (GitHub component),
  `agent_score_v2_ecosystem` (relationship-based component), `agent_score_v2_signal_components`
  (all components joined per agent), `agent_score_v2_preview` (score_v2_a + score_v2_b formulas),
  `agent_score_v2_rank_comparison` (ranks + deltas + review flags), plus 5 comparison/diagnostic
  views. Zero writes to agents, rankings, or any live scoring path. No recalc_rankings calls.
  **STATUS: Written, requires manual apply via Supabase dashboard.**

### 2026-04-08
- `20260408_1000_claim_requests.sql` — Create `claim_requests` table for builder profile claim
  flow. Stores: agent_handle, agent_id, contact (email/X handle), note, status (pending →
  approved/rejected/duplicate), created_at. Indexed on agent_handle and (status, created_at).
  Powers the "Claim this profile" button on agent pages and the Claim Requests panel in
  Mission Control. **STATUS: Written, requires manual apply via Supabase dashboard.**

### 2026-04-07
- `20260407_1600_add_platform_identity_type.sql` — Expand `agents.identity_type` check
  constraint to include `platform`. Discovered during Phase 9 identity/composition validation
  when enriching 20 agents: 7 failed with constraint violation because ecosystem platforms
  (AgentOps, Virtuals Protocol, Fetch.ai, AI Arena, Superagent) don't fit the existing 5-value
  enum. **STATUS: Written, requires manual apply via Supabase dashboard.**

### 2026-03-30
- `20260330_1000_github_raw_agents.sql` — Create `github_raw_agents` table for GitHub ingestion
  pipeline. Stores raw repo data (repo_id, name, owner, description, stars, language, repo_url,
  homepage_url, topics). Unique constraint on `repo_url` prevents duplicate inserts.
  `imported` flag tracks normalization status.
- `20260330_1010_agents_github_website_url.sql` — Add `github_url` and `website_url` columns
  to `agents` table. Enables external link icon in rankings table and "Try this agent" button
  on agent profile pages. GitHub-sourced agents populated via normalize-github-agents.mjs.

### 2026-03-28
- `20260328_1500_ecosystem_relationships_seed.sql` — 100+ curated relationships across
  top agents: framework (runs_on / framework_of), infra (integrates_with), ecosystem
  (part_of_ecosystem), and competitive (competes_with / derived_from). Uses a helper
  function + safe SELECT-INSERT pattern so missing handles are silently skipped.
  Covers LangChain, AutoGen, CrewAI, E2B, Composio, Helicone, LiteLLM, Mem0, AgentOps,
  Solana/Virtuals ecosystems, and 20+ competitive pairs.
- `20260328_1400_seed_missing_rankings.sql` — Seed rankings rows for the ~130 agents added
  in the expansion batch who have no canonkeeper-generated ranking row. Inserts score=0 rows
  and assigns sequential ranks after the current max. Run AFTER canonkeeper_tick() to only
  fill gaps canonkeeper leaves behind.
- `20260328_1200_agent_expansion_seed.sql` — Agent expansion: ~60 real AI agents seeded
  across Builder (Cursor, Copilot, Devin, Aider), Researcher (Perplexity, Elicit, NotebookLM),
  Operator (LangChain, CrewAI, AutoGen), Crypto (aixbt, Zerebro, ai16z, Griffain),
  Infrastructure (Mem0, E2B, Composio, AgentOps), Creator (Jasper, ElevenLabs, Suno, Runway).
  Uses ON CONFLICT (handle) DO NOTHING — safe to re-run.

### 2026-03-18
- Migration discipline established
- From this date forward, new DB changes must be versioned in `migrations/`
