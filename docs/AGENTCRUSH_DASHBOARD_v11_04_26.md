# AgentCrush — Master Dashboard & Operations Guide (COMPREHENSIVE)

**Last Updated:** April 26, 2026
**Status:** Phase 5 complete — tiered evidence-ranking model live. 39 evidence-ranked agents, 1,186 indexed. /rankings shows v2 evidence-ranked agents only; /explore shows full index. x402 trust-summary/history both return `tier` field. Website messaging, homepage, agent profiles, and /for-agents all updated. Farcaster live via Neynar paid plan. Ajsa covering 7 sources. Reddit scoring blocked pending API approval.
**Founder Role:** Intent + approval only (no transport, no low-level coordination)

---

## STRATEGIC PIVOT — APRIL 15-22, 2026

**What happened (Apr 15):** Mike's X account (@MikeMatshAI) was suspended for "inauthentic behavior." The suspension also revoked the developer app's X API credentials. Appeal filed, no response. Treated as permanent.

**Impact:**
- Distribution arm of the AgentCrush + Mike two-legged plan is dead
- ~25% of scoring signal weight (X mentions) is offline
- Mike pipeline infrastructure archived (not deleted — reusable for future non-X channels)
- ~$60 in prepaid X API credits lost (developer portal inaccessible)

**Response — current direction:**
- **Audience narrowed:** solo/small-team open-source agent builders (primary)
- **Distribution reframed:** SEO + embeddable badges + public API + x402 paid services + Farcaster presence replace Mike-on-X
- **Monetization rethought:** away from $29/mo verified badges; toward x402 paid services (agents) + sponsored placements + B2B API licensing (companies with budgets)
- **Site-level cleanup:** all Mike references removed from public pages, dead links eliminated, homepage rewritten to speak to builders directly
- **New lane (Apr 21-22):** AgentCrush listed on Coinbase's x402 protocol with first paid endpoint (trust-summary) on Base mainnet. Bazaar discovery submission in progress (pending first successful payment to trigger indexing).

---

## STRATEGIC VISION & LONG-TERM DIRECTION

### What AgentCrush is Becoming

**From:** Leaderboard / directory / narrative site
**To:** Canonical identity, trust, historical change, and discovery layer for the AI agent ecosystem — **serving open-source agent builders as the primary audience, and AI agents as paid API customers via x402.**

**Long-term Position:**
- **CoinMarketCap for AI agents** — movement tracking + market intelligence
- **Trust and reputation rails for the agent economy** — verification, reputation, canonical state, machine-callable via x402
- **Discovery engine** — for builders and AI agents
- **Machine-readable ecosystem layer** — API + widgets + embeds for downstream products

### Core Strategic Thesis

AgentCrush doesn't need more AI agent power. It needs **stronger control, trust, traceability, bounded memory, graph structure, and governed execution** to become the neutral intelligence, identity, and reputation layer of the AI agent ecosystem. The x402 bet: as the agent economy matures in 2027-2028, AgentCrush becomes a default lookup inside agent workflows ("is this target trustworthy? has it been active? what's its history?"). In 2026, x402 is primarily a positioning play, not a revenue engine.

### Strongest Moats (Time-Based, Hard to Copy)

| Moat | How It Works | Timeline | Status |
|------|-------------|----------|--------|
| **Historical Truth** | Daily snapshots since Apr 9, per-agent daily snapshots since Apr 13 — 9,301 snapshot rows across 1,196 agents as of Apr 22 | 6–12 months | ✅ Compounding |
| **Ecosystem Integration Graph** | 125 relationships live. Cannot be bought or faked. | Ongoing | ✅ Live |
| **Multi-Signal Scoring** | GitHub + ecosystem depth. X offline, HN/Reddit/npm planned. | Ongoing | ⚠️ Reduced (X dead) |
| **Identity Graph** | Canonical mapping of builders, orgs, frameworks, runtimes, dependencies | Ongoing | ✅ Live |
| **Participation Moat** | Builders claiming profiles, embedding badges, competing for visibility | Ongoing | ⏳ Next phase |
| **Machine-callable surface** | x402 paid endpoints on Base mainnet, listed on agentic.market Bazaar | 6+ months | ⏳ Shipped, debugging |
| **Distribution Moat** | SEO, API, widgets, embeds, machine-readable lookup | 6+ months | 🔲 Building |

---

## EXECUTIVE SUMMARY

**What is AgentCrush?**
The market intelligence and trust/reputation layer for AI agents. Free directory for users and builders. Paid surfaces for companies with budgets (sponsored placements, B2B API licensing) and — newly — machine-callable paid endpoints for AI agents via x402.

**Current Phase:** Phase 5 complete — tiered evidence-ranking model shipped. 39 evidence_ranked, 1,186 indexed, 0 archived. x402 end-to-end payment verified Apr 22 (first machine-paid call on Base mainnet). Farcaster reactivated via Neynar paid plan.

