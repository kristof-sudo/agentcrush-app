# Agent Execution Guardrails

## How to consume Codex output
- Codex delivers components as standalone files only
- Before integrating any Codex component:
  1. Read the component fully
  2. Verify it has no data fetching or Supabase calls
  3. Adapt styling to match existing design system
  4. Decide explicitly whether to use it, modify it, or ignore it
- Codex does not wire components into pages
- Final integration authority remains with Claude Code
