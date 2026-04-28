# AgentCrush — Build Dashboard v13
**Date:** April 28, 2026
**Previous version:** v12 (Apr 26, Phase 7 complete)
**Sprint covered:** April 27–28 build sprint — x402 discovery fix, homepage/profile consistency, signal legend, Agent Economy Index, comparison v2, Labs + Intelligence Backlog docs
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
| Agentic.Market visibility | **Confirmed** — verification-status visible, CDP merchant discovery confirmed |
| ERC-8004 matched agents | **2** (agentlab, crewai) — Phase 1 complete |
| Bazaar discovery | **Fixed and confirmed** — output.example added, CDP discovery updated |
| Agent Economy Index | **V0 live** at `/agent-economy-index` |
| Comparison pages | **V2 live** — profile compare links + 41 sitemap entries |
| Dependency graph evidence | **Collecting** — shadow only, no scoring impact |
| Docs-quality evidence | **Collecting** — shadow only, no scoring impact |
| Homepage Rising Now | **Aligned** with /rankings v2 evidence source/order |
| Agent profile Evidence Breakdown | **Aligned** with v2 fields (6 signals) |
| Signal legend | **Live** on rankings/homepage (GH/PKG/DEP/DOC/HN/ECO/TRUST) |
| VPS workers active | github-snapshot, weekly-ingest, HN signal, npm/PyPI timer, tier-promotion, Ajsa, dep-graph, docs-quality |
| Ajsa daily brief | **Live** — cross-protocol watchlist seeded, self-monitoring v1 shipped |
| AgentCrush Labs | **Backlog doc created** — not yet actively promoted |
| Intelligence Backlog | **Created** — 5 initial entries, append-only |
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
`/.well-known/x402` and `/.well-known/x402.json` routes live. Bazaar `pathParamsSchema` fix. `output.example` added to all three `declareDiscoveryExtension` calls. CDP merchant discovery confirms AgentCrush indexed. Fresh paid settlement verified post-fix: `0x78bb8cdf7a1ce6c36c69a9a43a1b4db29a1c4213fdd3b482bba1fc8f683f2329`. verification-status confirmed visible on Agentic.Market. No stale $0.10 price. Lesson: `output.example` must always be passed; CDP entry only updates on new paid settlement.

**What is not yet a separate CDP resource entry:** trust-summary and history routes will appear in CDP discovery only after their own first paid settlements. No blocker — known state.

### Phase 9 — Homepage + Profile Consistency (complete — Apr 27)
Rising Now widget aligned with /rankings v2 evidence source/order (was using legacy `rankings` table). Agent profile Evidence Breakdown aligned with v2 fields (6 signals: GH/PKG/DEP/DOC/HN/ECO — was showing legacy 2-signal fallback). Signal legend added to RankingTable header (shared homepage + /rankings). HowCalculatedBar copy updated to reflect v2 signals with shadow-signal caveat. Chip hover titles use human-readable labels.

### Phase 10 — Comparison Pages v2 (complete — Apr 27)
Profile compare links: top 3 evidence-ranked comparison candidates added to agent profile pages. Sitemap: 41 bounded comparison URL entries (adjacent pairs + anchor pairs: crewai-vs-autogpt, langgraph-vs-crewai, langchainagents-vs-langgraph). Priority 0.6, changeFrequency: weekly.

### Phase 11 — Agent Economy Index V0 (complete — Apr 27)
`/agent-economy-index` live. Metrics: indexed agents, evidence-ranked, indexed-only, historical snapshots, ERC-8004 mapped, x402 endpoints. Top movers, recently indexed, tracked surfaces table, machine-readable section, disclaimer. `/for-agents` and API docs linked. Footer updated.

### Phase 12 — Labs + Intelligence Backlog Docs (complete — Apr 28)
`docs/AGENTCRUSH_LABS.md` created — working backlog for monetization and service experiments. `docs/INTELLIGENCE_BACKLOG.md` created — append-only operational log for Ajsa signals. Cross-links added to EXECUTION_PLAN_SUPPLEMENT.md. First 5 intelligence entries captured.

---

## Sprint Commit Ledger — April 27–28

### Mac / main repo

| Commit | Description |
|---|---|
| d79e1dc | fix(x402): fix bazaar discovery validation + add well-known routes |
| 4e15edd | Update About and Terms positioning copy |
| b16407e | fix(about): correct project start year to 2026 |
| 0567859 | Add Agent Economy Index page |
| ad1d5f8 | feat(home): align Rising Now widget with /rankings v2 evidence scoring |
| d979174 | Add comparison page links and sitemap entries |
| 088af6c | Align agent profile evidence breakdown with rankings |
| 65a401b | Clarify ranking signal legend and scoring copy |
| d1f145e | fix(x402): add output examples to all Bazaar discovery declarations |
| 2d6d612 | Add Labs and intelligence backlog docs |

### VPS / local (not in main repo)

| Commit | Description |
|---|---|
| abcef31 | Add Ajsa cross-protocol watchlist |
| 4756ee0 | Fix ajsa-seed-watchlist constraints |
| 0e62542 | dependency graph worker |
| 67817f3 | docs quality signal worker |
| 72fde9f | daily micro-ingestion timer |
| bd8e68f | Ajsa self-monitoring |
| 4281b52 | initial VPS snapshot |

---

## Website / Public Surfaces Status