**Core Systems Status:**
- ✅ Website with 1,225+ agents indexed; 39 evidence-ranked, 1,186 indexed
- ✅ SEO infrastructure deployed (sitemap, robots.txt, og-images, JSON-LD, Vercel Analytics, Search Console submitted)
- ✅ Homepage rewritten for OSS builder audience; trust layer / machine-callable / x402 messaging live
- ✅ Agent Intel redesigned to single-column, freshness-gated
- ✅ All Mike references removed from public site
- ✅ Supabase (Pro, $25/mo) as canonical state
- ✅ CDP Server Wallet v2 created, funded with 4 USDC on Base mainnet (address `0x58e632Fa698383820FFC22156352C9836790E2c0`)
- ✅ x402 seller middleware wired — trust-summary ($0.02) and history ($0.10) both live; both return `tier` field
- ✅ x402 first end-to-end payment verified Apr 22 — $0.02 USDC on Base mainnet; Bazaar indexing triggered
- ✅ Supabase tables populated (9,301+ snapshot rows, 1,225 agents tracked)
- ✅ Weekly agent ingestion pipeline active (Monday 06:00 UTC)
- ✅ News fetch moved to VPS systemd timer (every 4h)
- ✅ **Phase 5: Tiered evidence-ranking model** — `agents.tier` + `agents.tier_promoted_at` columns live; `evidence_ranked` / `indexed` / `archived` enum; score_v2 shadow views live
- ✅ **Phase 5: Tier-promotion worker** deployed on VPS; `agentcrush-tier-promotion.timer` active, runs Sunday 07:00 UTC
- ✅ **Phase 5: /rankings** — now shows evidence-ranked agents only via v2 public evidence-ranking (`agent_score_v2_top50_public_candidate`)
- ✅ **Phase 5: /explore** — shows all non-archived indexed agents; evidence-ranked sorted first; TIER 01/02 eyebrow design; top-4 featured strip
- ✅ **Phase 5: Website messaging refresh** — homepage, /for-agents, /api-docs, agent profiles, footer, and x402 responses updated for "trust and reputation layer" / machine-callable / x402 framing
- ✅ **Phase 5: Tier-aware UI** — EvidenceBadge (cyan pill), IndexedBadge (dashed gray), ScoreBreakdown (6-dim signal bars) — live on rankings table, agent profiles, /explore
- ✅ **Farcaster reactivated** — Neynar paid plan active; Ajsa returns casts from /ai, /agents, /base channels
- ✅ **Ajsa source expansion** — covers Product Hunt, Farcaster, YZI Labs, YC Blog, Coinbase Ventures, Paradigm, YC Launch (7 sources)
- ✅ Unknown-date repeat suppression implemented
- ✅ Package-download timer active; nanobot-ai download row written
- ✅ `systemctl --failed` clean on VPS
- ❌ Mike pipeline — ARCHIVED to `/opt/mike-archived/`
- ❌ x-scanner.timer — DISABLED (credentials revoked by X)
- ⏳ **Reddit scoring** — blocked pending Reddit API/app approval

**Current Reality:**
- Tiered model: 39 agents with enough evidence for public ranking; 1,186 indexed waiting for more signals
- Scoring pipeline: GitHub + Ecosystem + Package downloads active. X offline. Reddit pending approval.
- Farcaster active as distribution channel (Neynar paid plan, Ajsa monitors /ai /agents /base)
- Infra cost: $40/mo (Vercel Hobby $0 + Supabase Pro $25 + DigitalOcean VPS $15)
- Revenue: First x402 payment received Apr 22 ($0.02 USDC)

**Next bottlenecks:**
1. Reddit API/app approval (scoring signal)
2. Week-over-week v2 rank stability (requires more signal history; initial runs will show volatility)
3. Embeddable badge rollout (creates referral-link flywheel)
4. Eventual replacement of legacy `rankings.score_total` / `global_rank` with v2 as canonical — decision pending; old system can stay as fallback while v2 matures

---

## INFRASTRUCTURE COST BREAKDOWN

| Service | Tier | Monthly Cost | Purpose |
|---------|------|--------------|---------|
| Vercel | Hobby | $0 | Next.js site, 1,072 sitemap URLs, static + dynamic routes |
| Supabase | Pro | $25 | Database, daily backups, no auto-pause, 8GB ceiling |
| DigitalOcean | Droplet | $15 | VPS for scoring pipeline, weekly ingest, news fetch timers |
| Coinbase CDP | Free tier | $0 | x402 facilitator, CDP wallet, API credentials |
| Base mainnet gas | Pay-per-tx | ~$0-5/mo | Handled by CDP facilitator for EIP-3009 buyers; AgentCrush as seller pays nothing |
| **Total** | | **~$40/mo** | Plus variable Claude Pro usage for development |

Wallet funding (not infra cost, but working capital): 4 USDC currently parked on Base mainnet for testing buyer flow.

---

## x402 DEPLOYMENT — APRIL 21-22, 2026

