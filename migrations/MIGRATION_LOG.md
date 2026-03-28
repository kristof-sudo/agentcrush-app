# AgentCrush Migration Log

## Status

This log records the intended canonical history of production database changes from the Operating Model Reset onward.

Older historical DB changes existed before this process was formalized and may not yet be fully reconstructed here.

## Entries

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
