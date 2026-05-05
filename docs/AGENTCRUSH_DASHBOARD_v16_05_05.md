# AgentCrush — Build Dashboard v16
**Date:** May 5, 2026
**Previous version:** v15 (May 3, 2026)
**Sprint covered:** May 4–5 — GitHub mapping Batch 2, Evidence Pipeline Batch 2, Ajsa v1.2
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
| Evidence-ranked agents | **67** (arc: 39 → 43 after package backfill → 51 after Batch 1 → 67 after Batch 2 pipeline) |
| Total indexed agents | **1,196** |
| Agents with github_full_name | **148** (was 87 after Batch 1; Batch 2 apply → 133; daily ingest → 148) |
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
| Ajsa daily brief | **Live — v1.2 shipped May 5; brief quality materially improved; observe 2–3 live briefs before adding sources** |
| GitHub mapping candidates | **325 high-confidence pending**; Batch 1 (25) + Batch 2 (50) reviewed and applied; 87 medium-confidence not yet imported |
| AgentCrush Labs | **Backlog doc active** — scope expanded to full Agent Commerce Readiness Audit incl. Experian/Visa trust layer |
| Intelligence Backlog | **Active** — Fetch.ai uAgents, AI inference aggregators, Experian Agent Trust/KYA added May 4–5 |
| Farcaster | Active via Neynar — launch day May 4; 3-cast thread posted; Share Cards verified working |

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
- `docs/INTELLIGENCE_BACKLOG.md` updated: Stripe/Visa/Kite acceleration signal, x402 builder pain
- `docs/CLAUDE_WORKFLOW_SKILLS.md` created (commit 17c18b0): Mac/VPS/ChatGPT role split, task SOPs, stop conditions, public-post rules, Supabase migration rules
- `/agent-economy-index` tracked surfaces copy updated (commit f55475c): x402/Bazaar subtext accurate, A2A/MCP row renamed to "External A2A / MCP activity"

Commits: ec25f65, 3b3e9d8, 17c18b0, f55475c, 63f40fe

### Phase 16 — Evidence Coverage Expansion Sprint (complete — Batch 1 + Batch 2, May 2–5)

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

**Batch 1 review (25 candidates, May 2–3):**
- 19 approved and applied
- 1 rejected: `agent-infra/sandbox` (tool repo, not agent product)
- 5 needs_more_info: openclawchinesetranslation, aliyun/ vs agentbay-ai/ (competing Alibaba orgs), agentseal/ vs getagentseal/ (competing org names)
- `agents.github_full_name`: 68 → 87 (+19)
- tier-promotion: 43 → 51 (+8)

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

**Batch 2 review (50 candidates, May 4–5):**
- 46 approved and applied
- 2 rejected:
  - `aiming-lab/metaclaw.` — trailing period parse artifact from probe; clean repo `aiming-lab/metaclaw` approved separately
  - `alexanys/awesome-openclaw-usecases-zh` — awesome-list / use-cases collection, not an agent product
- 2 needs_more_info:
  - `agi-inc/agent-protocol` and `ai-engineer-foundation/agent-protocol` — canonical repo unclear after reported transfer/move
- `agents.github_full_name`: 87 → 133 from Batch 2 apply; daily ingest brought count to 148

**Batch 2 evidence pipeline (run May 4–5):**

Pipeline ran for all indexed agents with `github_full_name` (148 agents — no `github_full_name_set_at` timestamp available to isolate Batch 2 subset):

- GitHub snapshot worker: 148 scanned, 148 snapshots inserted, 0 failed
- Docs-quality worker: 148 checked/upserted, average score 70.8
- Package-discovery: 81 rows written
- 16 new HIGH_AUTO mappings from newly-evidenced set
- Package-download: 16 new missing download rows
- Tier-promotion dry-run: 16 candidates found
- Tier-promotion write: all 16 promoted

**Batch 2 promotions:**