### What's live

| Component | Status | Notes |
|-----------|--------|-------|
| CDP Server Wallet v2 | ✅ Created Apr 20 | Address: `0x58e632Fa698383820FFC22156352C9836790E2c0`. Single wallet, used for both testnet (Sepolia) and mainnet (Base). |
| Wallet funding | ✅ 4 USDC on Base mainnet (Apr 22) | Transferred from Coinbase → Base network. No ETH needed for buyer side (EIP-3009 means facilitator pays gas). |
| Seller middleware | ✅ Deployed Apr 21 | `src/proxy.js` (Next.js 16 new convention) wraps two routes via `@x402/next` middleware |
| trust-summary endpoint | ✅ Gated at $0.02 | `GET /api/agent/[handle]/trust-summary` returns 402 Payment Required with valid instructions |
| history endpoint | ✅ Gated at $0.10 | `GET /api/agent/[handle]/history` returns 402 |
| Bazaar discovery metadata | ✅ On both endpoints | `discoverable: true, category: "reputation", tags: ["ai-agents","trust","verification","analytics"]` |
| CDP facilitator | ✅ Configured | `https://api.cdp.coinbase.com/platform/v2/x402`, network `eip155:8453` (Base mainnet) |
| Vercel env vars | ✅ Set | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` in Production environment |
| API docs page | ✅ Deployed | `src/app/api-docs/page.js` — public pricing, schemas, buyer integration pointer |
| Sitemap entry | ✅ Added | `/api-docs` included in sitemap.xml |
| Buyer-side test script | ✅ Written Apr 22 | `scripts/cdp-x402-buyer-test.mjs` — uses `@x402/fetch@2.10.0` + CDP Server Wallet v2 |
| End-to-end buyer test | ⚠️ Failed Apr 22 | Received 402 on retry with `invalid_payload` error. No funds moved. Root cause TBD. |
| Bazaar listing | 🔲 Pending first payment | Bazaar indexes services after first successful facilitator-processed payment. Blocked on buyer test. |

### Wallet tooling (all in main repo `/Users/pk/Documents/New project/scripts/`)

| Script | Purpose |
|--------|---------|
| `cdp-create-server-wallet.mjs` | One-shot wallet creation via `@coinbase/cdp-sdk@^1.40.0` |
| `cdp-check-wallet-balance.mjs` | Queries balances (currently pointed at Base Sepolia, will need mainnet variant) |
| `cdp-send-test-transaction.mjs` | Sends test ETH transaction (used to verify wallet operational) |
| `cdp-x402-buyer-test.mjs` | Makes paid call to own trust-summary endpoint. Returns 402 invalid_payload as of Apr 22. |

### Known bug — x402 buyer flow

**Symptom:** `npm run x402-buyer-test` gets past the 402 challenge, signs a payment, retries, and receives a second 402 with `"error":"invalid_payload"` inside the payment-required header. No funds move.

**What we know:**
- Server side is returning correct 402 challenges (verified: `curl -iL https://www.agentcrush.xyz/api/agent/devin/trust-summary` returns valid payment instructions with correct asset/network/amount/payTo)
- Buyer wallet has sufficient USDC (4 USDC on Base mainnet)
- Buyer doesn't need ETH (EIP-3009 via facilitator)
- CDP facilitator mainnet endpoint is configured
- `invalid_payload` is a validation-level rejection — the facilitator saw the payment attempt but deemed the signature or payload malformed

**Hypotheses (in rough priority):**
1. SDK version mismatch between `@x402/fetch` (buyer) and the facilitator/middleware contract
2. CDP Server Wallet v2 account needs viem account wrapping the buyer SDK doesn't do automatically
3. EIP-3009 typed-data fields (nonce, validAfter, validBefore) formatted incorrectly by buyer SDK
4. Asset/network string format mismatch (checksum vs lowercase address, etc.)

**Next step:** read the full decoded `payment-required` header (includes more detail than the truncated terminal output showed), then either fix client-side or escalate to x402 Discord if it's a known protocol bug.

### Service pricing & roadmap (Apr 22 baseline)

**Guiding principle:** In 2026, x402 is a positioning play, not a revenue engine. Price for volume, not margin. Bet on becoming a default workflow dependency, not a premium specialty service.

**Currently live:**
- `trust-summary` at $0.02 — current score, rank, claim status, verified flag, timestamp

**Phase 3 — next 2-4 weeks (after buyer flow fixed + Bazaar indexed):**
- `verification-status` at $0.005 — cheapest, simplest. Returns `{handle, verified, claim_status, last_updated}`. Low-latency pre-filter. Front door for buyers.
- `history` at $0.02 — 30-day score/rank snapshots from `agent_daily_snapshots`. Currently priced at $0.10 in middleware; revise down to $0.02 to match honest volume-play strategy.

