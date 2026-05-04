# AgentCrush — Build Dashboard v15
**Date:** May 3, 2026
**Previous version:** v14 (Apr 30, Phase 14 complete)
**Sprint covered:** May 1–3 — Ajsa v1.1 fixes, Evidence Coverage Expansion sprint, GitHub mapping Batch 1
**Authored by:** Claude Code / Kris session

---

## May 4 Strategy Session Addendum

**Trigger:** Read of four ecosystem articles (Castle Labs agentic finance; Khala on OpenClaw, SURF, Bittensor, Robotics).

**Net-new build directions accepted:**
- `payment_rails_supported` agent profile field (1–2 day build) — surfaces protocol-neutral position
- `/category/autonomous-software-factories` page (1–2 day build) — coverage of OpenClaw ecosystem agents
- Builder-outreach agent (1–2 week build) — single autonomous loop, reuses Ajsa + Telegram substrate

**Net-new content directions accepted:**
- Blog post: "First cross-protocol agent" (CrewAI ERC-8004 + x402) — drafted this week
- Blog post: "State of Autonomous Software Factories — May 2026" — after Ajsa OpenClaw catalyst scan
- Free Agent Commerce Readiness Audit on CrewAI + 1 more agent → publish as case studies

**Net-new revenue path:**
- Goal: ONE paying Agent Commerce Readiness Audit customer by July 4, 2026
- Channels: Coinbase DevRel Discord, x402 Foundation, Daydreams, Virtuals, Farcaster /base /agents /coinbase
- Validates Bet C if hit; revisit channel mix if zero by ~September

**Reaffirmed (no change):**
- AgentCrush does NOT join OpenClaw ecosystem — protocol-neutral position holds
- No native token, no second SaaS, no VC money
- Distribution > internal build; stay the course on Farcaster cadence

**Strategic insight (worth keeping in mind):**
SURF is the closest comp for AgentCrush architecture (specialized data → MCP/Skills → agent consumption). They reached $3M ARR with no token. Their pricing tiers (Free / $9 / $29 / $299) are the calibration anchor for AgentCrush's eventual paid tier — Pro at ~$29/mo for "agent commerce intelligence + API access", not Max-equivalent.

---

## North Star (current public framing)

**AgentCrush is the protocol-neutral market intelligence layer for the agent economy.**

Short: **Market intelligence for the agent economy.**

Clarification: "trust" remains valid for product outputs (trust-summary endpoint, Trust Context panel, credibility signals). The restriction is on claiming AgentCrush *is* the protocol-level trust/reputation/identity layer. Say "tracks across," not "built on."

---

## Current State (end of sprint)

| Dimension | Status |
|---|---|
| Evidence-ranked agents | **51** (up from 39 at start of sprint — +12 via package backfill and GitHub mapping Batch 1) |
| Total indexed agents | ~1,197 |
| Agents with github_full_name | **87** (was 68 at start of sprint; +19 from Batch 1 apply) |
| x402 endpoints live | **3** — trust-summary ($0.02), history ($0.02), verification-status ($0.005) |
| CDP merchant discovery | **All 3 routes indexed** — output.example + pathParamsSchema confirmed on all three |
| Agentic.Market UI | **1 route surfaced** — verification-status visible; trust-summary and history in CDP but not surfaced in UI (platform behavior, not endpoint blocker) |
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
| Ajsa daily brief | **Live — v1.1 shipped May 1; source diversity materially improved; observe 2–3 more briefs before adding sources** |
| GitHub mapping candidates | **400 high-confidence pending**; Batch 1 of 25 reviewed and applied; 375 remaining |
| AgentCrush Labs | **Backlog doc updated** — scope expanded to full Agent Commerce Readiness Audit |
| Intelligence Backlog | **Active** — Stripe/Visa/Kite acceleration, x402 builder pain, ongoing |
| Farcaster | Active via Neynar — Ajsa selected Farcaster signal May 3 (source diversity confirmed working) |

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

### Phase 15 — Ajsa v1.1 + Agent Commerce Stack Docs (complete — May 1)

**Ajsa v1.1 — source diversity fix:**
- Source audit diagnostic added to VPS
- Ingest default changed from `--limit 5` to all active HTML sources
- HN Algolia now filtered to last 48h (prevents stale story recycling)
- Non-HN selector threshold added and made reachable
- Weak HN items downgraded to Monitor
- Stale AP2/x402 Bazaar warning removed/updated
- Coinbase changelog extraction fixed: extracts dated entries, strips page chrome, suppresses unchanged changelog via cursor_state
- May 3: Ajsa selected Farcaster signal — confirms source diversity materially improved