| Promoted handle |
|---|
| browser_use_browser_use |
| assafelovic_gpt_researcher |
| gitlawb_openclaude |
| kyegomez_swarms |
| callstackincubator_agent_device |
| jackchen_me_open_multi_agent |
| artificialanalysis_stirrup |
| nocobase_nocobase |
| mnfst_manifest |
| alex8791_cyber_cognithor |
| bubbuild_bub |
| yizhiyanhua_ai_fireworks_tech_graph |
| aimclub_osa |
| banteg_takopi |
| airutorg_airut |
| builderio_micro_agent |

Post-write dry-run clean — 0 remaining candidates. 0 dropped warnings.

**Evidence-ranked arc:**
39 → 43 (package backfill) → 51 (Batch 1) → 67 (Batch 2 pipeline)

**Important — no schema changes during this sprint:**
- No scoring changes
- No tier-promotion logic changes
- No `github_full_name` changes during tier-promotion (only during apply step)

### Phase 17 — Ajsa v1.2 (complete — May 5)

**Files changed (VPS only):**
- `/opt/agentcrush/ajsa/ajsa-select-brief-worker.mjs`
- `/opt/agentcrush/ajsa/ajsa-daily-brief-worker.mjs`

No schema changes. No source list changes. Telegram not sent during tests.

**Behavior changes:**

- **Fix 1 — Support 0–3 selected signals.** `allowBelowCutoff` fallback removed entirely. If no signal clears the threshold, `selected = []`. Previously, if nothing passed, the greedy loop forced the top-ranked item through regardless of score. May 5 dry-run result: 0/21 selected — correct; brief will output "Today's useful signals are limited. No build-worthy action."

- **Fix 2 — Farcaster 72h age gate + 14-day URL/hash dedupe.** `FC_MAX_AGE_HOURS = 72`: any Farcaster cast older than 72h rejected. `FC_DEDUPE_DAYS = 14`: on startup, builds `recentFarcasterUrls` and `recentFarcasterHashes` sets from the past 14 days in `ajsa_brief_items`. Previously a cast from March 27, 2026 (931h old) was selected; it is now correctly rejected.

- **Fix 3 — Source-specific action templates.** `suggestedAction()` now varies by cluster: Farcaster x402 builder → index/inspect/log as Labs lead; Farcaster ACP/marketplace → identify/check/log as marketplace evidence; Farcaster low engagement → monitor only; protocol changelog → check if docs/API surface needs update; Product Hunt / YC → check if project should be indexed.

- **Fix 4 — Signal-specific whyItMatters text.** `whyItMatters()` now depends on actual source/signal cluster rather than static generic text.

- **Fix 5 — Theme labeling fixed.** x402 theme scoring skipped for community sources (Farcaster). ACP/marketplace signals now produce theme `marketplace adoption`. x402 label only fires on non-community items containing x402 keywords.

- **Fix 6 — Debug/audit output.** Dry-run output now includes selected_count, source, candidate age, per-item rejection reason (below selector threshold / Farcaster cast too old / Farcaster 14d dedupe), and top 5 rejected items sorted by score descending.

**May 5 simulation result:**
- selected_count = 0 / 21 candidates
- All candidates below threshold or rejected by age gate
- Top rejected: `sel=38` item at threshold=38 (edge case — exclusive comparison; see follow-up below)

**Follow-up required:** Check whether threshold comparison should be inclusive (`>=`) or exclusive (`>`). Currently `sel=38` at `cutoff=38` is rejected with reason "below selector threshold (38<38)." Decide: is the cutoff inclusive or exclusive? One-character fix if inclusive is intended.

**Current status:** Ajsa v1.2 is structurally improved. Observe next 2–3 live briefs before adding sources.

---

## Sprint Commit Ledger — May 4–5

### Mac / main repo

| Commit | Description |
|---|---|
| bc76142 | docs: May 4 strategy session — Labs audit scope, intelligence signals, Farcaster content backlog |
| 68564d6 | docs: revert date suffix on living docs (LABS, INTELLIGENCE_BACKLOG) |
| 141aa1c | docs: add Fetch.ai uAgents, inference aggregators to intelligence backlog; add skill-surface methodology topic |
| a85eafe | docs: Experian Agent Trust / KYA — intelligence backlog, Labs audit scope, Farcaster methodology |
| 622d302 | FARCASTER.md: log launch day, add Evidence Check loop, card schemas, Neynar AI rules, post backlog updates |