**Phase 4 — month 2:**
- `relationship-graph` at $0.05 — returns framework/infra/ecosystem edges per agent. This is the genuine moat product because competitors don't have 125+ ecosystem relationships.
- `compare/[a]-vs-[b]` at $0.03 — same data as trust-summary, two agents side-by-side. Note: compare is probably more a *human* product than an agent product; the SEO web pages may matter more than the paid API.

**Phase 5 — month 3+:**
- `shortlist` (basic filter) — **free** tier, rate-limited. Top-of-funnel demo.
- `shortlist/intelligent` at $0.10 — compound-signal filtering. "Rising despite low visibility + GitHub activity up 20%." Uses proprietary multi-signal data.
- Webhooks / event-driven alerts — per-subscription pricing TBD

**Phase 6 — month 6+ (only if demand exists):**
- `risk-score` at $0.25 — defensible verdict API, requires more history + signal diversity to be honest

### x402 revenue projection (honest)

| Period | Source | Realistic Range |
|--------|--------|-----------------|
| Month 1-3 | First paid calls, mostly self + friends testing | $0-50 |
| Month 4-6 | If Bazaar indexed + at least one integration | $50-500 |
| Month 7-12 | If one workflow/tool adopts as dependency | $200-2,000 |
| Year 1 total | Direct x402 call revenue | **$500-3,000 realistic** |

**Why this is not the real business:**
- Per-call micropayments at $0.02-0.10 need massive volume to matter
- Agent economy in 2026 is too early for habitual paying
- A single $300/mo B2B enrichment customer > 15,000 individual $0.02 calls

**The real revenue path is B2B, not per-call micropayments:**
- Sponsored placements on category pages ($99-299/slot/mo)
- B2B API licensing to wallets/directories/launchpads ($300-2,000/mo per customer)
- Featured campaign tooling around agent launches
- Premium data products (weekly category reports, movers data)

x402 matters because it's a credibility artifact, forces clean API thinking, and positions for 2027-2028 when agent commerce may actually be significant. It does not replace the B2B revenue plan.

---

## SEO INFRASTRUCTURE (Deployed April 20, 2026)

This is the primary distribution backbone — compounds silently, no channel-provider can kill it.

### What's Live

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Sitemap | `src/app/sitemap.js` | ✅ Live | 1,072+ URLs including `/api-docs` (Apr 21) |
| Robots.txt | `public/robots.txt` | ✅ Live | Allow all, disallow /mission-control + /admin |
| Vercel Analytics | root `layout.js` | ✅ Live | Tracking all pages |
| Agent og:image | `app/agent/[handle]/page.js` | ✅ Live | Uses `agent.avatar_url`, fallback to og-default |
| Default og:image | `public/og-default.png` | ✅ Live | 1200×630 branded card |
| /rankings metadata | static export | ✅ Live | Title + description for search |
| /compare metadata | static export | ✅ Live | Title + description for search |
| JSON-LD SoftwareApplication | agent pages | ✅ Live | Log-scale rating formula |
| Google Search Console | — | ✅ Submitted | Sitemap indexed, monitoring |

### Rating Formula (Fixed Apr 20)

```js
const ratingValue = agent.score_total
  ? Math.min(10, Math.max(1,
      Math.round((Math.log10(agent.score_total / 14) * 2.8) * 10) / 10
    ))
  : null;
```

Maps real score distribution (min 140 → 2.8, median 2744 → 6.4, max 9240 → 7.9) to a plausible 0-10 range.

---

## SCORING SYSTEM — APRIL 26 STATE

### Active Pipeline

```
Every 4 hours (agentcrush-github-snapshot.timer, VPS):
  → github-snapshot-worker.mjs
  → process_github_signals() + process_relationship_signals()
  → recalc_rankings()
  → write agent_daily_snapshots (upsert per-agent-per-day)
  → compute weekly_delta (today − 7d ago)

Every 4 hours (agentcrush-news-fetch.timer, VPS):
  → curl GET https://www.agentcrush.xyz/api/news/fetch

Every Monday 06:00 UTC (agentcrush-weekly-ingest.timer):
  → weekly-ingest-worker.mjs
  → GitHub discovery → insert agents → Telegram notification

Package-download timer (schedule TBD, VPS):
  → writes npm/PyPI download rows per agent
  → nanobot-ai row already written as first test

Sunday 07:00 UTC (agentcrush-tier-promotion.timer, VPS):
  → tier-promotion-worker.mjs
  → evaluates evidence_ready_for_public_rank flag per agent
  → promotes / demotes agents between evidence_ranked and indexed
  → updates agents.tier + agents.tier_promoted_at
```

### Tiered Evidence Model (Phase 5)

The scoring system now operates in two tiers:

| Tier | Count (Apr 26) | Criteria | Public display |
|------|----------------|----------|----------------|
| `evidence_ranked` | **39** | `evidence_ready_for_public_rank = true` in shadow view | /rankings, agent profiles with EvidenceBadge |
| `indexed` | **1,186** | Tracked but below evidence threshold | /explore (awaiting-evidence section), IndexedBadge on profiles |
| `archived` | **0** | Reserved; manual promotion only | Hidden from all public routes |