**Agent commerce stack docs:**
- `docs/AP2_X402_TRACKING_BRIEF.md` expanded into full Agent Commerce Stack taxonomy — covers Stripe Link, x402, AP2, Kite Agent Passport, Visa stablecoin settlement, MCP, ERC-8004, ERC-8183
- `docs/AGENTCRUSH_LABS.md` updated: scope expanded to full Agent Commerce Readiness Audit (not x402-only)
- `docs/INTELLIGENCE_BACKLOG.md` updated: Stripe/Visa/Kite acceleration signal, x402 builder indexing pain
- `docs/CLAUDE_WORKFLOW_SKILLS.md` created (commit 17c18b0): Mac/VPS/ChatGPT role split, task SOPs, stop conditions, public-post rules, Supabase migration rules
- `/agent-economy-index` tracked surfaces copy updated (commit f55475c): x402/Bazaar subtext accurate, A2A/MCP row renamed to "External A2A / MCP activity"

Commits: ec25f65, 3b3e9d8, 17c18b0, f55475c, 63f40fe

### Phase 16 — Evidence Coverage Expansion Sprint (complete — Batch 1, May 2–3)

**Coverage audit:**
- Only ~65 agents had `github_full_name` at sprint start; evidence ranking was GitHub-limited
- VPS website evidence probe checked 635 agents with `website_url` and no `github_full_name`
- 578 reachable; 487 GitHub repo candidates exported
- 400 high-confidence, 87 medium-confidence

**Review workflow created (commit e3d916c):**
- Migration: `supabase/migrations/20260502_1000_create_agent_github_mapping_candidates.sql`
- Table: `agent_github_mapping_candidates` — review queue with status labels (pending / approved / rejected / needs_more_info / superseded / applied)
- Scripts:
  - `scripts/import-github-mapping-candidates.mjs` — imports probe JSON; dry-run by default; preserves reviewed rows on re-import
  - `scripts/list-github-mapping-candidates.mjs` — read-only candidate listing (bugfix commit 541bbc8)
  - `scripts/apply-approved-github-mappings.mjs` — applies approved rows to `agents.github_full_name`; never overwrites existing value; dry-run by default
- Docs: `docs/GITHUB_MAPPING_REVIEW_WORKFLOW.md`
- Table applied to Supabase manually by Kris

**Import:**
- 400 high-confidence candidates imported as `pending` (medium-confidence not imported yet)
- `agents.github_full_name` not modified at import time

**Batch 1 review (25 candidates):**
- 19 approved and applied
- 1 rejected: `agent-infra/sandbox` (tool repo, not agent product)
- 5 needs_more_info: openclawchinesetranslation (translation fork?), aliyun/ vs agentbay-ai/ (competing Alibaba orgs), agentseal/ vs getagentseal/ (competing org names)

**Results:**
- `agents.github_full_name`: 68 → 87 (+19)
- Evidence pipeline run for newly anchored agents
- tier-promotion cycle run: evidence_ranked 43 → 51 (+8)

**Batch 1 promotions:**

| Promoted handle | GitHub repo applied |
|---|---|
| agentscope_ai_agentscope | agentscope-ai/agentscope |
| agent_sh_agentsys | agent-sh/agentsys |
| agentscope_ai_openjudge | agentscope-ai/openjudge |
| adoslabsproject_gif_nothumanallowed | adoslabsproject-gif/nothumanallowed |
| 0xranx_golembot | 0xranx/golembot |
| aayoawoyemi_ori_mnemos | aayoawoyemi/ori-mnemos |
| 4ier_neo | 4ier/neo |
| acodercat_cave_agent | acodercat/cave-agent |

13 Batch 1 applied agents did not reach promotion threshold in this cycle — evidence data still accumulating.

---

## Sprint Commit Ledger — May 1–3

### Mac / main repo

| Commit | Description |
|---|---|
| ec25f65 | Add AP2 vs x402 tracking brief |
| 3b3e9d8 | Update agent commerce stack taxonomy |
| 17c18b0 | Add Claude workflow SOPs |
| f55475c | Clarify tracked surfaces status copy |
| 63f40fe | Add x402 builder pain and risk primitive backlog note |
| e3d916c | Add GitHub mapping candidate review workflow |
| 541bbc8 | Fix list-github-mapping-candidates confidence tier filter |

### VPS / Ajsa (not in main repo)

