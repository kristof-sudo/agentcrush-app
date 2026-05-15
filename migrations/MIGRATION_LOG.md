# AgentCrush Migration Log

## Status

This log records the intended canonical history of production database changes from the Operating Model Reset onward.

Older historical DB changes existed before this process was formalized and may not yet be fully reconstructed here.

## Entries

### 2026-05-16
- `migrations/20260516_1200_plumb_deployment_into_model_family_view.sql` — Step (c.4.b). Replaces `agent_score_model_family_v1` with **v1.4-with-deployment** — methodology COMPLETION, all 5 signal slots filled. Repurposes the previously-NULL `social_score` slot as `deployment_score` (HN/Reddit was commodity; cross-protocol deployment mentions are the moat). `deployment_score = LEAST(100, ROUND(LOG10(SUM(deployment_count)) * 30))`. Adds raw aggregates total_deployments / sources_with_deployments / top_source_deployments / deployments_by_source. Composite weights unchanged: HF 30 / der 20 / LM 25 / cites 15 / dep 10. Evidence-ready rule extended: deployment counts as capability signal alongside derivatives/LMArena/citations. All 5 model_family seeds now evidence-ready: Qwen 85, Gemini 82, DeepSeek 75, Llama 70, Hermes 34 (the methodology rule correctly admits Hermes once it has 4 signals; low composite reflects its real footprint).
  **STATUS: APPLIED 2026-05-16 by Kris. Verified end-state matches projections.**
- `migrations/20260516_1100_create_model_family_deployments.sql` — Step (c.4). Creates `model_family_deployments` aggregation table. PK is (model_family_handle, source_table). Columns: deployment_count INTEGER, sample_matches JSONB (top-10 sample rows for transparency), match_keywords TEXT[], last_aggregated_at. Adds `agents.model_family_search_keywords TEXT[]` with seed keywords for all 5 model_family agents (Hermes uses "nous hermes"/"hermes-3"/"nousresearch" — avoids bare "hermes" false-positive risk). Populated by `runtime/deployment-aggregator.mjs` which ILIKE-scans text fields across agents/bazaar_resources/erc8004_registry/agentverse_agents/virtuals_agents/a2a_agents. **This is the moat signal — only AgentCrush has the unified cross-protocol index to compute it.** No external API calls; pure SQL aggregation.
  **STATUS: APPLIED 2026-05-16 by Kris. Adapter run produced 30 rows: Gemini 144 total deployments (top), Qwen 72, Llama 63, DeepSeek 38, Hermes 8.**
- `migrations/20260516_0930_plumb_citations_into_model_family_view.sql` — Step (c.3.b). Replaces view with v1.3-hf+lmarena+derivatives+citations. Plumbs `citations_score = LEAST(100, ROUND(LOG10(SUM(citation_count)) * 16))` per agent via `agents.semantic_scholar_paper_ids` → `paper_citations.arxiv_id` (LATERAL unnest + REGEXP_REPLACE 'arxiv:' prefix). Adds raw aggregates total_citations / total_influential_citations / papers_matched_count / top_paper_citations. Methodology v1.2 → v1.3.
  **STATUS: APPLIED 2026-05-16 by Kris. Hermes hit evidence-ready at composite 31 from citations alone (3 signals + citations as capability).**
