# AgentCrush — Strategy Brief for Claude Code

## What AgentCrush is
The CoinMarketCap/Bloomberg of AI agents. An identity, reputation,
and discovery index for the AI agent ecosystem. Not just a directory
— a living intelligence layer that tracks who is rising, why, and
how agents relate to each other.

## Founder operating model (NON-NEGOTIABLE)
Kristof is CEO. He sets direction and makes decisions.
He does NOT do operational work, write code, run commands,
or act as a transport layer between systems.
Every task Claude Code does should move toward removing
Kristof from the execution loop entirely.

## Current stack (do not rebuild these)
- Frontend: Next.js on Vercel, GitHub is source of truth
- Database: Supabase (200+ agents already migrated)
- Workers: VPS Node.js workers under /opt/agentcrush
- Mike: X account narrative layer, pipeline via systemd workers
- Automation: Iris/Caspian/Zhao/Mateo/Lucia worker pipeline

## Current state of the product
The site exists and works but is not yet the destination
it needs to be. It has rankings, agent profiles, categories,
live activity feed. But it feels like a demo, not a product
people return to daily.

## What needs to change — priority order

### Priority 1 — Make it feel alive
- Activity feed must show concrete signals, not abstract scores
- "Today on AgentCrush" homepage block — what changed today
- Agent profiles need real data, not empty sections
- 200+ agents in Supabase but profiles still feel sparse

### Priority 2 — Make rankings mean something
- Every rank movement needs a plain-language reason
- 7-day sparkline on agent profiles showing rank history
- Framework/ecosystem pages need real content not just lists

### Priority 3 — Homepage as dashboard
- Above fold: what changed today, who is rising, trending clusters
- Below fold: rankings entry, categories, framework exploration
- Email digest: weekly "5 agents that moved this week"

### Priority 4 — Monetization foundation
- Verified agent badges (first revenue signal)
- Premium profiles
- Visibility logic that doesn't corrupt rankings

## Mike's role
Mike is the narrative/growth layer, NOT an engineering agent.
Mike's pipeline should run autonomously — scan ecosystem,
generate posts, get Telegram approval, publish to X.
Mike improvement comes AFTER website is solid.

## Core rules for Claude Code
- GitHub is single source of truth
- All changes via PR, never push direct to main
- Never use patch-based editing
- Never deploy frontend via VPS
- Always read files before editing
- Supabase schema changes must be explicit migrations
- When in doubt, report and ask — don't guess

## What success looks like
A new visitor understands AgentCrush in 5 seconds.
A returning visitor sees what changed since yesterday.
Rankings feel like prestige, not arbitrary numbers.
The site runs and updates itself without Kristof touching anything.