| Change | Description |
|---|---|
| Ajsa ingest limit fix | ingest default no longer capped at --limit 5 |
| HN recency filter | HN Algolia filtered to last 48h |
| Non-HN threshold | threshold added and made reachable |
| Coinbase changelog fix | extracts dated entries; suppresses via cursor_state |
| evidence probe | website probe run: 635 checked, 487 candidates exported |
| tier-promotion | run after Batch 1 apply: 43 → 51 evidence_ranked |

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

**No scoring weight changes in this sprint.**

---

## Registry / Protocol Coverage

| Registry / Protocol | Status | Integration depth |
|---|---|---|
| Bazaar / CDP (x402) | **Live + confirmed** | 3 listed endpoints, all 3 in CDP discovery; Agentic.Market UI surfaces 1 (platform behavior) |
| ERC-8004 (Ethereum/Base) | v1 live | Reader + storage + profile/API surface; no scoring impact |
| MCP | **Server v0 live** | POST /api/mcp JSON-RPC; 4 read-only tools; no ingestion from external MCP registries |
| AP2 / FIDO | Monitoring | Full agent-commerce stack taxonomy captured; not started |
| Fetch.ai Agentverse | Planned | Not started; next after evidence batch work and Ajsa stabilises |
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

**Branding:** Agentic.Market displays `www.agentcrush.xyz` with a generic icon. CDP merchant discovery does not expose merchant-level name/logo fields — likely a hostname fallback or missing merchant branding support on the platform side. Not addressable from endpoint configuration. No blocker for functionality.

**Lesson documented:** Debug CDP discovery directly before debugging the marketplace UI. Fresh paid settlement required after any metadata change to trigger re-indexing.

---

## GitHub Mapping Review Workflow

**Table:** `agent_github_mapping_candidates` — applied to Supabase May 2.

**Current state:**

| Status | Count |
|---|---|
| applied | 19 |
| rejected | 1 |
| needs_more_info | 5 |
| pending (high-confidence) | 375 |
| medium-confidence (not yet imported) | 87 |

**Review rules:**
- Never auto-apply probe output to `agents.github_full_name`
- Always dry-run `apply-approved-github-mappings.mjs` before `--write`
- Never overwrite existing `github_full_name` (enforced by apply script)
- Batch size: 25 per session
- After each batch apply: run evidence pipeline, then tier-promotion dry-run before promoting

**needs_more_info (5) — resolution pending:**
- `1186258278/openclawchinesetranslation` — verify if this is the primary agent or a translation fork
- `aliyun/wuying-agentbay-sdk` vs `agentbay-ai/wuying-agentbay-sdk` — verify which org is canonical
- `agentseal/agentseal` vs `getagentseal/agentseal` — verify which org has active commits

---

## AgentCrush Labs

Working backlog only — not actively promoted. Full detail in `docs/AGENTCRUSH_LABS.md`.

**Offers under consideration (not yet promoted):**
1. Agent Commerce Readiness Audit ($299–$1,000+) — covers full agent-commerce stack (x402, AP2, Kite, MCP), not x402-only
2. x402 / machine-payable API implementation
3. Traditional-industry A2A readiness

**Rules:**
- Paid offers must never affect rankings
- Sponsored/referral/credit surfaces must be clearly labeled
- Labs must reuse AgentCrush infrastructure, not become a second product
- No more than 10–15% of weekly time unless revenue appears

**Activation gates:** Public case study exists (x402 post-mortem). Other gates: inbound interest, Ajsa signal repeated 3×, relevant API surface stable.

---

## Intelligence Backlog

Append-only log at `docs/INTELLIGENCE_BACKLOG.md`. Captures Ajsa signals that may become AgentCrush tasks.

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
| Ajsa source diversity | Observe 2–3 more briefs after v1.1 fix before adding new sources | Monitoring |
| GitHub mapping needs_more_info (5) | 5 candidates unresolved; competing org candidates for agentbay, agentseal | Pending manual check |

*Resolved since v14:* Ajsa structural HN bias diagnosed and fixed. Tracked surfaces copy updated. GitHub mapping workflow created, Batch 1 applied, 8 new promotions.

---

## Infrastructure Health

| System | Status |
|---|---|
| Vercel deployment | Healthy |
| VPS (104.248.240.129) | All workers running via systemd |
| Supabase | Healthy — `agent_github_mapping_candidates` table applied May 2 |
| x402 seller wallet | Active — 0x58e632Fa698383820FFC22156352C9836790E2c0 |
| Farcaster (Neynar) | Active |
| Telegram approval gate | Active |
| Main repo path | `/Users/pk/projects/agentcrush-app` |
| Old path symlink | `/Users/pk/Documents/New project` → `/Users/pk/projects/agentcrush-app` |
| Claude execution SOPs | `docs/CLAUDE_WORKFLOW_SKILLS.md` |
| GitHub mapping audit script | `scripts/apply-approved-github-mappings.mjs` + VPS evidence probe |

