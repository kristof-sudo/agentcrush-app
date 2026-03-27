# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

AgentCrush is an identity, reputation, and discovery index for the AI agent ecosystem — positioned as CoinMarketCap/Bloomberg for AI agents. It tracks agent rankings, reputation signals, and ecosystem discovery.

**Mike** is the narrative/operator layer (not an engineering agent). The engineering agents are here to reduce founder (Kristof) manual relay work.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build
npm run lint       # ESLint
npm start          # start production server
```

**Deploy** (review first, then approve):
```bash
./ops/deploy-and-smoke.sh               # review + validate only
./ops/deploy-and-smoke.sh --approve-deploy  # runs full deploy
```

Configure deploy: `cp ops/deploy/prod.env.example ops/deploy/prod.env`

## Architecture

AgentCrush is a 3-layer system:

### Product layer (`src/`)
Next.js 16 + React 19 on Vercel, backed by Supabase (PostgreSQL). Core tables: `agents`, `rankings`, `events`, `interaction_jobs`. Uses Tailwind CSS 4 and Stripe for premium profile upgrades.

### Automation layer (`runtime/`)
Node.js workers managed by systemd on a VPS at `/opt/agentcrush`. Pipeline:
1. **x-scanner-worker.mjs** — pulls ecosystem signals from X ($1–2/day budget)
2. **selector-worker.mjs** — selects content candidates
3. **copydesk-worker.mjs** — generates posts in Mike's voice with deduplication
4. **scheduler-prep.mjs** — schedules posts to queue
5. **approval-notifier.mjs / approval-listener.mjs** — Telegram approval gate
6. **publisher-worker.mjs** — posts approved content to X
7. **canon-enqueuer.mjs** — builds ecosystem roundups

### Narrative layer
Mike produces: ecosystem roundups, original observations, selective replies/quotes. Not spam or pure self-narration.

## Database migrations

All schema changes go through versioned `.sql` files in `migrations/` — never direct production edits (emergency edits must be back-filled immediately). Naming: `YYYYMMDD_HHMM_description.sql`. Process: write file → commit → apply to Supabase → log in `migrations/MIGRATION_LOG.md`.

## Bounded executor pattern

Runtime operations go through bounded executors on the VPS — never broad shell access:
- `/root/agentcrush-app/tools/agentcrush-exec.py` — bounded shell operations
- `/root/agentcrush-app/tools/agentcrush-supabase.py` — bounded Supabase reads + allowlisted writes (`cancel_stale_queued_posts`, `reschedule_post_by_id`)

## Operating rules

- **Repo is source of truth** — no direct VPS code edits except emergencies; reflect emergency changes back to repo immediately
- **Narrow changes only** — fix the stated problem with the smallest durable diff; do not silently expand scope
- **X scanner budget** — target $1–2/day, max $3/day; do not increase API volume to compensate for weak synthesis
- **Telegram approval gate** — must be preserved as the final gate for all social publishing
- **Evaluate changes** against one of three tests: Mike change test, UI change test, ingestion/ops change test

## Key docs

- `AGENTS.md` — operating instructions and founder tests
- `docs/runtime-map.md` — full system architecture and known failure risks
- `docs/codex-executor-workflow.md` — executor workflow rules and scope discipline
- `migrations/README.md` — migration naming and process
- `ops/deploy/README.md` — deploy wrapper usage
