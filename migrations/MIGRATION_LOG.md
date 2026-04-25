# AgentCrush Migration Log

## Status

This log records the intended canonical history of production database changes from the Operating Model Reset onward.

Older historical DB changes existed before this process was formalized and may not yet be fully reconstructed here.

## Entries

### 2026-04-25
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