**Infrastructure backlog (H-series):**
| Item | Status |
|---|---|
| H1: repo move out of iCloud | Done — Apr 28 |
| H2: predictable VPS deploy | Not done — next infra task; VPS-only scripts (Ajsa audit, evidence probe) need a safe deploy path |
| H3: dry-run flags | Partially improved as workers are touched |
| CI | Not done |

---

## Not Done (explicit list)

- Batch 2 GitHub mapping review (25 candidates — next priority)
- Medium-confidence candidates (87) — not yet imported or reviewed
- needs_more_info resolution (5 rows) — agentbay and agentseal competing orgs
- Full evidence normalization (agent_sources / agent_evidence_events tables not created)
- x402 / MCP signal ingestion tables not created
- partial_evidence tier not created
- Agentverse / Fetch exploration
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
- VPS-only diagnostic scripts not yet synced to main repo
- Token
- CLI
- `payment_rails_supported` field on agent profiles
- `/category/autonomous-software-factories` page
- Builder-outreach agent (single-purpose autonomous loop)
- ERC-8183 reader adapter
- Tempo/MPP signal source in Ajsa
- Free Agent Commerce Readiness Audit case studies (2 targets: CrewAI + TBD)
- Cross-protocol follow-up blog post
- "State of Autonomous Software Factories" blog post
- First paying Labs audit customer

---

## Next Actions (priority order)

1. **GitHub mapping Batch 2** — list next 25 pending high-confidence candidates, prepare enriched review table, review manually
2. **Apply approved Batch 2 mappings** — only after manual review; run dry-run first
3. **Run evidence pipeline for Batch 2** — GitHub snapshot, docs-quality, package-discovery, package-download; then tier-promotion dry-run before promoting
4. **Observe Ajsa v1.1 for 2–3 more briefs** — confirm non-HN sources appear consistently; Farcaster confirmed May 3
5. **Re-run Ajsa audit** after live runs — then decide whether to add missing official sources (Stripe, Visa, Cloudflare, Google AP2, Kite)
6. **H2 predictable VPS deploy** — needed to safely sync VPS-only scripts (Ajsa audit, evidence probe) into main repo workflow
7. **Agentverse / Fetch.ai exploration** — registry adapter; after evidence Batch 2 and Ajsa observation
8. **Do not change scoring weights** — evidence data for new anchors still accumulating; wait for ≥2 promotion cycles
9. **Update Labs audit scope** (this session) — full agent-commerce stack coverage in Offer 1
10. **Free audit case studies** — CrewAI + 1 more, ship as `/blog` posts within 2 weeks
11. **Cross-protocol follow-up blog post** — CrewAI ERC-8004 + x402 worked example, this week
12. **`payment_rails_supported` field build** — after Batch 2 + tier-promotion completes
13. **`/category/autonomous-software-factories` page build** — after Batch 2 + tier-promotion completes
14. **Builder-outreach agent build** — 1–2 week build, after the two field/page builds above
15. **Public audit pitch** — once 2 case studies are live, pitch in DevRel/Foundation/community channels

---

## Canonical docs for strategy chats

Use these files when starting a new strategy or build session. Always load the **latest dashboard only** — older dashboards (v11–v14, v15 May 1) are historical snapshots and should not be used as current truth once this file exists.

**Always load:**
- `docs/AGENTCRUSH_DASHBOARD_v15_05_03.md` — this file; current state
- `docs/STRATEGIC_BETS.md` — tracked strategic bets
- `docs/EXECUTION_PLAN_SUPPLEMENT.md` — Agent Economy Index, Labs, cross-protocol strategy
- `docs/INTELLIGENCE_BACKLOG.md` — ecosystem signals log
- `docs/AGENTCRUSH_LABS.md` — monetization backlog
- `docs/FARCASTER.md` — Farcaster strategy and status
- `docs/AP2_X402_TRACKING_BRIEF.md` — agent-commerce stack taxonomy
- `docs/CLAUDE_WORKFLOW_SKILLS.md` — Claude Code SOPs and role split
- `docs/GITHUB_MAPPING_REVIEW_WORKFLOW.md` — GitHub mapping review process and current batch state

**Load for specific contexts:**
- `docs/runtime-map.md` — for VPS / Ajsa / worker discussions

---

**End of Dashboard v15**
**Next update:** After GitHub mapping Batch 2 or next major sprint
