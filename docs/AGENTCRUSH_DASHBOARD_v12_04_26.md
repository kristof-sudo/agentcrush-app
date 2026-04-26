# AgentCrush — Build Dashboard v12
**Date:** April 26, 2026
**Previous version:** v11 (Apr 26, Phase 5 complete)
**Sprint covered:** April 26 build sprint — ERC-8004 surface + comparison pages scaffold
**Authored by:** Claude Code / Kris session

---

## Current State (end of sprint)

| Dimension | Status |
|---|---|
| Evidence-ranked agents | **39** (unchanged — tier-promotion runs Sunday) |
| Total indexed agents | ~1,225 |
| x402 endpoints live | **3** — trust-summary ($0.02), history ($0.02), verification-status ($0.005) |
| ERC-8004 matched agents | **2** (agentlab, crewai) — Phase 1 complete |
| Comparison pages | **scaffold v1 live** — `/compare/[slug]` routing works |
| VPS workers active | github-snapshot, weekly-ingest, HN signal, npm/PyPI timer, tier-promotion, Ajsa |
| Bazaar listing | posted, indexing status to verify |
| Farcaster | active via Neynar |

---

## Phase Ledger

### Phase 1 — Core Index (complete)
GitHub-only evidence ranking, manual agent ingestion, Supabase backend, basic profile pages, Next.js App Router.

### Phase 2 — x402 Commerce Layer (complete)
Live x402 seller on Base mainnet at `0x58e632Fa698383820FFC22156352C9836790E2c0`. Two endpoints: trust-summary, history. First machine payment Apr 22. Bazaar listing submitted.

### Phase 3 — Signal Expansion (in progress)
npm/PyPI download timer active. HN mentions timer active. Reddit API approval pending. Dependency graph worker deferred. Docs quality signal not yet built.

### Phase 4 — Ajsa Intelligence Layer (complete — v1)
Daily 7:00 Budapest Telegram brief. Weekly Sunday review. Sources: Product Hunt, Farcaster (Neynar), YZI Labs, YC Blog, Coinbase Ventures, Paradigm, YC Launch. Repeat suppression live. Self-monitoring module not yet built.

### Phase 5 — Tiered Evidence Ranking (complete)
`agents.tier` + `agents.tier_promoted_at` columns. `agent_score_v2_top50_public_candidate` view. Sunday tier-promotion worker. EvidenceBadge / IndexedBadge / ScoreBreakdown UI. Rankings page filters to evidence_ranked only. Explore shows full index sorted evidence-first. x402 responses include `tier` field. Website messaging overhauled. `/for-agents` and `/api-docs` pages deployed.

### Phase 6 — ERC-8004 Integration v1 (complete — Apr 26)

**What shipped:**
- Reader prototype (`scripts/erc8004-reader-prototype.mjs`) — queries 8004scan.io public API, no auth, no gas, no keys
- First run: 20 agents checked, **2 confident matches** (10% overlap — meets Phase 2 gate threshold)
  - `agentlab` → "AgentLab" · Ethereum mainnet · token #9634 · exact name match
  - `crewai` → "crew ai" · Base mainnet · token #17997 · exact name match · `x402_supported: true`
- Migration applied: `agent_erc8004_registrations` table (service role protected, RLS enabled)
- Sync script (`scripts/sync-erc8004-registrations.mjs`) — dry-run and `--write` modes; first write sync: 2 rows upserted
- Profile surfacing: "◆ ERC-8004 Registered" panel on agent pages (chain, token, x402 support, source) — uses service role key to bypass RLS
- API surfacing:
  - `trust-summary` → full `erc8004` object (registered, chain_id, chain_name, token_id, x402_supported, match_confidence, source)
  - `verification-status` → `erc8004_registered: boolean`
- Bug found and fixed same session: initial implementation used anon key → RLS returned 0 rows silently → panel never rendered. Fixed in commit ec02916 by switching all three ERC-8004 reads to service role key.
- `/for-agents` and `/api-docs` updated with ERC-8004 documentation and example response

**What ERC-8004 v1 is not:**
- No scoring impact — informational / trust context badge only
- No on-chain writes — read-only from 8004scan.io REST API
- No automatic agent ingestion from ERC-8004 registry

**ERC-8004 roadmap:**
| Version | What | Gate |
|---|---|---|
| v1 (done) | Reader + storage + profile/API surface | Phase 1 reader prototype proves ≥5% overlap |
| v2 (next) | Ingestion discovery — new agents via ERC-8004 as source | v1 stable; Kris go/no-go |
| v3 (future) | Writer — publish AgentCrush attestations on-chain | v2 scoring stable ≥8 Sunday runs; legal review; dedicated attestation wallet |

### Phase 7 — Comparison Pages Scaffold v1 (complete — Apr 26)

**What shipped:**
- Dynamic route `/compare/[slug]` where slug = `handle1-vs-handle2`
- Slug parsing: `indexOf('-vs-')` correctly handles hyphenated handles
- Fetches both agents in parallel via Supabase (agents, rankings, v2 signal view, 30d history, recent events)
- ERC-8004 state fetched for both agents via service role key
- `generateMetadata()` produces real display-name SEO titles
- UI sections: agent header cards with EvidenceBadge/IndexedBadge, Score & Rank, Evidence Signals (6 v2 bars), Trust Context (ERC-8004), 30-day trend, Recent Events
- Guards: invalid slug → 404, same handle → 404, missing agent → 404
- `force-dynamic` export prevents static caching
- Smoke tests passed: `/compare/crewai-vs-autogpt` 200, `/compare/openclaw-vs-langchain` 200, same-handle 404, missing 404