Score v2 shadow views (`agent_score_v2_top50_public_candidate`) are live. The view name is misleading — no LIMIT, returns all 39 evidence-ready agents filtered by `evidence_ready_for_public_rank = true`.

The legacy `rankings.score_total` / `global_rank` columns remain as a fallback. Replacing them with v2 as canonical is deferred until v2 shows week-over-week stability (several weekly tier-promotion runs required).

### Signal Status

| Signal | Weight | Status |
|--------|--------|--------|
| GitHub Activity | 25% | ✅ Live |
| Ecosystem Integration Depth | 20% | ✅ Live |
| Package Downloads (npm/PyPI) | — | ✅ Timer active; first row written |
| HackerNews mentions | — | ✅ Timer active (APR 24 build) |
| Reddit mentions | — | ⏳ Blocked — Reddit API/app approval pending |
| X/Twitter Mentions | 25% | ❌ Offline (credentials revoked Apr 15) |
| AgentCrush Native Signal | 15% | 🔲 Planned (month 2+) |
| Builder Community Signals | 10% | 📅 Month 3+ |

Effective scoring weight: 45-55% of design target (GitHub + Ecosystem + package downloads + HN).

---

## CURRENT SYSTEM ARCHITECTURE

### Infrastructure

| Layer | Tool | Cost | Purpose |
|-------|------|------|---------|
| Frontend | Next.js 16 + Vercel (Hobby) | $0 | Website + API routes |
| Database | Supabase (Pro) | $25/mo | Canonical state |
| VPS | DigitalOcean 104.248.240.129 | $15/mo | Scoring pipeline, timers |
| x402 facilitator | Coinbase CDP (free tier) | $0 | Payment validation |
| Wallet | CDP Server Wallet v2 | $0 | Receives USDC on Base mainnet |
| Source of truth | GitHub | $0 | All code |
| Approval | Telegram | $0 | Weekly ingest notifications |

### VPS Services — Active Timers

| Service | Schedule | Purpose |
|---------|----------|---------|
| agentcrush-github-snapshot.timer | Every 4h | Scoring pipeline |
| agentcrush-news-fetch.timer | Every 4h | News fetch trigger |
| agentcrush-weekly-ingest.timer | Monday 06:00 UTC | GitHub discovery → agents |
| agentcrush-tier-promotion.timer | Sunday 07:00 UTC | Promote/demote agents between tiers based on evidence score |
| agentcrush-package-download.timer | (schedule active) | npm/PyPI download counts per agent |

`systemctl --failed` is clean as of Apr 26.

### VPS Services — Disabled/Archived

| Service | Status | Why |
|---------|--------|-----|
| x-scanner.timer | Disabled Apr 15 | X revoked credentials |
| mike-*.timer | Archived Apr 20 | X account suspended |

### Key File Locations

| File | Location | Notes |
|------|----------|-------|
| Next.js app | `/Users/pk/Documents/New project` | Main repo, Mac Claude Code works here |
| x402 proxy middleware | `src/proxy.js` | Next.js 16 convention (was middleware.ts) |
| API routes | `src/app/api/agent/[handle]/{trust-summary,history}/route.js` | Pre-x402 logic |
| CDP wallet scripts | `scripts/cdp-*.mjs` | Four scripts, see x402 section |
| CDP wallet metadata | `cdp-server-wallet-account.json` | Gitignored, contains wallet address + seed reference |
| Environment | `.env.local` (Mac), Vercel env vars (production) | CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET |
| VPS scoring worker | `/opt/agentcrush/scanner/github-snapshot-worker.mjs` | |
| VPS weekly ingest | `/opt/agentcrush/scanner/weekly-ingest-worker.mjs` | |
| Archived Mike pipeline | `/opt/mike-archived/systemd/` | 8 inert files |

### macOS note

Full Disk Access issue with `/Users/pk/Documents/New project` was resolved Apr 21 by granting Terminal.app permission in System Settings → Privacy & Security → Full Disk Access. Worth noting: this folder is in iCloud-synced Documents, so recurrence is possible after macOS updates. Longer-term consideration: move main repo to `~/projects/agentcrush-main` to permanently sidestep Documents/iCloud gating.

---

## GROWTH & MONETIZATION STRATEGY — APRIL 22

### Unified monetization view

AgentCrush now has two distinct monetization surfaces, serving different customer types:

**Surface 1 — x402 paid endpoints (AI agents as customers):**
- Deployed on Base mainnet Apr 21
- Low price, high-volume play
- Small revenue in year 1, but real positioning value
- Detailed in x402 section above

**Surface 2 — Web SaaS / B2B (humans as customers):**
- Still to be built
- Higher price, lower-volume play
- This is where meaningful year-1 revenue comes from
- Sponsored placements, B2B API licensing, featured campaigns

