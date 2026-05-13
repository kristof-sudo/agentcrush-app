# AgentCrush Runtime

This folder is the GitHub-tracked source of truth for VPS worker code.

## Production runtime path
- /opt/agentcrush

## Rule
Do not treat direct edits in /opt/agentcrush as canonical except emergency fixes.
Normal workflow is:

task -> patch in repo -> commit -> deploy -> sync to /opt/agentcrush

## Workers in this folder

### bot-fetch-friendliness-scanner.mjs
Scans the website of each indexed agent for machine-discoverable surfaces:
`/.well-known/x402`, `/.well-known/agent-card.json`, `/.well-known/mcp.json`,
`/openapi.json` (or `.yaml`), and a permissive `/robots.txt`.

Writes per-agent results into `agents.bot_fetch_friendliness` (jsonb) and a
mirrored `agents.bot_fetch_friendliness_score` (smallint, 0..5).

**Display-only. Not a ranking signal.** Surfaces a "Machine-discoverable"
badge row on the agent profile.

Run:
```
# dry-run, no DB writes — print per-surface counts and top-scoring sample
node runtime/bot-fetch-friendliness-scanner.mjs --dry-run --limit 20

# single agent
node runtime/bot-fetch-friendliness-scanner.mjs --agent-handle some_agent

# full scan (production: weekly Sunday timer)
node runtime/bot-fetch-friendliness-scanner.mjs
```

Tuning flags: `--concurrency N` (default 10), `--timeout-ms N` (default 5000).

Scheduled by `ops/systemd/agentcrush-bot-fetch-friendliness.{service,timer}` —
weekly Sundays 04:00.

## Not versioned here
- .env files
- node_modules
- offset/cache/state runtime files
- other ephemeral machine-local data