- `migrations/20260516_0900_create_paper_citations.sql` — Step (c.3). Creates `paper_citations` aggregation table (Semantic Scholar mirror). PK is canonical S2 paperId (40-char hex). Columns: arxiv_id, doi, corpus_id, title, authors JSONB, venue, publication_year/date, citation_count, influential_citation_count, reference_count, abstract, fields_of_study, raw_payload, payload_hash, lifecycle (first_seen/last_seen/removed_at). Adds `agents.semantic_scholar_paper_ids TEXT[]` storing tokens like "arxiv:2408.11857". Seeds 13 canonical papers across the 5 model_family agents (Hermes 1, Gemini 2, DeepSeek 3, Qwen 4, Llama 3). Populated by `runtime/citations-adapter.mjs` (free API tier ~3.5s sleep, with `SEMANTIC_SCHOLAR_API_KEY` env: 1.1s sleep). Adapter has built-in 429 backoff and `--skip-existing` mode for retries.
  **STATUS: APPLIED 2026-05-16 by Kris. Initial fetch 7/13 papers, backfill with S2 API key brought it to 12/13 (only arxiv:2312.11805 remains 404 — paper not in S2 under that ID). Real citations: Llama 51,449 / Qwen 13,617 / DeepSeek 6,556 / Gemini 3,528 / Hermes 33.**

