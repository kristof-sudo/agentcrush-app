# AgentCrush — Build Dashboard v15
**Date:** May 1, 2026
**Previous version:** v14 (Apr 30, Phase 14 complete)
**Sprint covered:** May 1 — Ajsa intelligence-layer fix, agent commerce stack docs, Claude workflow SOPs, tracked surfaces copy fix
**Authored by:** Claude Code / Kris session

---

## North Star (current public framing)

**AgentCrush is the protocol-neutral market intelligence layer for the agent economy.**

Short: **Market intelligence for the agent economy.**

Clarification: "trust" remains valid for product outputs (trust-summary endpoint, Trust Context panel, credibility signals). The restriction is on claiming AgentCrush *is* the protocol-level trust/reputation/identity layer. Say "tracks across," not "built on."

---

## Current State (end of sprint)

| Dimension | Status |
|---|---|
| Evidence-ranked agents | **39** (tier-promotion runs Sunday) |
| Total indexed agents | ~1,225 |
| x402 endpoints live | **3** — trust-summary ($0.02), history ($0.02), verification-status ($0.005) |
| CDP merchant discovery | **All 3 routes indexed** — output.example + pathParamsSchema confirmed on all three |
| Agentic.Market UI | **1 route surfaced** — verification-status visible; trust-summary and history in CDP but not yet surfaced in UI (platform behavior, not endpoint blocker) |
| MCP server | **Live** — POST /api/mcp JSON-RPC, 4 read-only tools, no auth, no payment |
| Developer docs hub | **Live** at `/developers` |
| Blog | **Live** at `/blog` — first post: x402 discovery post-mortem |
| ERC-8004 matched agents | **2** (agentlab, crewai) — Phase 1 complete |
| Agent Economy Index | **V0 live** at `/agent-economy-index` |
| Comparison pages | **V2 live** — profile compare links + 41 sitemap entries |
| Dependency graph evidence | **Collecting** — shadow only, no scoring impact |
| Docs-quality evidence | **Collecting** — shadow only, no scoring impact |
| Signal legend | **Live** on rankings/homepage (GH/PKG/DEP/DOC/HN/ECO/TRUST) |
| VPS workers active | github-snapshot, weekly-ingest, HN signal, npm/PyPI timer, tier-promotion, Ajsa, dep-graph, docs-quality |
| Ajsa daily brief | **Live — source diversity bug fixed May 1; observe next 2–3 briefs before adding more sources.** |
| AgentCrush Labs | **Backlog doc updated** — scope expanded to Agent Commerce Readiness Audit |
| Intelligence Backlog | **Active** — new entries May 1: Stripe/Visa/Kite acceleration, x402 builder indexing pain |
| Farcaster | Active via Neynar |

---

## Phase Ledger

### Phase 1 — Core Index (complete)
GitHub-only evidence ranking, manual agent ingestion, Supabase backend, basic profile pages, Next.js App Router.

### Phase 2 — x402 Commerce Layer (complete)
Live x402 seller on Base mainnet at `0x58e632Fa698383820FFC22156352C9836790E2c0`. Three endpoints: trust-summary, history, verification-status. First machine payment Apr 22. Bazaar/Agentic.Market listing confirmed live.

### Phase 3 — Signal Expansion (in progress)
npm/PyPI download timer active. HN mentions timer active. Reddit API approval pending. Dependency graph evidence collecting (shadow only). Docs-quality evidence collecting (shadow only). Neither replaces the current public ranking formula; both feed the next scoring hardening cycle.

### Phase 4 — Ajsa Intelligence Layer (complete — v1)
Daily 7:00 Budapest Telegram brief. Weekly Sunday review. 14 sources live. 12 HN queries live. 5 catalyst entries live. Cross-protocol watchlist seeded (Apr 27). Self-monitoring v1 shipped. Intelligence Backlog doc created for persistent signal memory.

### Phase 5 — Tiered Evidence Ranking (complete)
`agents.tier` + `agents.tier_promoted_at` columns. `agent_score_v2_top50_public_candidate` view. Sunday tier-promotion worker. EvidenceBadge / IndexedBadge / ScoreBreakdown UI. Rankings page filters to evidence_ranked only. Explore shows full index sorted evidence-first.