| Surface | Status |
|---|---|
| `/rankings` | Live — v2 evidence, signal chips, legend |
| `/explore` | Live — full index, evidence-first sort |
| `/agent/[handle]` | Live — v2 evidence breakdown (6 signals), compare links, ERC-8004 panel |
| `/compare/[slug]` | Live — scaffold v1, profile links, 41 sitemap entries |
| `/agent-economy-index` | Live — V0, metrics, tracked surfaces, machine-readable section |
| `/how-we-rank` | Live — methodology, shadow signal caveat |
| `/how-it-works` | Live |
| `/for-agents` | Live |
| `/api-docs` | Live |
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
| Bazaar (x402 / Coinbase) | **Live + confirmed** | 3 listed endpoints, Agentic.Market visible, CDP discovery confirmed |
| ERC-8004 (Ethereum/Base) | v1 live | Reader + storage + profile/API surface; no scoring impact |
| Fetch.ai Agentverse | Planned | Not started |
| A2A / MCP | Monitoring | Protocol coverage in scope; full ingestion not started |
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
| Agentic.Market listing | Done — confirmed visible |
| Comparison pages (scaffold + profile links + sitemap) | Done |
| Agent Economy Index V0 | Done |
| MCP server v0 | **Not done — next serious distribution surface** |
| Agentverse / Fetch listing | Not done |
| CLI | Not done — lower priority |
| Farcaster | Active (Neynar) |
| VS Code extension | Not done — lower priority |

---

## AgentCrush Labs

Working backlog only — not actively promoted. Full detail in `docs/AGENTCRUSH_LABS.md`.

**Offers under consideration (not yet promoted):**
1. Agent Commerce Readiness Audit ($299–$1,000+)
2. x402 / machine-payable API implementation
3. Traditional-industry A2A readiness

**Future ideas (monitor only):**
- Offers / credits / referral layer for API providers
- AgentCash-style API discovery + payment intelligence

**Rules:**
- Paid offers must never affect rankings
- Sponsored/referral/credit surfaces must be clearly labeled
- Labs must reuse AgentCrush infrastructure, not become a second product
- No more than 10–15% of weekly time unless revenue appears

**Activation gates:** Public case study, inbound interest, Ajsa signal repeated 3×, or relevant API surface stable. None triggered yet.

---

## Intelligence Backlog

Append-only log at `docs/INTELLIGENCE_BACKLOG.md`. Captures Ajsa signals that may become AgentCrush tasks. Full detail in that file.

**Current entries:**

| Date | Signal | Status |
|---|---|---|
| 2026-04-28 | AgentCash / no-API-key paid API access | Monitor |
| 2026-04-27/28 | Bazaar discovery output schema gotchas | Converted to task (commits d79e1dc, d1f145e) |
| 2026-04-27 | DivigentAI / x402 wallet behavior metrics | Monitor |
| 2026-04-27 | Decixa / x402 directory probe methodology | Monitor |
| 2026-04-27 | Nexus A2A/MCP Show HN signal | Investigate |

---

## Active Blockers

| Blocker | Impact | Status |
|---|---|---|
| Reddit API approval pending | Reddit mention signal missing from scoring | Waiting |
| trust-summary / history not in CDP discovery | These routes not yet indexed by Bazaar | Needs paid settlement on each route |
| v2 scoring stability | Need ≥8 clean Sunday runs before ERC-8004 v3 writer or legacy rank replacement | Ongoing |

*Resolved since v12:* Bazaar indexing, comparison pages no sitemap/interlinking, homepage/profile scoring inconsistency, stale $0.10 price.
*Resolved Apr 28:* H1 repo move out of iCloud (symlink at old path for compatibility).

---

## Infrastructure Health

| System | Status |
|---|---|
| Vercel deployment | Healthy |
| VPS (104.248.240.129) | All workers running via systemd |
| Supabase | Healthy |
| x402 seller wallet | Active — 0x58e632Fa698383820FFC22156352C9836790E2c0 |
| Farcaster (Neynar) | Active |
| Telegram approval gate | Active |
| Main repo path | **`/Users/pk/projects/agentcrush-app`** — H1 complete (Apr 28) |
| Old path symlink | `/Users/pk/Documents/New project` → `/Users/pk/projects/agentcrush-app` |

**Infrastructure backlog (H-series):**
| Item | Status |
|---|---|
| H1: repo move out of iCloud → `/Users/pk/projects/agentcrush-app` | **Done — Apr 28** |
| H2: predictable VPS deploy | Not done — next infra task |
| H3: dry-run flags | Partially improved as workers are touched |
| CI | Not done |

---

## Next Actions (priority order)

1. **MCP server v0** — next serious distribution surface; enables agent-native discovery
3. **Agentverse / Fetch.ai exploration** — registry adapter; low effort to investigate
4. **Let shadow evidence accumulate** — dep-graph and docs-quality signals collecting; do not wire into scoring until v2 stability is confirmed (≥8 Sunday runs)
5. **Dashboard/source doc refresh** — after next major sprint
6. **Reddit signal** — follow up when API approval changes
7. **CLI** — lower priority; after MCP

---

## Not Done (explicit list)

- MCP server
- CLI
- Agentverse / Fetch
- ERC-8004 scheduled sync
- ERC-8004 writer / attestations
- B2B API tier / enterprise pricing
- Labs landing page (`/labs`)
- x402 post-mortem article
- H2 predictable VPS deploy
- Reddit signal
- v2 scoring canonical replacement (legacy rank columns)
- LLM verdict on comparison pages
- SURF integration
- Evaluator agent index
- Token

---

**End of Dashboard v13**
**Next update:** After Sunday tier-promotion run or next major deliverable