**What comparison pages v1 is not:**
- No sitemap entry yet (top pairs not auto-generated)
- No LLM-generated verdict
- No internal links from profile pages to comparison pages
- No comparison-specific SEO campaign yet

**Comparison pages next priorities:**
1. Add `<Link>` from agent profile pages to "Compare with..." (quick wins for interlinking)
2. Generate sitemap entries for top 50 pairs by combined score
3. Wire comparison pages into `/explore` or rankings as "compare" CTA
4. LLM verdict (Kris approves via Telegram) — deferred until sitemap/SEO value is confirmed

---

## Sprint Commit Ledger — April 26

### Mac / main repo

| Commit | Description |
|---|---|
| f5f2d73 | (pre-sprint, included for completeness) |
| 2ba4968 | feat(erc8004): add reader prototype script |
| 1cb4180 | feat(erc8004): add sync script with --write mode |
| b7b0eef | feat(erc8004): apply migration + first write sync |
| 133fefe | feat(profile): surface ERC-8004 panel on agent pages |
| ed233bc | feat(api): add erc8004 field to trust-summary response |
| 084dbb5 | feat(api): add erc8004_registered to verification-status |
| 02d6ec7 | feat(docs): update api-docs + for-agents with ERC-8004 |
| 60f825b | fix(erc8004): switch all reads to service role key (RLS bypass) |
| 046f715 | (verification gate / smoke test) |
| 81cce31 | (verification gate / smoke test) |
| 420d2b2 | feat(erc8004): initial surface implementation |
| ec02916 | fix(erc8004): service role key fix — anon key blocked by RLS |
| 61947b0 | feat(compare): comparison pages scaffold v1 |

### VPS (local-only commits)

| Commit | Description |
|---|---|
| 4281b52 | (Ajsa / signal worker) |
| bd8e68f | (Ajsa / signal worker) |
| 72fde9f | (Ajsa / signal worker) |
| 0e62542 | (Ajsa / signal worker) |
| 67817f3 | (Ajsa / signal worker) |

---

## Multi-Registry Strategy (current position)

AgentCrush is multi-registry-neutral. ERC-8004 is one registry; Bazaar (x402/Coinbase) is another; Fetch.ai Agentverse is a third. The positioning:

**AgentCrush is the readable, ranked, decision-grade layer on top of raw on-chain identity.**

ERC-8004 provides a portable on-chain handle — it does not rank, score, or make trust decisions. AgentCrush fills that gap. The goal: become the credit bureau that reads identity from multiple registries, aggregates evidence, and publishes structured trust data.

Current registry coverage:
| Registry | Status | Integration depth |
|---|---|---|
| Bazaar (x402 / Coinbase) | Live | Seller wallet + 3 listed endpoints |
| ERC-8004 (Ethereum/Base) | v1 live | Reader + storage + profile/API surface |
| Fetch.ai Agentverse | Planned | Not started |
| Kite AI | Monitoring | Not started |

Hard rules (repeated from ERC-8004 exploration doc):
- Do not make ERC-8004 the exclusive identity source
- Do not let ERC-8004 state change scoring weights without explicit decision
- Do not write on-chain until v2 scoring is confirmed stable (≥8 Sunday runs)
- Do not auto-ingest uncertain ERC-8004 matches into public rankings

---

## Active Blockers

| Blocker | Impact | Status |
|---|---|---|
| Reddit API approval pending | Reddit mention signal missing from scoring | Waiting |
| Bazaar indexing unconfirmed | Endpoint discoverability via Bazaar | Check agentic.market |
| v2 scoring stability | Need ≥8 clean Sunday runs before ERC-8004 v3 writer or legacy rank replacement | Ongoing |
| Comparison pages — no sitemap/interlinking | Pages exist but not discoverable by Google | Next sprint |

---

## Infrastructure Health

| System | Status |
|---|---|
| Vercel deployment | Healthy |
| VPS (104.248.240.129) | All workers running via systemd |
| Supabase | Healthy. `agent_erc8004_registrations` table added this sprint. |
| x402 seller wallet | Active. Monitor USDC balance for machine payments. |
| Farcaster (Neynar) | Active |
| Telegram approval gate | Active |
| iCloud repo path | Still at `/Users/pk/Documents/New project` — H1 migration deferred |

---

## Next Actions (priority order)

1. **Verify Bazaar indexing** — check agentic.market for AgentCrush endpoint listing; ask x402 Discord if not live by Apr 28
2. **Comparison pages interlinking** — add "Compare" CTA on agent profile pages → comparison route
3. **Comparison sitemap** — generate entries for top 50 agent pairs by combined score; submit to Google
4. **ERC-8004 v2 gate check** — run sync against full evidence_ranked set (--limit 50); confirm ≥5 matches; bring to Kris for Phase 2 go/no-go
5. **Dependency graph signal** — highest scoring signal win not yet built; builds automatic ecosystem graph alongside the 125 manual edges
6. **Docs quality signal** — automated README length, example count, OpenAPI spec detection per agent
7. **Comparison LLM verdict** — integrate after sitemap/SEO value is confirmed and structure is stable

---

**End of Dashboard v12**
**Next update:** After Sunday tier-promotion run or next major deliverable
