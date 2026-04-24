# AgentCrush — Execution Plan Addendum
## Section 11: Infrastructure Hardening

**Created:** April 23, 2026
**Priority:** Low-medium — this is risk reduction, not growth work. Integrate opportunistically between priority 1-4 tasks.
**Effort:** Mostly small tasks, but cumulative. Allocate one Claude Code session per week to this list until exhausted.

### Why this section exists

Fragile infrastructure doesn't block near-term shipping, but it increases the cost of every future change and creates the kind of surprise failures that wasted hours during the x402 debugging session (commits not pushed, iCloud permission revocations, middleware deprecation warnings ignored). Each item below is a specific lesson from a specific failure already experienced.

These are NOT strategic bets. They're operational upgrades that reduce friction regardless of which bets play out.

### Priority order (highest ROI first)

**H1. Move main repo out of iCloud Documents.** One-time task, ~30 min, permanent benefit.

```
cd ~
mkdir -p projects
mv "Documents/New project" "projects/agentcrush-app"
cd projects/agentcrush-app
# verify: git remote -v, npm run dev, deploy still works
```

Update any .env paths, any hardcoded paths in scripts, any cron configurations that reference the old location. Update the dashboard and build-chat prompt to reflect the new path. Keep the symlink `ln -s ~/projects/agentcrush-app ~/Documents/New\ project` briefly if any tooling expects the old path, then remove after verification.

**Gate:** Do this at a moment when you're NOT in the middle of a live debug session. Weekend morning is ideal.

**H2. Make /opt/agentcrush a git repo deployed predictably.** Medium task, 2-3 hours.

Currently VPS code can drift from source control. Fix:
- Initialize /opt/agentcrush as a git clone of the main repo (or a worker-specific subdirectory of it)
- Build a deploy script that: pulls latest, runs any migrations, restarts systemd units
- Document the deploy process in the repo's `docs/VPS_DEPLOYMENT.md`
- No more hand-editing on the VPS directly

**Gate:** Do this before Ajsa ships to production. Ajsa's ongoing maintenance will expose the drift problem if it's not fixed first.

**H3. Add dry-run / sandbox mode to all VPS workers.** Iterative, ~1 hour per worker.

Every worker (github-snapshot, news-fetch, weekly-ingest, eventually Ajsa) should support:
- `--dry-run` — compute everything, skip writes
- `--limit N` — process only N items instead of full set
- `--no-telegram` — suppress notifications
- `--no-write` — explicit flag to disable database writes

This lets Codex, Claude Code, and you test safely without touching production state. Worker refactoring doesn't need to happen all at once; add these flags to each worker as you touch it next.

**H4. Simple observability layer.** Small effort, big quality-of-life improvement.

Add a Supabase-backed status table and a simple Mission Control dashboard enhancement that shows:
- Last run time + status (success/fail) per worker
- Rows written last run
- Error count last 24h per worker
- Cost accumulated today (OpenAI/Anthropic API usage)
- Telegram messages sent today
- Next scheduled run per timer

Not fancy monitoring. Just visible truth. Ajsa should also report worker health as part of morning brief anomaly-flagging.

**H5. Separate secrets and runtime config properly.** Security hygiene, ~1 hour.

Audit current state:
- Find any service-role keys hardcoded in scripts
- Find any API keys in shell history or worker logs
- Standardize on one predictable `.env` file per runtime lane (Mac dev, Vercel production, VPS worker)

This prevents accidental leaks and makes it safer to share code with Claude Code / Codex for modifications.

**H6. Basic CI on GitHub Actions.** Small, 1-2 hours once.

Before bigger scaling: lint, build, and SQL migration sanity checks on every PR / push. Catches dumb mistakes before Vercel deploy or VPS pull. Don't over-engineer. Start with:
- `npm run lint`
- `npm run build`
- Migration file syntax check (migrations are raw SQL; simple syntax validator)

**H7. Tool upgrades — explicit not-now.** Keep these visible so they don't resurface too early.

- **Claude Max plan ($200/mo):** only after repeated credit bottlenecks that are blocking revenue-producing work consistently. Not because "a week was intense."
- **Mac Mini:** only if local dev becomes genuinely slow for real reasons. Mac Studio is overkill.
- **New external services / SaaS subscriptions:** default to "no" unless there's a specific need tied to an active bet.

### Review cadence

Review this section monthly during Strategy Day. Mark done items, adjust priorities. Most items should be done within 60 days.

### Success criteria

- Repo path migration completed
- No more "Claude Code cannot access file" errors from iCloud
- VPS drift eliminated — same code runs locally and in production
- Every worker has a `--dry-run` mode before it ships to production
- Mission Control shows worker health at a glance
- Zero hardcoded secrets in scripts
- CI blocks obviously broken commits

---

**End of addendum.**

Add this as Section 11 of the execution plan, after Section 10 (Handoff Notes). Update the table of contents accordingly.
