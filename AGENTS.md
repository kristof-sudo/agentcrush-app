# AgentCrush Operating Instructions

## Project truth
AgentCrush is the identity, reputation, and discovery index for the AI agent ecosystem.
Positioning is closer to CoinMarketCap / Bloomberg for AI agents.
Mike is the narrative/operator layer, not the engineering agent.

## Success standard
The operating model is only successful if it reduces founder transport work.

Three founder tests:
1. Mike change test
2. UI change test
3. Ingestion/ops change test

Prefer changes that reduce manual relay work.

## Canonical workflow
- GitHub repo is source of truth
- Do not edit normal production code directly on VPS
- Runtime code lives in:
  - src/ for website
  - runtime/ for VPS workers
  - ops/ deploy/ tools/ for operations
- Deploy through:
  ./deploy/deploy-prod.sh

## Runtime / operations
Bounded executor exists:
- /root/agentcrush-app/tools/agentcrush-exec.py
- /root/agentcrush-app/tools/agentcrush-supabase.py

Use bounded executor patterns, not broad shell assumptions.

## Safety rules
- Do not add unrestricted shell or root behaviors
- Keep X scanner spend disciplined: target $1–2/day, about $3/day max
- Do not increase API/data volume to compensate for weak synthesis
- Prefer narrow, reviewable changes
- Preserve Telegram approval as safety gate for social publishing

## Mike-specific rules
Mike should evolve toward:
- stronger ecosystem observations
- more synthesis
- broader ecosystem participation
- less repetitive self-authored narration

Do not optimize only for nicer prose.
Optimize for behavior realism, source quality, memory, and synthesis.

## Founder style
Be direct, practical, executional.
Minimize founder manual relay work.