### Stage 1 (now through Month 3)
- Free claim, free verification for builders
- x402 endpoints: trust-summary live, verification-status + history next
- Sponsored placements on category pages: $99-299/slot/mo (target first customer by month 2)
- Featured campaigns: $99 one-time slots

### Stage 2 (Month 3-6)
- B2B API access tiers: $49/mo startup, $299/mo enterprise (separate from x402; API-key auth for predictable human workflows)
- Sponsored content in comparison pages
- Weekly premium data reports

### Stage 3 (Month 6+)
- Revisit paid builder tiers if traffic clearly drives ROI
- Token launch evaluation (only if community exists)

### Deprecated / Removed
- `/shop` Stripe products ($9-29 one-time) — designed for old "Tinder for AI agents" concept
- Newsletter — AI newsletter space saturated, no differentiation play
- $29/mo paid verification for builders — wrong audience for that price

### Target revenue (all surfaces combined)

| Period | Sources | Realistic Range |
|--------|---------|-----------------|
| Month 2 | First sponsored placement, trickle of x402 | $100-400 |
| Month 3 | Multiple sponsored slots, x402 growing | $400-1,000 |
| Month 6 | 2-3 sponsored/mo + B2B API + x402 volume | $1.5K-3K/mo |
| Month 9-12 | Mature mix | $3K-6K/mo |

### Participation Loops

| Loop | Engagement | Monetization |
|------|-----------|-------------|
| Claim Profile | Builders update their index entry | Free |
| Verification | indexed → claimed → verified | Free |
| Embeddable Badge | Builder embeds AgentCrush rank on own site | Free (drives backlinks) |
| x402 paid endpoint | AI agents call for structured data | $0.005-$0.25/call |
| Sponsored Placement | Companies pay for category featuring | $99-299/slot/mo |
| B2B API Access | Developers pull bulk AgentCrush data | $49-299/mo tiered |

---

## 90-DAY ROADMAP (Revised Apr 22)

### Week of Apr 22-27 — completed

- ✅ x402 seller deployed (Apr 21)
- ✅ First buyer test attempted (Apr 22) — `invalid_payload`, debugged
- ✅ First successful end-to-end x402 payment on Base mainnet (Apr 22, $0.02 USDC)
- ✅ entity_type SQL fix applied — 29 previously invisible agents visible
- ✅ Farcaster reactivated via Neynar paid plan — Ajsa returns casts from /ai, /agents, /base
- ✅ Ajsa source expansion — Product Hunt, Farcaster, YZI Labs, YC Blog, Coinbase Ventures, Paradigm, YC Launch (7 sources)
- ✅ Unknown-date repeat suppression implemented
- ✅ Package-download timer active; nanobot-ai row written
- ✅ `systemctl --failed` clean
- ✅ Score_v2 shadow views live
- ✅ Tiered indexing model deployed — `agents.tier`, `agents.tier_promoted_at`; tier-promotion worker + Sunday 07:00 UTC timer
- ✅ /rankings evidence-ranked only (v2 public evidence-ranking)
- ✅ /explore full index (non-archived, evidence-ranked sorted first, TIER 01/02 eyebrows, top-4 featured strip)
- ✅ Website messaging refresh — homepage, /for-agents, /api-docs, agent profiles, footer, x402 responses
- ✅ x402 `tier` field added to trust-summary and history responses
- ✅ Tier-aware UI — EvidenceBadge, IndexedBadge, ScoreBreakdown primitives; deployed on rankings table and agent profiles
- ⏳ Bazaar listing — check agentic.market; first payment was Apr 22, should index within 72h

### Pending: Reddit scoring (blocked)

- 🔲 Reddit API/app approval → once approved, wire Reddit mention counts into scoring pipeline
- Note: all other Layer 1B signals are live or in progress; Reddit is the only blocker

### Next (Apr 27 - May 11) — distribution surfaces

- 🔲 Embeddable badge component (`/embed/[handle]` SVG route)
- 🔲 Ship `verification-status` x402 endpoint at $0.005
- 🔲 Revise `history` pricing to $0.02 (from $0.10)
- 🔲 Public API docs expansion (buyer integration examples in 3 languages)
- 🔲 "Embed your rank" CTA on every agent profile
- 🔲 Farcaster cadence: weekly "Rising Now" cast from Ajsa data

### Week 3-6 (May 11 - Jun 1) — content surfaces

- 🔲 Comparison pages scaffold: `/compare/[a]-vs-[b]` dynamic route
- 🔲 Auto-generate top 50 agent pairs with live scoring
- 🔲 Ship `relationship-graph` x402 endpoint at $0.05

### Week 6-10 (Jun 1 - Jul 1) — B2B monetization

- 🔲 First sponsored placement outreach (targeted pitch to agent-tooling companies)
- 🔲 B2B API tier definition + Stripe wiring
- 🔲 Shortlist endpoints (free + intelligent tiers)

### Month 3 (Jul) — spiky launches

