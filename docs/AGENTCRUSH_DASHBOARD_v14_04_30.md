# AgentCrush — Build Dashboard v14
**Date:** April 30, 2026
**Previous version:** v13 (Apr 28, Phase 12 complete)
**Sprint covered:** April 28–30 build sprint — MCP server v0, developer docs hub, blog + x402 post-mortem, homepage polish, metadata + RLS cleanup
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
| Ajsa daily brief | **Live** — cross-protocol watchlist seeded, self-monitoring v1 shipped |
| AgentCrush Labs | **Backlog doc created** — not yet actively promoted |
| Intelligence Backlog | **Active** — entries since v13: x402 ecosystem signals, AgentOracle, AP2/FIDO taxonomy |
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

### Intelligence Backlog — new entries since v13 (Apr 28–30)
x402 ecosystem signals captured (fdde50c). AgentOracle signal captured (800ba9c). AP2/FIDO taxonomy vs x402 distinguished and captured (e5ffa5f).

---

## Sprint Commit Ledger — April 28–30

### Mac / main repo

| Commit | Description |
|---|---|
| f68b97c | Fix public icon metadata |
| f8f794d | Add AgentCrush MCP server v0 |
| b08b31b | Clarify MCP developer documentation |
| 1ac39ff | Add developer docs hub |
| 652da8d | Add Developers link to main navigation |
| 42a28c0 | Update homepage machine-callable copy for MCP v0 |
| b1771ef | Update homepage developer and machine-callable copy |
| f7546e3 | Fix Rising Now table overflow |
| 575ec9b | Fix Rising Now table horizontal crop |
| 658ded5 | Align canonical metadata URLs |
| fdde50c | Update intelligence backlog with x402 ecosystem signals |
| 800ba9c | Add AgentOracle to intelligence backlog |
| e5ffa5f | Add AP2/FIDO and agent payment protocol signals to intelligence backlog |
| e3b4188 | Add RLS migration for personal coaching tables |
| 6170be6 | Publish x402 discovery postmortem |

### VPS / local (not in main repo)

No VPS changes this sprint.

---

## Website / Public Surfaces Status

| Surface | Status |
|---|---|
| `/rankings` | Live — v2 evidence, signal chips, legend |
| `/explore` | Live — full index, evidence-first sort |
| `/agent/[handle]` | Live — v2 evidence breakdown (6 signals), compare links, ERC-8004 panel |
| `/compare/[slug]` | Live — scaffold v1, profile links, 41 sitemap entries |
| `/agent-economy-index` | Live — V0, metrics, tracked surfaces, machine-readable section |
| `/developers` | **Live** — hub for MCP, API docs, x402, badges, profiles, compare, methodology |
| `/developers/mcp` | **Live** — MCP v0 docs with runnable curl, free/paid distinction |
| `/api-docs` | Live |
| `/blog` | **Live** — index page |
| `/blog/x402-discovery-postmortem` | **Live** — x402 discovery post-mortem, linked from /developers |
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
| Bazaar (x402 / Coinbase) | **Live + confirmed** | 3 listed endpoints, all 3 in CDP discovery; Agentic.Market UI surfaces 1 (platform behavior) |
| ERC-8004 (Ethereum/Base) | v1 live | Reader + storage + profile/API surface; no scoring impact |
| MCP | **Server v0 live** | POST /api/mcp JSON-RPC; 4 read-only tools; no ingestion from external MCP registries yet |
| AP2/FIDO | Monitoring | Protocol taxonomy captured in Intelligence Backlog; not started |
| Fetch.ai Agentverse | Planned | Not started |
| A2A | Monitoring | Protocol coverage in scope; full ingestion not started |
| Virtuals ACP / ERC-8183 | Monitoring | Monitoring ecosystem; coverage not started |
| Agentverse / Fetch | Monitoring | Registry planned; not yet ingesting |
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
| MCP server v0 | **Done** — POST /api/mcp, 4 read-only tools |
| Developer docs hub | **Done** — /developers |
| Blog / x402 post-mortem | **Done** — /blog/x402-discovery-postmortem |
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

**Offers under consideration (not yet promoted):**
1. Agent Commerce Readiness Audit ($299–$1,000+)
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

*Resolved since v13:* trust-summary and history now in CDP discovery (all 3 routes indexed).
*Resolved Apr 28:* H1 repo move out of iCloud (symlink at old path for compatibility).

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

**Infrastructure backlog (H-series):**
| Item | Status |
|---|---|
| H1: repo move out of iCloud → `/Users/pk/projects/agentcrush-app` | **Done — Apr 28** |
| H2: predictable VPS deploy | Not done — next infra task |
| H3: dry-run flags | Partially improved as workers are touched |
| CI | Not done |

---

## Next Actions (priority order)

1. **Share x402 post-mortem** — Farcaster, Discord, relevant x402/Coinbase/Bazaar channels
2. **Homepage visual polish** — any remaining items not yet confirmed in git (e.g. top mover nav/hero)
3. **Let shadow evidence accumulate** — dep-graph and docs-quality signals collecting; do not wire into scoring until v2 stability confirmed (≥8 Sunday runs)
4. **Agentverse / Fetch.ai exploration** — registry adapter; low effort to investigate
5. **H2 predictable VPS deploy** — next infra task
6. **Reddit signal** — follow up when API approval changes
7. **CLI** — lower priority; after MCP usage signal

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

**End of Dashboard v14**
**Next update:** After next major sprint or Sunday tier-promotion run