### 2026-05-15
- `migrations/20260515_2330_seed_qwen_llama_model_family.sql` — Seeds Qwen and Meta Llama as `model_family` agents so the v1.2 view has more than just Gemini + DeepSeek populated. INSERT new agent `qwen` (hf_author='Qwen', 8 LMArena keys covering top variants 1418–1470 BT incl. qwen3.5-max-preview, qwen3.6-max-preview, qwen3-235b-a22b-instruct-2507). UPDATE existing `llama` row (was mis-categorized as 'developer'): primary_category='model_family', hf_author='meta-llama', 8 LMArena keys covering Meta-authored variants only (llama-4-maverick, llama-3.1-405b-{bf16,fp8}, llama-4-scout, llama-3.3-70b, llama-3.1-70b, llama-3-70b, llama-3.1-8b — explicitly excludes NVIDIA Nemotron / AllenAI Tulu derivatives which correctly count toward Meta's derivatives_score instead). Projected scores from v1.2 formulas: Qwen ~69 composite (HF~100+LM=96+Der=63 → evidence-ready); Meta Llama ~56 composite (HF~96+LM=73+Der=54 → evidence-ready). Both clear the 3-of-5 + capability-signal rule on apply. All values verified against live `hf_models`, `hf_derivatives`, `lmarena_models` tables before writing the migration. Idempotent (ON CONFLICT for insert, WHERE-guarded UPDATE for llama).
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260515_2200_plumb_derivatives_into_model_family_view.sql` — Step (c.2.b). Replaces `agent_score_model_family_v1` with v1.2-hf+lmarena+derivatives. Plumbs `derivatives_score = LEAST(100, ROUND(LOG(10, GREATEST(1, SUM(derivatives_count))) * 25))` per `base_author`, joined to agents via `hf_author`. Adds raw aggregates total_derivatives / base_models_with_derivatives / top_base_derivatives_count / total_derivative_downloads. Composite weights unchanged (HF 30 / der 20 / LM 25 / cites 15 / social 10). First two evidence-ready model_family agents on apply: Gemini (composite=67) and DeepSeek (composite=61). Hermes stays not-yet at composite=27 (no LMArena coverage, only 21 declared derivatives → 2/5 signals). Idempotent (DROP VIEW IF EXISTS CASCADE then recreate).
  **STATUS: APPLIED 2026-05-15 by Kris via Supabase dashboard. Verified: Gemini 67, DeepSeek 61, Hermes 27 — matches projections exactly.**
- `migrations/20260515_2030_create_hf_derivatives.sql` — Step (c.2) of the Category Index Pivot. Creates `hf_derivatives` aggregation table. PK is canonical `base_model` HF id ("owner/name"). Columns: `base_author` (owner prefix), `derivatives_count` INTEGER, `derivatives_total_downloads` BIGINT, `derivatives_total_likes` INTEGER, `sample_derivative_ids` JSONB (top 10 by downloads for transparency display), `last_aggregated_at`, plus `created_at` / `updated_at` with touch trigger. Indexes on `derivatives_count DESC`, `derivatives_total_downloads DESC`, `base_author`, `last_aggregated_at DESC`. Populated daily by `runtime/hf-derivatives-aggregator.mjs` which scans `hf_models.tags` for `base_model:OWNER/NAME` (and `:finetune:` / `:quantized:` / `:adapter:` / `:merge:` variants) — local aggregation against the cached `hf_models` table, no HF API calls. Second capability signal for `model_family` scoring after LMArena. No scoring impact in this migration; linkage into `agent_score_model_family_v1.derivatives_score` is a SEPARATE downstream migration (sketch: `LEAST(100, ROUND(LOG(10, GREATEST(1, SUM(derivatives_count) GROUP BY base_author)) * 25))`).
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260515_1900_plumb_lmarena_into_model_family_view.sql` — Step (c.1.b) of the Category Index Pivot. Plumbs LMArena Bradley-Terry scores into `agent_score_model_family_v1`. Adds `agents.lmarena_model_keys TEXT[]` (joins agent → multiple LMArena variants). Backfills 3 seeds (Hermes → 4 variants, DeepSeek → 4, Gemini → 4). Replaces view: `lmarena_score` now computed via `LEAST(100, ROUND((MAX(arena_score) - 700) / 8))` mapping BT 700-1500 → 0-100. Methodology version bumps `v1.0-hf-only` → `v1.1-hf+lmarena`. Evidence-ready still requires 3-of-5 signals AND ≥1 capability — with HF+LMArena only, 2-of-5 means still false; derivatives (step c.2) is the unlock. Idempotent.
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260515_1137_create_lmarena_models.sql` — Step (c.1) of the Category Index Pivot. Create `lmarena_models` table to mirror the canonical LMArena (Chatbot Arena) Bradley-Terry leaderboard. PK is normalized `model_name` (lowercased, date-suffix stripped). Columns: `display_name`, `organization`, `arena_score` (BT rating, ~700..1500), `arena_rank`, `votes`, `license`, `model_url`, `category_ranks` JSONB (per-category sub-rankings: hard / coding / vision / style_control / etc.), `leaderboard_publish_date`, `raw_payload` JSONB, sha256 `payload_hash`. Lifecycle: `first_seen_at`, `last_seen_at`, `removed_at` (soft-remove on disappearance). Indexes on `arena_score DESC`, `arena_rank ASC`, `organization`, `votes DESC`, `last_seen_at DESC`, `payload_hash`. `updated_at` touch trigger. Source: HF dataset `lmarena-ai/leaderboard-dataset` (config=text, split=latest, ~8.8k category rows collapsed to ~600 unique models). Populated by `runtime/lmarena-adapter.mjs`. Highest-leverage source signal for the `model_family` agent category — feeds the `lmarena_score` column reserved in `agent_score_model_family_v1`. No scoring impact in this migration; linkage to `agents` happens in a separate downstream migration (planned: `agents.lmarena_model_keys` text[] + view update mapping max(arena_score)→0..100 via `LEAST(100, ROUND((MAX(arena_score) - 700) / 8))`).
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260515_1600_model_family_scoring_view.sql` — Step (c) of the Category Index Pivot. Adds `agents.hf_author` column (joins to `hf_models.author`). Backfills the 3 model_family seeds (NousResearch, deepseek-ai, google). Creates view `agent_score_model_family_v1` aggregating HF signals by author into 5 sub-scores (downloads, likes, recency, breadth, top_model) → composite `hf_score`. Reserves NULL columns for future signal slices (derivatives, LMArena, citations, social) — top-level weights: HF 30 / derivatives 20 / LMArena 25 / citations 15 / social 10 (Kris-approved 2026-05-15). `evidence_ready_for_public_rank` is **strict**: requires 3 of 5 signals AND at least one of (derivatives, LMArena, citations). Since those adapters haven't shipped, every model_family agent is `evidence_ready = false` today. /rankings/model-families launches empty with methodology transparency. Rankings populate as adapters land. Methodology version: 'v1.0-hf-only'. Design doc: `agentcrush-brain/Decisions/2026-05-15-model-family-scoring-design.md`.
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260515_1430_create_hf_models.sql` — Step (b) of the Category Index Pivot. Create `hf_models` table for the daily HuggingFace model-index mirror. Read-only mirror of `huggingface.co/api/models`; one row per HF `model_id` ("owner/name"). Stores normalized fields (author, pipeline_tag, tags JSONB, downloads, likes, library_name, gated, created_at_hf, last_modified_at) plus full `raw_payload` JSONB and a sha256 `payload_hash` for change detection. Lifecycle columns: `first_seen_at`, `last_seen_at`, `removed_at` (soft-remove when a row falls out of the top-N fetch). Indexes on `downloads DESC`, `likes DESC`, `author`, `pipeline_tag`, `last_modified_at DESC`, `last_seen_at DESC`, `payload_hash`. `updated_at` touch trigger. Populated by `runtime/hf-models-adapter.mjs` — fetches top ~10k by downloads. Source signal for the `model_family` agent category. Promotion into the `agents` table is a SEPARATE gated step (planned threshold: `downloads > 100,000` AND author in known-model-family allowlist). No scoring impact.
  **STATUS: Written — requires manual apply via Supabase dashboard.**
- `migrations/20260515_1200_add_agent_categories.sql` — Step (a) of the Category Index Pivot. Adds `agents.primary_category` (text, required, default 'developer', CHECK in 4 values), `agents.secondary_categories` (text[], max 1 entry, must differ from primary_category, same enum), `agents.socially_visible` (bool, default FALSE — metadata flag for tokenized agents with social/KOL footprint since Social/KOL is deferred as a standalone category). Backfill: re-maps `tier='virtuals_economic'` → `primary_category='tokenized', tier='indexed'`. Re-maps `tier='agentverse_service'` → `primary_category='service', tier='indexed'`. Seeds 3 known model_family agents (nousresearch_hermes_agent, deepseek, gemini); HF adapter (step b) will discover the rest. Sets socially_visible=TRUE on aixbt. Indexes on primary_category, secondary_categories (GIN), socially_visible. Idempotent. Tier system reverts to universal — old tier-as-category values (virtuals_economic, agentverse_service) remain in CHECK constraint for transitional safety but are now unused. Decision doc: `agentcrush-brain/Decisions/2026-05-14-category-index-pivot.md`.
  **STATUS: Written — requires manual apply via Supabase dashboard.**

### 2026-05-14
- `migrations/20260514_2100_update_evidence_ready_rule.sql` — Update `agent_score_v2_rank_comparison.evidence_ready_for_public_rank` rule. Adds third OR clause: `(github_score >= 90 OR package_usage_score >= 90 OR ecosystem_score >= 90) AND (count of signals > 50) >= 2`. Top-tier on any primary signal counts, provided multi-signal corroboration (prevents vanity-metric / signal-manipulation promotions). Kris-approved 2026-05-14 — canonicalizes the app-layer override that was previously in `src/app/rankings/page.js`.
  **STATUS: APPLIED 2026-05-14 by Kris via Supabase dashboard.**
- `migrations/20260514_1819_extend_agents_tier_for_external_ecosystems.sql` — Extend `agents.tier` CHECK constraint to accept two new tier values (`virtuals_economic`, `agentverse_service`) alongside the existing core track (`evidence_ranked`, `indexed`, `archived`). Adds nullable cross-reference columns `agents.virtuals_id BIGINT` and `agents.agentverse_id TEXT` linking promoted rows back to `virtuals_agents` / `agentverse_agents` source tables. Partial UNIQUE indexes enforce at-most-one mapping per source id while allowing many NULLs. Enables the 3-tier promoter scripts. Kris-approved scope 2026-05-14 — these tiers stay OUT of the main `/rankings` view to preserve "decision-grade reputation" positioning.
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
