name: AgentCrush Operator Workflow
description: Use this skill when working on AgentCrush repo changes, runtime checks, deploy flow, and bounded executor usage.

# AgentCrush operator workflow

## Project truth
AgentCrush is the identity, reputation, and discovery index for the AI agent ecosystem.
Mike is the narrative/operator layer, not the engineering agent.

## Repo structure
- src/ = website/product UI
- runtime/ = VPS workers
- deploy/ = deployment
- ops/ = health and operations scripts
- tools/ = bounded executor and Supabase helper
- migrations/ = DB changes

## Rules
- GitHub repo is source of truth
- Do not rely on broad shell assumptions
- Prefer narrow, reviewable changes
- Keep X scanner spend disciplined
- Preserve Telegram approval flow
- Optimize for reducing founder relay work

## Runtime tools
Use these as the authoritative runtime action surface:
- tools/agentcrush-exec.py
- tools/agentcrush-supabase.py

## Preferred workflow
1. Read AGENTS.md first
2. Inspect only relevant files
3. Make the narrowest change that solves the stated goal
4. Show exact unified diff
5. Explain behavior impact
6. If runtime validation is needed, propose executor-based checks
7. Do not expand scope unless explicitly asked

## Founder success tests
1. Mike change test
2. UI change test
3. Ingestion/ops change test

Prefer work that improves those tests directly.