### VPS / Ajsa (not in main repo)

| Change | Description |
|---|---|
| ajsa-select-brief-worker.mjs | allowBelowCutoff removed; 72h FC age gate; 14d dedupe; debug output |
| ajsa-daily-brief-worker.mjs | Source-specific suggestedAction(), whyItMatters(), inferTheme() fix |
| evidence pipeline | github-snapshot (148), docs-quality (148), package-discovery (81), package-download (16), tier-promotion (16 promoted) |

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
| Farcaster | Active via Neynar — launched May 4; 3-cast thread live; Share Cards verified |

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
- Docs quality: swarms scored 97 (confirmed write); Batch 2 pipeline average doc score 70.8 across 148 agents

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
| Fetch.ai Agentverse / uAgents | Investigate | uAgents payment protocol flagged May 4; read Innovation Lab docs within 2 weeks |
| A2A (external) | Monitoring | External ingestion not started |
| Virtuals ACP / ERC-8183 | Monitoring | Monitoring ecosystem; coverage not started |
| Daydreams / OpenServ / Giza | Monitoring | Monitoring; no structured data source yet |
| Experian Agent Trust / Visa TAP / Skyfire | Investigate | TradFi-side KYA layer launched Apr 30; probe endpoint exposure; identifier format TBD |
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
| Farcaster | Active (Neynar) — launched May 4 |
| Agentverse / Fetch listing | Not done |
| CLI | Not done — lower priority |
| VS Code extension | Not done — lower priority |

---

## x402 / CDP Discovery State

| Route | Payment | CDP Discovery | Agentic.Market UI |
|---|---|---|---|
| verification-status | ✓ Live ($0.005) | ✓ Indexed | ✓ Surfaced |
| trust-summary | ✓ Live ($0.02) | ✓ Indexed | — Not surfaced (platform behavior) |
| history | ✓ Live ($0.02) | ✓ Indexed | — Not surfaced (platform behavior) |

**Branding:** Agentic.Market displays `www.agentcrush.xyz` with a generic icon. CDP merchant discovery does not expose merchant-level name/logo fields — likely a hostname fallback or missing merchant branding support on the platform side. Not addressable from endpoint configuration. No blocker for functionality.

---

## GitHub Mapping Review Workflow

**Table:** `agent_github_mapping_candidates` — applied to Supabase May 2.

**Current state:**

| Status | Count |
|---|---|
| applied | 65 total (19 Batch 1 + 46 Batch 2) |
| rejected | 3 total |
| needs_more_info | 7 total |
| pending (high-confidence) | 325 |
| medium-confidence (not yet imported) | 87 |

**Review rules:**
- Never auto-apply probe output to `agents.github_full_name`
- Always dry-run `apply-approved-github-mappings.mjs` before `--write`
- Never overwrite existing `github_full_name` (enforced by apply script)
- Batch size: 50 max per session
- After each batch apply: run evidence pipeline, then tier-promotion dry-run before promoting

**needs_more_info (7) — resolution pending:**
- `1186258278/openclawchinesetranslation` — verify if primary agent or translation fork
- `aliyun/wuying-agentbay-sdk` vs `agentbay-ai/wuying-agentbay-sdk` — verify canonical org
- `agentseal/agentseal` vs `getagentseal/agentseal` — verify which org has active commits
- `agi-inc/agent-protocol` vs `ai-engineer-foundation/agent-protocol` — canonical repo unclear after reported transfer/move

**Batch 3 gate:**
- Do not start Batch 3 before Friday May 9 unless Kris explicitly approves
- Before Batch 3, complete VPS probe cleanup (see Next Actions)
- Batch size: 50 max

**Before Batch 3 — required VPS probe cleanup:**
Ask Claude VPS to fix/verify before next batch import:
- Strip trailing punctuation from repo candidates (e.g. `metaclaw.` artifact)
- Downrank or reject `awesome-*` collection repos unless the agent itself is an awesome list
- Run duplicate sanity check for swarms / kyegomez_swarms
- Improve candidate export with enough metadata to identify batch membership later
- Consider adding `applied_at` / source metadata from `agent_github_mapping_candidates` for review tracking
- Do not add new schema unless needed