### Phase 6 — ERC-8004 Integration v1 (complete — Apr 26)
Reader prototype, first write sync, `agent_erc8004_registrations` table. 2 confirmed matches: agentlab (Ethereum, token #9634), crewai (Base, token #17997, x402_supported: true). Profile/API surfacing live. No scoring impact. RLS bug found and fixed same session.

### Phase 7 — Comparison Pages Scaffold v1 (complete — Apr 26)
Dynamic `/compare/[slug]` route. Slug parsing handles hyphenated handles. Both agents fetched in parallel (agents, rankings, v2 signals, 30d history, events, ERC-8004). SEO metadata with real display names. Guards: invalid slug → 404, same handle → 404.

### Phase 8 — x402 Discovery + Bazaar Visibility (complete — Apr 27)
`/.well-known/x402` and `/.well-known/x402.json` routes live. Bazaar `pathParamsSchema` fix. `output.example` added to all three `declareDiscoveryExtension` calls. CDP merchant discovery confirms AgentCrush indexed. Fresh paid settlement verified post-fix. verification-status confirmed visible on Agentic.Market.

**v14 update:** trust-summary and history are now also indexed in CDP merchant discovery. All 3 routes have output.example + pathParamsSchema. Agentic.Market UI surfaces 1 route (verification-status); trust-summary and history visible in CDP catalog but UI surfacing is platform-side behavior.

### Phase 9 — Homepage + Profile Consistency (complete — Apr 27)
Rising Now widget aligned with /rankings v2 evidence source/order. Agent profile Evidence Breakdown aligned with v2 fields (6 signals: GH/PKG/DEP/DOC/HN/ECO). Signal legend added to RankingTable header. HowCalculatedBar copy updated.

### Phase 10 — Comparison Pages v2 (complete — Apr 27)
Profile compare links: top 3 evidence-ranked comparison candidates added to agent profile pages. Sitemap: 41 bounded comparison URL entries.

### Phase 11 — Agent Economy Index V0 (complete — Apr 27)
`/agent-economy-index` live. Metrics: indexed agents, evidence-ranked, indexed-only, historical snapshots, ERC-8004 mapped, x402 endpoints. Top movers, recently indexed, tracked surfaces table, machine-readable section, disclaimer.

### Phase 12 — Labs + Intelligence Backlog Docs (complete — Apr 28)
`docs/AGENTCRUSH_LABS.md` created. `docs/INTELLIGENCE_BACKLOG.md` created. Cross-links added to EXECUTION_PLAN_SUPPLEMENT.md. First 5 intelligence entries captured.

### Phase 13 — MCP Server v0 + Homepage/Nav Polish (complete — Apr 28–30)
POST `/api/mcp` JSON-RPC endpoint live. GET `/api/mcp` manifest. 4 read-only tools: `lookup_agent`, `search_agents`, `compare_agents`, `get_history`. No auth, no payment. MCP docs at `/developers/mcp` with runnable curl examples and free/paid distinction. Developers link added to main navigation. Homepage copy updated for MCP v0 and machine-callable context. Rising Now table overflow/crop fixed. Public icon/favicon metadata cleaned.

Commits: f68b97c, f8f794d, b08b31b, 1ac39ff, 652da8d, 42a28c0, b1771ef, f7546e3, 575ec9b

### Phase 14 — Developer Docs Hub + Blog (complete — Apr 28–30)
`/developers` hub live — links MCP, API docs, x402 endpoints, Agent Economy Index, ranking methodology, badges, profiles, compare pages. Case study link to x402 post-mortem. Footer updated with Blog and Developers links. `/blog` index live. `/blog/x402-discovery-postmortem` live — accuracy-edited, published. Linked from `/developers`. Added to sitemap. Metadata and canonical URLs with `www` aligned across key pages. Supabase RLS migration for personal coaching tables (non-product tables, security hygiene).

Commits: 658ded5, e3b4188, 6170be6

### Phase 15 — Ajsa Source Diversity Fix (complete — May 1)

**Diagnostic (commit e0f5bf5):** `ajsa/ajsa-audit.mjs` added. Audit found Ajsa was structurally biased toward HN because:
- ingest worker defaulted to `--limit 5`, starving non-HN sources
- many configured sources were never fetched
- HN Algolia had no recency filter, so old stories recycled daily
- non-HN selector threshold was set too high to be reachable
- weak HN items were over-promoted as Investigate/Ship

**Fix (commit 96ae918):**
- ingest default changed from limit 5 to all active HTML sources
- HN Algolia now filtered to last 48h
- non-HN threshold added and made reachable
- HN cap logic updated
- weak HN items downgraded to Monitor
- stale AP2/x402 repetition should now be suppressed
- Bazaar warning remains updated/suppressed — CDP has all 3 routes indexed

**Status:** Observe next 2–3 daily briefs before drawing conclusions or adding more sources.

### May 1 — Agent Commerce Stack Docs + Workflow SOPs

- `docs/AP2_X402_TRACKING_BRIEF.md` expanded into a full **Agent Commerce Stack taxonomy** (commit 3b3e9d8 expands ec25f65). Covers Stripe Link agent wallet, x402, AP2, Kite Agent Passport, Visa stablecoin settlement on Base, MCP, ERC-8004, ERC-8183. Scope broadened from AP2 vs x402 comparison to full protocol-neutral taxonomy.
- `docs/AGENTCRUSH_LABS.md` updated to reflect broader **Agent Commerce Readiness Audit** scope (not x402-only).
- `docs/INTELLIGENCE_BACKLOG.md` updated with Stripe/Visa/Kite acceleration signal (Monitor) and x402 builder indexing pain + transaction-risk primitives signal (Monitor).
- `docs/CLAUDE_WORKFLOW_SKILLS.md` created (commit 17c18b0) — captures Mac/VPS/ChatGPT role split, task SOPs, stop conditions, public-post rules, Supabase migration rules.
- `/agent-economy-index` tracked surfaces copy clarified (commit f55475c): x402/Bazaar subtext updated to reflect 3 endpoints in CDP; A2A/MCP row renamed "External A2A / MCP activity" with note that AgentCrush MCP server is live.

---

## Sprint Commit Ledger — May 1

### Mac / main repo

| Commit | Description |
|---|---|
| ec25f65 | Add AP2 vs x402 tracking brief |
| 3b3e9d8 | Update agent commerce stack taxonomy (expanded from AP2 brief) |
| 17c18b0 | Add Claude workflow SOPs |
| f68cd8d | Add Moltbook agent-social strategy note |
| 4f087b5 | Add fc:miniapp embed metadata to agent profile pages and homepage |
| 63f40fe | Add x402 builder pain and risk primitive backlog note |
| f55475c | Clarify tracked surfaces status copy |

### VPS / Ajsa

| Commit | Description |
|---|---|
| e0f5bf5 | Add ajsa-audit.mjs diagnostic script |
| 96ae918 | Fix Ajsa source diversity: ingest limits, HN recency, non-HN thresholds |

---

## Website / Public Surfaces Status

| Surface | Status |
|---|---|
| `/rankings` | Live — v2 evidence, signal chips, legend |
| `/explore` | Live — full index, evidence-first sort |
| `/agent/[handle]` | Live — v2 evidence breakdown (6 signals), compare links, ERC-8004 panel |
| `/compare/[slug]` | Live — scaffold v1, profile links, 41 sitemap entries |
| `/agent-economy-index` | Live — V0, metrics, tracked surfaces (copy updated May 1), machine-readable section |
| `/developers` | Live — hub for MCP, API docs, x402, badges, profiles, compare, methodology |
| `/developers/mcp` | Live — MCP v0 docs with runnable curl, free/paid distinction |
| `/api-docs` | Live |
| `/blog` | Live — index page |
| `/blog/x402-discovery-postmortem` | Live — x402 discovery post-mortem, linked from /developers |
| `/how-we-rank` | Live — methodology, shadow signal caveat |
| `/how-it-works` | Live |
| `/for-agents` | Live |
| `/embed/[handle]` | Live — embeddable badge |
| `/labs` | Not built — Labs backlog doc exists, landing page not yet |
| Farcaster | Active via Neynar |

---

## Scoring / Evidence Status

| Signal | Status | Weight in ranking |
|---|---|---|
| GitHub (GH) | Active | Public ranking input |
| Package usage (PKG) | Active | Public ranking input |
| HN discourse (HN) | Active | Public ranking input |
| Ecosystem links (ECO) | Active | Public ranking input |
| Dependency graph (DEP) | Collecting — shadow only | Not yet in ranking |
| Docs quality (DOC) | Collecting — shadow only | Not yet in ranking |
| Trust / ERC-8004 (TRUST) | Active (informational) | Not in ranking formula |
| Reddit | Blocked — API approval pending | Not yet |

**Shadow signal live proofs:**
- Dependency graph: camel-ai/owl → camel-ai (confirmed write)
- Docs quality: swarms scored 97 (confirmed write)

**v2 canonical replacement:** deferred — need ≥8 clean Sunday tier-promotion runs before replacing legacy rank columns.

---

## Registry / Protocol Coverage

| Registry / Protocol | Status | Integration depth |
|---|---|---|
| Bazaar / CDP (x402) | **Live + confirmed** | 3 listed endpoints, all 3 in CDP discovery; Agentic.Market UI surfaces 1 (platform behavior) |
| ERC-8004 (Ethereum/Base) | v1 live | Reader + storage + profile/API surface; no scoring impact |
| MCP | **Server v0 live** | POST /api/mcp JSON-RPC; 4 read-only tools; no ingestion from external MCP registries |
| AP2 / FIDO | Monitoring | Full agent-commerce stack taxonomy captured (AP2_X402_TRACKING_BRIEF.md); not started |
| Fetch.ai Agentverse | Planned | Not started; next after Ajsa stabilizes |
| A2A (external) | Monitoring | External ingestion not started |
| Virtuals ACP / ERC-8183 | Monitoring | Monitoring ecosystem; coverage not started |
| Daydreams / OpenServ / Giza | Monitoring | Monitoring; no structured data source yet |
| SURF / onchain sources | Planned | On the roadmap |
| Bittensor | Planned | On the roadmap |

Hard rules (unchanged):
- Do not make ERC-8004 the exclusive identity source
- Do not let any registry state change scoring weights without explicit decision
- Do not write on-chain until v2 scoring confirmed stable (≥8 Sunday runs)
- Do not auto-ingest uncertain matches into public rankings

---

## Distribution Surfaces

| Surface | Status |
|---|---|
| Embeddable badge | Done |
| verification-status x402 endpoint | Done |
| Agentic.Market listing | Done — verification-status visible; all 3 in CDP discovery |
| Comparison pages (scaffold + profile links + sitemap) | Done |
| Agent Economy Index V0 | Done |
| MCP server v0 | Done — POST /api/mcp, 4 read-only tools |
| Developer docs hub | Done — /developers |
| Blog / x402 post-mortem | Done — /blog/x402-discovery-postmortem |
| Agentverse / Fetch listing | Not done |
| CLI | Not done — lower priority |
| Farcaster | Active (Neynar) |
| VS Code extension | Not done — lower priority |

---

## x402 / CDP Discovery State

| Route | Payment | CDP Discovery | Agentic.Market UI |
|---|---|---|---|
| verification-status | ✓ Live ($0.005) | ✓ Indexed | ✓ Surfaced |
| trust-summary | ✓ Live ($0.02) | ✓ Indexed | — Not surfaced (platform behavior) |
| history | ✓ Live ($0.02) | ✓ Indexed | — Not surfaced (platform behavior) |

**Branding:** Agentic.Market displays `www.agentcrush.xyz` with a generic icon. CDP merchant discovery does not expose merchant-level name/logo fields. This is likely a hostname fallback or missing merchant branding support on the platform side — not addressable from the endpoint configuration. No blocker for endpoint functionality.

**Lesson documented:** Debug CDP discovery directly before debugging the marketplace UI. Fresh paid settlement required after any metadata change to trigger re-indexing.

---

## AgentCrush Labs

Working backlog only — not actively promoted. Full detail in `docs/AGENTCRUSH_LABS.md`.

**Offers under consideration (not yet promoted) — scope expanded May 1:**
1. Agent Commerce Readiness Audit ($299–$1,000+) — now covers full agent-commerce stack (x402, AP2, Kite, MCP), not x402-only
2. x402 / machine-payable API implementation
3. Traditional-industry A2A readiness

**Rules:**
- Paid offers must never affect rankings
- Sponsored/referral/credit surfaces must be clearly labeled
- Labs must reuse AgentCrush infrastructure, not become a second product
- No more than 10–15% of weekly time unless revenue appears

**Activation gates:** Public case study now exists (x402 post-mortem). Other gates: inbound interest, Ajsa signal repeated 3×, or relevant API surface stable.

---

## Intelligence Backlog

Append-only log at `docs/INTELLIGENCE_BACKLOG.md`. Captures Ajsa signals that may become AgentCrush tasks. Full detail in that file.

**Current entries:**

| Date | Signal | Status |
|---|---|---|
| 2026-05-01 | x402 builder pain: indexing gaps and transaction-risk primitives | Monitor |
| 2026-05-01 | Stripe Link / Visa / Kite agent-commerce stack acceleration | Investigate |
| 2026-04-30 | AP2/FIDO vs x402 protocol taxonomy | Monitor — taxonomy captured |
| 2026-04-30 | AgentOracle | Monitor |
| 2026-04-29 | x402 ecosystem signals (Agentic.Market, CDP, x402scan) | Monitor |
| 2026-04-28 | AgentCash / no-API-key paid API access | Monitor |
| 2026-04-27/28 | Bazaar discovery output schema gotchas | Converted → post-mortem published |
| 2026-04-27 | DivigentAI / x402 wallet behavior metrics | Monitor |
| 2026-04-27 | Decixa / x402 directory probe methodology | Monitor |
| 2026-04-27 | Nexus A2A/MCP Show HN signal | Investigate |

---

## Active Blockers

| Blocker | Impact | Status |
|---|---|---|
| Reddit API approval pending | Reddit mention signal missing from scoring | Waiting |
| v2 scoring stability | Need ≥8 clean Sunday runs before ERC-8004 v3 writer or legacy rank replacement | Ongoing |
| Ajsa source diversity fix | Observe 2–3 briefs post-96ae918 before adding more sources | Monitoring |

*Resolved since v14:* Ajsa structural HN bias diagnosed and fixed (e0f5bf5, 96ae918). Tracked surfaces copy updated (f55475c).

---

## Infrastructure Health

| System | Status |
|---|---|
| Vercel deployment | Healthy |
| VPS (104.248.240.129) | All workers running via systemd |
| Supabase | Healthy — RLS migration applied for personal coaching tables |
| x402 seller wallet | Active — 0x58e632Fa698383820FFC22156352C9836790E2c0 |
| Farcaster (Neynar) | Active |
| Telegram approval gate | Active |
| Main repo path | `/Users/pk/projects/agentcrush-app` |
| Old path symlink | `/Users/pk/Documents/New project` → `/Users/pk/projects/agentcrush-app` |
| Claude execution SOPs | `docs/CLAUDE_WORKFLOW_SKILLS.md` |
| Ajsa audit script | `ajsa/ajsa-audit.mjs` — run after each brief observation window |

**Infrastructure backlog (H-series):**
| Item | Status |
|---|---|
| H1: repo move out of iCloud → `/Users/pk/projects/agentcrush-app` | Done — Apr 28 |
| H2: predictable VPS deploy | Not done — next infra task |
| H3: dry-run flags | Partially improved as workers are touched |
| CI | Not done |

---

## Next Actions (priority order)

1. **Observe Ajsa for 2–3 runs after source-diversity fix** — confirm non-HN sources appear; check brief quality before adding missing official sources (Stripe, Visa, Cloudflare, Google AP2, Kite)
2. **Share x402 post-mortem / execute Farcaster plan** — Farcaster, Discord, relevant x402/Coinbase/Bazaar channels
3. **Re-run `node ajsa/ajsa-audit.mjs`** after observation window — then decide whether to add missing official sources
4. **Evidence coverage expansion** — increase agents with evidence beyond ~39 by normalizing agent_sources / evidence events pipeline
5. **Agentverse / Fetch.ai exploration** — registry adapter; low effort to investigate; next after Ajsa stabilizes
6. **H2 predictable VPS deploy** — next infra task
7. **Let shadow evidence accumulate** — dep-graph and docs-quality signals collecting; do not wire into scoring until v2 stability confirmed (≥8 Sunday runs)

---

## Not Done (explicit list)

- CLI
- Agentverse / Fetch
- ERC-8004 scheduled sync
- ERC-8004 writer / attestations
- B2B API tier / enterprise pricing
- Labs landing page (`/labs`)
- H2 predictable VPS deploy
- Reddit signal
- v2 scoring canonical replacement (legacy rank columns)
- LLM verdict on comparison pages
- SURF integration
- Evaluator agent index
- Token

---

## Canonical docs for strategy chats

Use these files when starting a new strategy or build session. Always load the **latest dashboard only** — older dashboards (v11–v14) are historical snapshots and should not be used as current truth once v15 exists.

**Always load:**
- `docs/AGENTCRUSH_DASHBOARD_v15_05_01.md` — this file; current state
- `docs/STRATEGIC_BETS.md` — tracked strategic bets
- `docs/EXECUTION_PLAN_SUPPLEMENT.md` — Agent Economy Index, Labs, cross-protocol strategy
- `docs/INTELLIGENCE_BACKLOG.md` — ecosystem signals log
- `docs/AGENTCRUSH_LABS.md` — monetization backlog
- `docs/FARCASTER.md` — Farcaster strategy and status
- `docs/AP2_X402_TRACKING_BRIEF.md` — agent-commerce stack taxonomy
- `docs/CLAUDE_WORKFLOW_SKILLS.md` — Claude Code SOPs and role split

**Load for specific contexts:**
- `docs/runtime-map.md` — for VPS / Ajsa / worker discussions
- `docs/EXECUTION_PLAN_ADDENDUM_INFRASTRUCTURE.md` — for infrastructure work

---

**End of Dashboard v15**
**Next update:** After Ajsa observation window + next major sprint or Sunday tier-promotion run
