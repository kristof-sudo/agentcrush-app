# AgentCrush — Claude Workflow SOPs

**Created:** May 1, 2026
**Owner:** Kris
**Purpose:** Keep Claude execution consistent across sessions. Reference before starting any non-trivial task.

---

## Which Claude does what

| Role | Scope |
|---|---|
| **Claude Mac** | Website, docs, UI, Next.js, public surfaces, migrations, main repo |
| **Claude VPS** | Workers, Ajsa, timers, runtime, logs, systemd, VPS-side scripts |
| **ChatGPT strategy** | Prioritization, task selection, prompts, post-review, judgment calls |

Never mix scopes in one session. A Mac session does not touch VPS code. A VPS session does not touch the website.

---

## SOPs

---

### SOP 1 — Investigate before build

Before writing a single line of code or SQL:

1. Read the relevant files. Use `Read`, `grep`, or `find` — not assumptions.
2. Identify the actual root cause. State it explicitly before proposing a fix.
3. If the cause is ambiguous, say so. Do not patch blindly.
4. If a required upstream field or source does not exist, report that before proceeding — do not invent a workaround.

**Example trigger:** "X is broken" → read the file, reproduce the problem in code, name the exact line or query causing it, then propose a fix.

---

### SOP 2 — Small commit only

One task per commit. Never mix:
- docs and code changes
- website and runtime changes
- migration and feature work
- strategy update and implementation

Always end a session with:

```
git diff --stat
git log --oneline -5
git status
```

Confirm: only expected files changed. If unexpected files appear in the diff, investigate before committing.

---

### SOP 3 — Website / product task

- Mac repo only (`/Users/pk/projects/agentcrush-app`)
- When touching app code: run `npm run lint` and `npm run build` before committing
- Smoke the relevant routes after build — check the page renders, key data appears
- Do not change scoring logic, API contracts, or Supabase schema unless explicitly requested
- Do not touch VPS workers or runtime files

---

### SOP 4 — VPS / runtime task

- VPS only — do not touch the website repo during a VPS session
- Use dry-run or `--no-telegram` flags where available before running live
- Report timers, log tails, and systemd status to confirm behavior
- If a worker is misbehaving, stop it before patching, then restart after patching
- Do not deploy website code from the VPS session

---

### SOP 5 — Supabase migration task

1. Read the current schema and policies first (`\d tablename`, `SELECT * FROM pg_policies WHERE tablename = '...'`)
2. Prepare the full SQL before executing anything
3. Avoid broad `ALTER TABLE` changes on high-traffic tables without a rollback plan
4. Default to least privilege — grant only what is needed
5. After applying: run a verification query to confirm the change landed correctly
6. Write the migration file to `migrations/` with the naming convention `YYYYMMDD_HHMM_description.sql`
7. Log it in `migrations/MIGRATION_LOG.md`

Include a rollback query in comments at the top of every migration SQL file.

---

### SOP 6 — Research / content task

- No code edits during a research session
- Classify every surfaced signal using the standard labels:
  - **Ignore** — not relevant, noise
  - **Monitor** — worth watching; no action yet
  - **Investigate** — needs a closer look before deciding
  - **Build later** — agreed to build; not yet scheduled
  - **Build now** — approved for current sprint

- Every item that clears **Monitor** or above gets a suggested destination:
  - Intelligence Backlog
  - Ajsa watchlist
  - Agent Economy Index tracked surfaces
  - Labs audit checklist
  - Farcaster / distribution surface
  - Product build (which page / endpoint)
  - Scoring source (only if structured, verifiable, low-noise data exists)

---

### SOP 7 — Public-post task

Before finalizing any post for X, Farcaster, Discord, or the blog:

1. Check factual accuracy — confirm numbers, dates, and names against the source
2. No unsupported claims — if a metric is estimated or self-reported, label it as such
3. AgentCrush framing is protocol-neutral — do not say "built on x402" or "the ERC-8004 reputation layer"
4. Avoid "trust layer / reputation layer / identity layer" as public positioning
5. Every post should include at least one concrete lesson, data point, or finding — not pure narration
6. When referencing AgentCrush capabilities, link to a live page or endpoint where possible

---

### SOP 8 — Dashboard update task

- Only after a major sprint, significant shipped changes, or noticeable source-of-truth drift
- Create a new versioned file: `docs/AGENTCRUSH_DASHBOARD_vNN_MM_DD.md`
- Do not modify prior dashboard versions — they are historical records
- Keep the new dashboard to the same structure as prior versions
- Docs-only — no code changes in a dashboard-update session

---

### SOP 9 — Stop conditions

Stop patching and reassess if any of these are true:

| Condition | Action |
|---|---|
| A problem repeats more than 2 cycles | Stop. Identify the root cause. Redesign the relevant piece, do not add another patch. |
| A required downstream field has no clear upstream source | Remove it or redesign the data flow. Do not fake it with a default or workaround. |
| Content pipeline is mixing with build/deploy pipeline | Separate them before continuing. |
| A file or function is doing two unrelated things | Split it before extending it. |

**Prefer delete and simplify over propagation patches.** A five-line fix that adds a new special case is usually worse than a ten-line refactor that removes the case entirely.

---

## Quick reference card

| Starting a task | Check |
|---|---|
| Does this involve website code? | Claude Mac only. Run lint + build. |
| Does this involve VPS / workers? | Claude VPS only. Use dry-run first. |
| Does this involve schema changes? | SOP 5. Prepare SQL. Add migration file. |
| Is this a new content / research signal? | SOP 6. Classify it. Route it. |
| Is something broken and I'm not sure why? | SOP 1. Read first, name the cause, then fix. |
| Is this a post or blog piece? | SOP 7. Verify facts. Keep framing neutral. |
| Am I about to fix the same thing a third time? | SOP 9. Stop. Reassess. |

---

*See also: [EXECUTION_PLAN_SUPPLEMENT.md](EXECUTION_PLAN_SUPPLEMENT.md) — protocol-neutral adapter architecture | [INTELLIGENCE_BACKLOG.md](INTELLIGENCE_BACKLOG.md) — signal classification log | [AGENTS.md](../AGENTS.md) — operating instructions and founder tests*