---

## AgentCrush Labs

Working backlog only — not actively promoted. Full detail in `docs/AGENTCRUSH_LABS.md`.

**Offers under consideration (not yet promoted):**
1. Agent Commerce Readiness Audit ($299–$1,000+) — covers full agent-commerce stack: x402, AP2, Kite, MCP, Experian Agent Trust, Visa Trusted Agent Protocol, Skyfire, ERC-8004/8183/8211
2. x402 / machine-payable API implementation
3. Traditional-industry A2A readiness

**Activation gates:** x402 post-mortem case study live (gate 1 cleared). Other gates pending: inbound interest, Ajsa signal repeated 3×, CrewAI audit case study.

**Revenue target:** One paying audit customer by July 4, 2026.

**Rules:**
- Paid offers must never affect rankings
- Sponsored/referral/credit surfaces must be clearly labeled
- Labs must reuse AgentCrush infrastructure, not become a second product
- No more than 10–15% of weekly time unless revenue appears

---

## Intelligence Backlog

Append-only log at `docs/INTELLIGENCE_BACKLOG.md`. Captures Ajsa signals that may become AgentCrush tasks.

**Recent entries (May 4–5):**

| Date | Signal | Status |
|---|---|---|
| 2026-05-04 | Experian Agent Trust + KYA framework — TradFi trust layer, probe endpoint exposure | Investigate |
| 2026-05-04 | AI inference aggregators with crypto payment (b.ai, Chutes, OpenRouter) | Monitor |
| 2026-05-04 | Fetch.ai uAgents Payment Protocol — x402 competitive context | Investigate |
| 2026-05-04 | Pantera + Coinbase Ventures + DCG coordinated agent-infra investment pattern | Monitor |
| 2026-05-04 | OpenClaw catalyst tracker | Investigate |
| 2026-05-04 | Messari x402 coverage | Monitor |
| 2026-05-04 | ERC-8183 reader adapter | Build next |
| 2026-05-01 | Stripe Link / Visa / Kite / Tempo MPP agent-commerce stack acceleration | Build next (Ajsa source) |

---

## Active Blockers

| Blocker | Impact | Status |
|---|---|---|
| Reddit API approval pending | Reddit mention signal missing from scoring | Waiting |
| v2 scoring stability | Need ≥8 clean Sunday runs before ERC-8004 v3 writer or legacy rank replacement | Ongoing |
| Ajsa v1.2 live observation | Confirm fix behavior under real daily briefs | 2–3 briefs pending |
| Ajsa threshold edge case | sel=38 at cutoff=38 rejected — decide inclusive vs exclusive | Pending decision |
| GitHub mapping needs_more_info (7) | 7 candidates unresolved | Pending manual check |
| VPS probe cleanup | Required before Batch 3 import | Pending VPS session |

*Resolved since v15:* GitHub mapping Batch 2 applied (46 mappings). Evidence pipeline for all 148 anchored agents complete. 16 new evidence_ranked promotions (51 → 67). Ajsa v1.2 brief quality improvements shipped. Farcaster launched May 4. Share Cards verified working.

---

## Infrastructure Health

| System | Status |
|---|---|
| Vercel deployment | Healthy |
| VPS (104.248.240.129) | All workers running via systemd |
| Supabase | Healthy — `agent_github_mapping_candidates` table applied May 2 |
| x402 seller wallet | Active — 0x58e632Fa698383820FFC22156352C9836790E2c0 |
| Farcaster (Neynar) | Active — launched May 4 |
| Telegram approval gate | Active |
| Main repo path | `/Users/pk/projects/agentcrush-app` |
| Old path symlink | `/Users/pk/Documents/New project` → `/Users/pk/projects/agentcrush-app` |
| Claude execution SOPs | `docs/CLAUDE_WORKFLOW_SKILLS.md` |
| GitHub mapping audit script | `scripts/apply-approved-github-mappings.mjs` + VPS evidence probe |

**Infrastructure backlog (H-series):**
| Item | Status |
|---|---|
| H1: repo move out of iCloud | Done — Apr 28 |
| H2: predictable VPS deploy | Not done — low-intensity infra backlog; VPS-only scripts need a safe deploy path |
| H3: dry-run flags | Partially improved as workers are touched |
| CI | Not done |

