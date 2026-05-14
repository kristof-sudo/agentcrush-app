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

## erc8004-registry-sync.mjs

Daily on-chain sync of the ERC-8004 IdentityRegistry on Base mainnet
(proxy `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`). Enumerates token IDs
via `Transfer(from=address(0))` mint logs, then calls `ownerOf(uint256)` and
`tokenURI(uint256)` for each, fetches the off-chain metadata JSON, and
upserts into `erc8004_registry`. `registered_at` is set on insert,
`last_seen_at` bumps every run, and a sha256 `metadata_hash` over the
canonical JSON gives cheap change detection. Idempotent; rate-limited to
50 reads/sec.

Dry-run:
```
node runtime/erc8004-registry-sync.mjs --dry-run --max 50
```

Flags: `--dry-run | --write`, `--max N`, `--rpc URL`, `--from-block N`,
`--window N`, `--skip-metadata`.

Table `erc8004_registry` columns: `token_id` (PK), `owner_address`,
`metadata_uri`, `agent_name`, `endpoints` (jsonb), `x402_supported`,
`metadata_hash`, `chain`, `registered_at`, `last_seen_at`. Powers
"new registrations this week" reporting and protocol-level discovery.

Scheduled by `ops/systemd/agentcrush-erc8004-registry-sync.{service,timer}`
— daily 06:00 Budapest.

## agentverse-agents-adapter.mjs

Read-only daily mirror of the Agentverse (Fetch.ai) public agent index.
Fetches `POST https://agentverse.ai/v1/search/agents` (unauthenticated; an
optional `AGENTVERSE_API_KEY` env var is supported but not required for the
public listing), paginates at 100/page with a 1s delay between pages,
normalizes each agent, and upserts into `agentverse_agents` keyed by
`agentverse_id` (the bech32 address). `last_seen_at` bumps every run;
`raw_payload` + sha256 `payload_hash` give cheap change detection.

**Read-only. Not a ranking signal.** Source table only.

Run:
```
# dry-run, no DB writes
node runtime/agentverse-agents-adapter.mjs --dry-run --limit-pages 3

# capped
node runtime/agentverse-agents-adapter.mjs --dry-run --max 500

# full sync (production: daily 05:30 Budapest)
node runtime/agentverse-agents-adapter.mjs --write
```

Flags: `--dry-run | --write`, `--max N`, `--limit-pages N`.

Table `agentverse_agents` columns: `agentverse_id` (PK, bech32 address),
`name`, `description`, `category`, `address`, `endpoint_url`, `is_active`,
`status` (composite: "responsive" / "unresponsive" / "inactive"),
`protocols` (jsonb), `runtime` ("hosted" | "local" | "mailbox" | "proxy" |
"custom"), `interactions_count`, `rating`, `uptime_pct`, `tags`,
`raw_payload`, `payload_hash`, `first_seen_at`, `last_seen_at`,
`created_at`, `updated_at`.

Scheduled by `ops/systemd/agentcrush-agentverse-agents-sync.{service,timer}`
— daily 05:30 Budapest.

## virtuals-agents-adapter.mjs

Read-only mirror of the public Virtuals Protocol agent index
(`https://api.virtuals.io/api/virtuals`) into the `virtuals_agents` table.
One row per Virtuals numeric id (~40k as of 2026-05).

Dry-run:
```
node runtime/virtuals-agents-adapter.mjs --dry-run --limit-pages 2
```

Production write:
```
node runtime/virtuals-agents-adapter.mjs --write
```

Flags: `--dry-run | --write`, `--max N`, `--limit-pages N`. Paginated at
100 items/page with a 1s delay between pages. Idempotent: PK is
`virtuals_id`, re-runs bump `last_seen_at` and overwrite normalized
columns; `payload_hash` (sha256 of canonical raw payload) supports change
detection.

Table `virtuals_agents` columns include: `virtuals_id` (PK), `name`,
`ticker`, `description`, `token_address`, `chain` (default `base`),
`status`, market metrics denominated in VIRTUAL token
(`market_cap_virtual`, `fdv_virtual`, `tvl_virtual`, `token_price_virtual`)
and in USD (`liquidity_usd`, `volume_24h_usd`), `holders`,
`top10_holder_pct`, `price_change_pct_24h`, `category`, `archetype`
(from `role`), `image_url`, `website_url`, `twitter_url`, plus
`raw_payload` (jsonb) and `first_seen_at` / `last_seen_at`.

No scoring impact. Surfaces Virtuals-ecosystem agent tokens alongside the
rest of the discovery index.

Scheduled by `ops/systemd/agentcrush-virtuals-agents-sync.{service,timer}`
— daily 05:00 Budapest.

## Not versioned here
- .env files
- node_modules
- offset/cache/state runtime files
- other ephemeral machine-local data