- 🔲 Product Hunt (hook: "first AgentCrush trust data now machine-callable via x402")
- 🔲 HN Show HN (hook: methodology + x402 + multi-signal scoring)

### Signal Pipeline (ongoing)

- ✅ HackerNews signal integration — live (APR 24)
- ⏳ Reddit signal integration — blocked on API approval
- ✅ npm/PyPI download counts — timer active

### Future / Deferred (not blocking anything now)

- 🔲 Replace legacy `rankings.score_total` / `global_rank` with v2 as canonical — defer until v2 shows several weeks of stability
- 🔲 Archive policy (manual promotion only; no automated archiving planned)
- 🔲 MCP server — planned, not yet started; will announce via Farcaster when live

### Deferred to Month 3+

- 🔲 Watchlist feature + builder auth
- 🔲 Fetch Business / Agentverse registration (distribution, not yet)
- 🔲 Potential LinkedIn or Bluesky as Mike-persona replacement

---

## FOUNDER OPERATING MODEL

### Daily Workflow (Budapest time)

**Morning:** Check Telegram for Monday ingest. Check Vercel Analytics + Search Console (5 min). Check x402 wallet balance for any unexpected incoming payments.
**Midday:** 1-3 strategic decisions. Review outreach responses if active.
**Evening:** Light Farcaster engagement (15 min) if/when that channel is active.

### Claude Code Usage Discipline

- Cost sensitivity active (Claude Pro weekly credits shared)
- Small fixes (<15 min) → single Claude Code session with scoped prompts
- Large work → plan in Claude.ai first, then scoped prompt to Claude Code
- Two instances: Mac (main repo, website, x402 scripts), VPS (scoring pipeline). Never merge prompts/contexts.
- **After every Claude Code session that says "committed,"** run `git log --oneline -5 && git status` to verify push happened. Learned the hard way Apr 21.

---

## CRITICAL RULES & GUARDRAILS

### Site Change Discipline (Post-SEO-Deploy)

- Fix broken/misleading things → always ship
- Experiment with layouts or copy → wait for SEO baseline (2-4 weeks from Apr 20)
- Change URL structures → avoid entirely
- Add new pages (embed, API, comparison) → fine, don't disrupt existing

### x402 Rules

- Never commit wallet seed files or credentials to git
- Always verify git push actually happened before testing deploy-dependent features
- Start any pricing change on production by first verifying locally
- Stay honest in positioning: sell what you actually have today (reputation snapshot), not what you aspire to (risk oracle)
- Every endpoint needs clear, honest description in Bazaar metadata — builder-friendly language

### Strategic Rules

- Scoring credibility is foundational — no synthetic signals
- Keep product/runtime/growth as separate concerns
- OSS builder focus for human-facing features; AI agent focus for x402 surfaces
- No X-dependent plans ever again
- No newsletter
- No shortcuts on data honesty — if `days_tracked` is 2, return 2; don't pad

### Mike Revival Rules (if ever)

- Not on X under any circumstance
- LinkedIn, Bluesky, or Farcaster as candidates — evaluate month 3+
- Farcaster is the current leading candidate given crypto-native audience overlap with x402 narrative

---

## KEY METRICS & KPIs

| Category | Current (Apr 26) | 1-Month Target | 6-Month Target |
|----------|------------------|----------------|----------------|
| Agents Indexed (total) | 1,225+ | 1,300+ | 2,000+ |
| Agents Evidence-Ranked | **39** (tier model) | 50+ | 150+ |
| Agents Indexed (awaiting evidence) | 1,186 | 1,250+ | 1,800+ |
| Scoring Sources Live | 3-4 (GitHub + Ecosystem + pkg + HN) | 5 (+ Reddit when approved) | 6+ |
| Sitemap URLs Indexed (Google) | ~100-500 (settling) | 500+ | 1,000+ |
| Website Monthly Visitors | baseline being established | baseline + 2x | 10x baseline |
| Claimed Profiles | 0 | 5-15 | 100+ |
| x402 Paid Calls (Base mainnet) | 1 (first payment Apr 22) | 10-100 | 1,000+ |
| x402 Revenue | $0.02 (first payment) | <$10 | $100-500 |
| B2B Sponsored Placements | 0 | 0-1 | 3-5 |
| Embedded Badges (external sites) | 0 | 10+ | 200+ |
| Combined Monthly Revenue | ~$0 | $0-100 | $1.5K-3K |
| Infra Cost | $40/mo | $40/mo | $40-80/mo |

### Retired KPIs

- Mike Followers, Daily Likes, Daily Posts, Daily Cost — account suspended

---

## NEXT IMMEDIATE ACTIONS

### Now (Apr 26) — distribution + Reddit unblock

1. Check Bazaar listing on agentic.market — if not visible, ask in x402 Discord (first payment was Apr 22, 72h window passed)
2. Reddit API/app approval — follow up on pending application; this is the only scoring signal still blocked
3. Embeddable badge (`/embed/[handle]` SVG route) — next distribution surface to ship
4. Ship `verification-status` x402 endpoint at $0.005 — cheapest endpoint, front door for buyers

