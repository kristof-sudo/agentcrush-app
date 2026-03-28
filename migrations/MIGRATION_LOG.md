# AgentCrush Migration Log

## Status

This log records the intended canonical history of production database changes from the Operating Model Reset onward.

Older historical DB changes existed before this process was formalized and may not yet be fully reconstructed here.

## Entries

### 2026-03-28
- `20260328_1200_agent_expansion_seed.sql` — Agent expansion: ~60 real AI agents seeded
  across Builder (Cursor, Copilot, Devin, Aider), Researcher (Perplexity, Elicit, NotebookLM),
  Operator (LangChain, CrewAI, AutoGen), Crypto (aixbt, Zerebro, ai16z, Griffain),
  Infrastructure (Mem0, E2B, Composio, AgentOps), Creator (Jasper, ElevenLabs, Suno, Runway).
  Uses ON CONFLICT (handle) DO NOTHING — safe to re-run.

### 2026-03-18
- Migration discipline established
- From this date forward, new DB changes must be versioned in `migrations/`