---

## Not Done (explicit list)

- Batch 3 GitHub mapping review — not started; not before Friday May 9
- Pending high-confidence candidates: 325
- Medium-confidence candidates: 87 not yet imported
- needs_more_info resolution (7 rows)
- Ajsa v1.2 live observation — 2–3 briefs needed
- Ajsa threshold edge case — inclusive vs exclusive cutoff decision pending
- VPS probe cleanup — required before Batch 3
- `payment_rails_supported` field not built
- CrewAI Agent Commerce Readiness Audit outline not drafted
- ERC-8183 reader scoping not done
- Full evidence normalization (agent_sources / agent_evidence_events tables not created)
- x402 / MCP signal ingestion tables not created
- partial_evidence tier not created
- H2 predictable VPS deploy not done
- Agentverse / Fetch.ai exploration not started
- ERC-8004 scheduled sync
- ERC-8004 writer / attestations
- B2B API tier / enterprise pricing
- Labs landing page (`/labs`)
- Reddit signal
- v2 scoring canonical replacement (legacy rank columns)
- LLM verdict on comparison pages
- SURF integration
- Evaluator agent index
- VPS-only diagnostic scripts not yet synced to main repo
- Token
- CLI
- `/category/autonomous-software-factories` page
- Builder-outreach agent (single-purpose autonomous loop) — not this week
- Tempo/MPP signal source in Ajsa
- Free Agent Commerce Readiness Audit case studies (2 targets: CrewAI + TBD)
- Cross-protocol follow-up blog post
- "State of Autonomous Software Factories" blog post
- First paying Labs audit customer (target: July 4, 2026)

---

## Next Actions (priority order)

1. **Observe Ajsa v1.2 for 2–3 live briefs** — confirm 0-signal days are handled cleanly; confirm source-specific templates fire correctly in real briefs
2. **VPS probe cleanup** — ask Claude VPS: strip trailing punctuation, downrank awesome-* collections, duplicate sanity check (swarms/kyegomez_swarms), improve export metadata, do not add schema
3. **Batch 3 — not before Friday May 9** — if probe cleanup is complete and Kris approves, run one assisted review batch of 50 max
4. **Start separate build chats for:**
   - `payment_rails_supported` v1 field
   - CrewAI Agent Commerce Readiness Audit outline
   - ERC-8183 reader scoping
5. **H2 predictable VPS deploy** — keep as low-intensity infra backlog; do not block other work on it
6. **Do not change scoring weights** — evidence data for new anchors still accumulating
7. **Do not add Ajsa sources yet** — observe v1.2 behavior first
8. **Do not import medium-confidence candidates yet** — probe cleanup first
9. **Do not build Builder Outreach this week**

---

## Canonical docs for strategy chats

Use these files when starting a new strategy or build session. Always load the **latest dashboard only** — older dashboards (v11–v15) are historical snapshots and should not be used as current truth once this file exists.

**Always load:**
- `docs/AGENTCRUSH_DASHBOARD_v16_05_05.md` — this file; current state
- `docs/STRATEGIC_BETS.md` — tracked strategic bets
- `docs/EXECUTION_PLAN_SUPPLEMENT.md` — Agent Economy Index, Labs, cross-protocol strategy
- `docs/INTELLIGENCE_BACKLOG.md` — ecosystem signals log
- `docs/AGENTCRUSH_LABS.md` — monetization backlog
- `docs/Farcaster_05.04.md` — Farcaster strategy and status
- `docs/AP2_X402_TRACKING_BRIEF.md` — agent-commerce stack taxonomy
- `docs/CLAUDE_WORKFLOW_SKILLS.md` — Claude Code SOPs and role split
- `docs/GITHUB_MAPPING_REVIEW_WORKFLOW.md` — GitHub mapping review process and current batch state

**Load for specific contexts:**
- `docs/runtime-map.md` — for VPS / Ajsa / worker discussions

---

**End of Dashboard v16**
**Next update:** After Batch 3, Ajsa live observation complete, or next major sprint