## x402 VERIFIED LIVE — APRIL 22, 2026

First successful end-to-end x402 payment completed on Base mainnet. 
Buyer wallet `0x11f990De3490868E2cc5A0Bf7AE5DB04E3ec9Db9` (separate 
from seller wallet, created specifically for testing — EIP-3009 
rejects self-transfers) paid $0.02 USDC to seller wallet 
`0x58e632Fa698383820FFC22156352C9836790E2c0` and received the 
trust-summary JSON for agent `devin` in return. Transaction hash: 
`0x3506d3d6e91fa6c0f2b9b49cb66d55060d8521d48ee05a41dc8158d7b73cf228` 
(https://basescan.org/tx/0x3506d3d6e91fa6c0f2b9b49cb66d55060d8521d48ee05a41dc8158d7b73cf228). 
Buyer USDC balance moved from 1.000000 → 0.980000, matching expected 
-0.020000 delta. This is AgentCrush's first machine-paid API call 
and the trigger event for Coinbase Bazaar indexing — the service 
should appear on agentic.market within 24-48h under category 
"reputation". Two days from X suspension (Apr 15) to live paid 
endpoint on Base mainnet (Apr 22). The distribution arm that was 
killed on X has been replaced — at least structurally — by a 
machine-callable surface on a protocol that can't ban you for 
being automated.

The End-to-end buyer test row: change ⚠️ Failed to ✅ Verified Apr 22
The Bazaar listing row: change 🔲 Pending to ⏳ Indexing (24-48h after Apr 22)
In KPIs: x402 Paid Calls (Base mainnet) goes from 0 to 1, and x402 Revenue goes from $0 to $0.02

### Rest of This Week

1. First successful end-to-end x402 payment on Base mainnet
2. Verify Bazaar indexing within 48h of first payment
3. Post about x402 launch on Farcaster (artifacts: trust-summary endpoint, transaction hash, BaseScan link)

### Next 2 Weeks

1. Ship embeddable badge + `/embed/[handle]` route
2. Ship `verification-status` x402 endpoint at $0.005
3. Revise `history` pricing to $0.02
4. Farcaster daily cadence activation

### Month 2

1. Comparison page web routes + top 50 auto-generated
2. Relationship-graph x402 endpoint at $0.05
3. First sponsored placement outreach (to agent-tooling companies, not cold builder outreach)
4. HN/Reddit signal integration

### Month 3

1. First sponsored placement activations
2. Product Hunt + HN launches (with x402 as hook)
3. Decide on Mike-persona revival channel

---

## DOCUMENT GOVERNANCE

**Status:** CANONICAL source of truth
**Revision Frequency:** Weekly (or after major decisions)
**Owner:** Kris (founder) + Claude (documentation + synthesis)
**Founder timezone:** Europe/Budapest (UTC+2 CEST)

**How to use this document:**
- New chat? Start here. Upload this file and say "read the dashboard for context."
- Lost context? Search this doc.
- Major decision made? Update this doc after.
- Before building anything? Check what's already live.

**Version history:**
- v8 (Apr 13): Phase 3 complete — weekly ingest, ecosystem depth, per-agent snapshots live
- v9 (Apr 20): Post-X-suspension pivot — SEO deployed, OSS builder positioning, Mike archived, monetization rethink
- v10 (Apr 22): x402 seller deployed to Base mainnet; first buyer test failed then fixed; first end-to-end machine payment on Base mainnet ($0.02 USDC); Bazaar indexing triggered
- v11 (Apr 26): Phase 5 complete — tiered evidence-ranking model (39 evidence_ranked, 1,186 indexed); tier-promotion worker + Sunday timer; /rankings shows v2 evidence-ranked only; /explore full index; website messaging refresh (trust layer / x402 / machine-callable); Farcaster reactivated via Neynar; Ajsa 7-source expansion; package-download timer; HN signals live; Reddit still blocked; EvidenceBadge/IndexedBadge/ScoreBreakdown UI primitives deployed

---

## APPENDIX: KEY DOCUMENTS

- `AgentCrush_Foundation_Source_of_Truth_Rewritten.docx` — control layer, schema, identity graph
- `AgentCrush_System_Architecture_Canonical.docx` — 7-layer architecture
- `AgentCrush_Build_Execution_System_Canonical.docx` — build approval + deploy flow
- `AgentCrush_Growth_Monetization_Competition_Source_of_Truth.docx` — moats, loops (⚠️ outdated on $29/mo plans, needs update)
- `AGENTCRUSH_ASI1_Competitive_Analysis.docx` — competitors + roadmap

---

**Last Edit:** April 26, 2026 — v11 Phase 5 tiered evidence-ranking complete
**Next Review:** First Sunday of May 2026 (Ajsa weekly review + check: Bazaar listing visible? Reddit API approved? v2 tier-promotion running stably?)



