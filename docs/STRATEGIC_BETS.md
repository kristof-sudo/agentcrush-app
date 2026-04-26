# AgentCrush — Strategic Bets
**Created:** April 23, 2026
**Last updated:** April 26, 2026
**Owner:** Kris
**Review cadence:** Weekly (Ajsa surfaces signals), Monthly (Kris reviews + prunes)
**Companion documents:** `DASHBOARD_vN.md` (state), `EXECUTION_PLAN.md` (tasks)

---

## What this document is

This file tracks the strategic bets AgentCrush is placing on the future shape of the AI agent ecosystem. It is not a list of tasks. Tasks live in the execution plan. This is *why* we do what we do.

A bet is something that could fail because the world didn't develop the way we predicted. Each bet has:
- **Thesis:** what we believe about the future, in 2-3 sentences
- **Evidence for / against:** current signals, updated as they arrive
- **Dependent actions:** what we're doing because of this bet
- **Retirement criteria:** what would make us stop betting on this (if we can't name it, we'll never stop)
- **Last reviewed:** to force freshness

## How to use it

- **Weekly:** Ajsa's Sunday review includes a section that scans new signals against each active bet. She flags amplify-worthy, kill-worthy, or neutral.
- **Monthly (Strategy Day):** Kris reads the whole doc, updates it, makes explicit keep/kill/add decisions.
- **Before any big resource decision:** check which bets it serves. If it doesn't serve an active bet, question whether to do it.

Maximum active bets: 8. If you need to add a ninth, retire one first.

---

## ACTIVE BETS

### Bet A: A2A closed ecosystem (Coinbase / x402 / Bazaar)

**Thesis:** Coinbase's CDP facilitator + x402 protocol becomes the dominant rail for machine-to-machine commerce, carrying institutional weight from Visa, Stripe, Google, and Cloudflare. AgentCrush, as a Bazaar-listed reputation layer sitting in the institutionally-endorsed "identity/trust" value-accrual slot, positions as infrastructure for whichever enterprise-grade player captures the majority share.

**Evidence for:**
- Coinbase + Cloudflare co-founded x402 Foundation
- Stripe shipped x402 on Base in Feb 2026; building Tempo L1 with Paradigm
- Visa built Trusted Agent Protocol with x402 interoperability
- $46.5M cumulative x402 volume, 165M transactions
- CoinGecko sits at #8 in Bazaar leaderboard — the "data" slot is validated
- AgentCrush now live on Base mainnet with first successful machine payment (Apr 22)

**Evidence against:**
- 95% of 2025 x402 volume was memecoin-driven per Visa's Cuy Sheffield
- Weekly volume peaked Nov 2025 at $5.3M, declined 96% by Feb 2026
- Real enterprise adoption still nascent
- Dexter's zero-fee facilitator model risks commoditizing the layer before AgentCrush establishes position
- Our Bazaar listing still not indexed as of Apr 24 (2+ days post first payment) — needs investigation if not visible by Apr 26

**Dependent actions:**
- Ship additional x402 endpoints (verification-status, history, relationship-graph)
- Maintain Bazaar metadata quality across all endpoints
- Monitor Stripe x402 revenue disclosure, frontier LLM USDC integrations, named enterprise deployments
- Engage publicly in x402 Discord and Coinbase DevRel

**Retirement criteria:** If by October 2026 we see fewer than 100 machine-paid calls cumulatively AND no major enterprise (F500 or widely-known SaaS) has publicly deployed x402 AND x402 monthly volume hasn't recovered past $5M, materially reduce investment here.

**Last reviewed:** April 24, 2026

---

### Bet B: A2A open-source ecosystem (Fetch.ai / ERC-8004 / decentralized agent economy)

**Thesis:** A parallel open-standard stack for agent identity, coordination, and commerce develops alongside the closed Coinbase-led ecosystem. Winner is not determined yet; being present on both sides preserves optionality. AgentCrush stays multi-registry-neutral, publishing reputation attestations to ERC-8004 and registering on Agentverse while keeping Bazaar as the primary commerce surface.

**Evidence for:**
- 70,000+ agents registered across ERC-8004 on Ethereum, Base, BNB (March 2026)
- Ethereum Foundation dAI team actively driving adoption; co-authored ERC-8183 with Virtuals
- ASI Alliance real activity; ASI:One launched on Product Hunt April 2026
- Fetch has institutional partnerships
- Virtuals Protocol demonstrating $1.4M/mo protocol fees, $480M+ aGDP

**Evidence against:**
- Fragmentation risk: h402 (BitGPT), EVMAuth (Radius) as competing standards
- Open systems tend toward whoever has the most traction first — could be a Coinbase-led winner even in this lane
- ERC-8004 transferability concerns (reputation can be moved with NFT transfer)
- Solo builders and small teams may never care about being on-chain

**Evidence for (updated Apr 26):**
- ERC-8004 Phase 1 reader prototype complete: 8004scan.io public API accessible, no auth, 163,000+ registered agents
- First overlap scan: 2/20 AgentCrush evidence-ranked agents matched (10% overlap rate — meets Phase 2 gate)
  - `agentlab` → Ethereum mainnet, token #9634
  - `crewai` → Base mainnet, token #17997, **x402_supported: true** (same stack as AgentCrush seller)
- CrewAI's ERC-8004 registration on Base with x402 support is the first concrete evidence of ERC-8004 + x402 stack overlap in the wild
- `agent_erc8004_registrations` table live; sync script writes confirmed matches; profile pages and trust-summary API now surface registration state

**Dependent actions:**
- ✅ ERC-8004 exploration phase complete — `docs/ERC8004_INTEGRATION_EXPLORATION.md` written
- ✅ ERC-8004 reader v1 shipped — storage, profile surface, API surface
- ⬜ ERC-8004 v2 ingestion (go/no-go pending: run full evidence_ranked scan, present to Kris)
- ⬜ ERC-8004 v3 writer (gate: v2 scoring stable ≥8 Sunday runs + legal review)
- ⬜ Fetch.ai / Agentverse registration — not started
- Multi-registry neutrality maintained in schema and strategy

**Retirement criteria:** If by August 2026 ERC-8004 registrations plateau (under 10% quarterly growth) AND no meaningful application layer emerges on top of the standard AND a clear closed-ecosystem winner captures >80% of machine commerce volume, reduce this lane to maintenance-only.

**Last reviewed:** April 26, 2026

---

### Bet C: Near-term cash through writing + consulting + services

**Thesis:** The 12-18 month AgentCrush bet needs a bridge. Service revenue (x402 implementation consulting, technical writing that generates leads, Ajsa-derived market intelligence) uses existing skills and infrastructure, produces revenue in weeks rather than months, and compounds AgentCrush's credibility rather than competing with it. Do not build a second product; sell services that reuse the existing stack.

**Evidence for:**
- AgentCrush successfully shipped a working x402 seller on Base mainnet with real payment — rare expertise, genuinely valuable
- Kris has working knowledge of CDP SDK versioning issues, Next.js 16 middleware-to-proxy migration, EIP-3009 self-payment rejection — all documented
- Ajsa's output will naturally produce market intelligence someone would pay for
- Writing is zero marginal cost; the same content can double as AgentCrush marketing

**Evidence against:**
- Service revenue doesn't scale
- Consulting can eat time from AgentCrush core work
- Requires audience that barely exists today
- "Technical blog → leads" timeline is typically 2-3 months minimum
- Kris has resisted cold outreach as a channel; warm audience doesn't exist yet

**Dependent actions:**
- Ship the x402 post-mortem blog post within 2 weeks of Ajsa v1 going live
- Launch free daily Ajsa brief publicly (Farcaster + newsletter signup)
- Offer x402 implementation consulting in Coinbase/CDP Discord and Farcaster after blog post lands
- Keep pricing draft for paid intelligence brief ready, but do not launch before Ajsa has 4+ weeks of production stability

**Retirement criteria:** If after 90 days of consistent writing + public engagement no paid interest has materialized (no inbound DM, no consulting request, no paid brief subscriber), the audience isn't there on this timeline. Rethink either the audience (wrong segment) or the approach (wrong format). Do not simply keep pushing the same offers.

**Last reviewed:** April 24, 2026

---

### Bet D: Acquihire optionality (not a lead bet — a posture)

**Thesis:** AgentCrush may become an attractive acquisition target in 12-24 months for a player in the identity/trust layer or for a strategic investor backing one. The path to acquirability is the same as the path to being a good product: deep data moat, working methodology, clean infrastructure, ecosystem integration. This bet does not change daily decisions — it keeps certain doors open.

**Potential strategic acquirers / partners (mental list, not pitch list):**
- **Kite AI** — direct architectural fit, $368M cap, known to acquire data/methodology layers
- **Coinbase or Coinbase-portfolio company** — natural for x402-era trust infrastructure; Coinbase Ventures has agent-economy thesis
- **YZI Labs (formerly Binance Labs)** — actively investing in agentic infrastructure, RWA, and crypto+AI intersection. Portfolio companies frequently become acquirers themselves. Their thesis overlap with AgentCrush is strong.
- **Y Combinator / YC alumni network** — less acquisition path, more partnership/customer/competitive intel. Each batch surfaces 3-5 AI agent companies that could become AgentCrush customers, partners, or competitors. Worth monitoring as ecosystem signal.
- **ERC-8004 ecosystem company** — whichever player builds the dominant reputation/identity application layer on the standard
- **Virtuals Protocol or Fetch-adjacent acquirer** — open-ecosystem side counterpart

**Evidence for:**
- Identity/trust layer explicitly named as value-accrual layer in institutional research (Khala report, Apr 2026)
- No current competitor occupies the "ranked, algorithmic, decision-grade, machine-callable" niche
- Small strategic acquisitions in this space happen regularly ($500K-$5M range for early teams with unique data)
- AgentCrush data moat (historical daily snapshots, ecosystem graph) is inherently uncopyable
- Multiple potential acquirers in active investment posture (YZI Labs, Coinbase Ventures, Paradigm portfolio)

**Evidence against:**
- Most "built to acquire" founders don't get acquired; intentional acquihires are rare
- Window closes if a $300M+ player decides to build the same thing in-house
- Exit-focused thinking can lead to shipping the wrong things (theater for buyers vs. utility for users)

**Dependent actions:**
- Never say this bet out loud publicly
- Never take VC money (dilutes cap table, complicates exit)
- Never launch own token (regulatory overhang, community drama)
- Integrate with ERC-8004 as one output channel (makes us plug-and-play for any acquirer in that ecosystem)
- Keep infrastructure clean, boring, easily due-diligenced
- Monitor potential acquirers' portfolio moves via Ajsa (YZI Labs, YC, Coinbase Ventures, Paradigm, Virtuals Protocol)

**Retirement criteria:** This bet never gets retired — it becomes irrelevant. If AgentCrush becomes self-sustaining at $10K+ MRR, the acquihire frame becomes secondary to "should we actually want to sell?" If AgentCrush fails to find product-market fit by end of 2027, the frame also becomes irrelevant. Review annually, not monthly.

**Last reviewed:** April 24, 2026

---

## BETS EXPLICITLY NOT MADE (so they stop resurfacing)

- **Newsletter as standalone product** — saturated market, no differentiation. Rejected Apr 20.
- **$29/mo paid verification for builders** — wrong audience for that price. Rejected Apr 20.
- **Pivot to non-AI audience** — rejected Apr 20 as imposter syndrome masquerading as strategy.
- **Full commitment to ERC-8004 as exclusive registry** — rejected Apr 23; multi-registry neutrality is correct posture.
- **Launch native token** — reduces acquirability, regulatory risk, community drama. Rejected Apr 23.
- **Second product (non-AgentCrush SaaS)** — rejected Apr 23; services yes, new product no.
- **Mike persona revival on X** — account permanently dead. Confirmed Apr 23.
- **Automated X scoring signal** — deferred indefinitely. X's own pricing makes API automation expensive (per-URL post pricing); risk of new account suspensions remains. Rejected Apr 24.
- **Product Hunt and Farcaster as scoring signals** — these are Ajsa monitoring inputs (catalyst/event evidence), NOT scoring signals. Cleaner separation: hard evidence (GitHub, downloads, dependency graph, docs, HN, Reddit) feeds the scoring formula; catalyst signals (Product Hunt, Farcaster) feed Ajsa's brief. Decided Apr 24.

---

## REVIEW LOG

**April 23, 2026 (creation):** Four bets initialized. Bet A (A2A closed) is the most established — we have working product. Bet B (A2A open) is exploration-phase. Bet C (near-term cash) is unproven, has no signal yet but highest time-urgency. Bet D (acquihire) is posture, not action.

**April 24, 2026 (incremental update):** Added YZI Labs and Y Combinator to Bet D's potential acquirers/partners list. YZI Labs as strong potential acquirer aligned with crypto+AI thesis; YC as ecosystem-monitoring channel. No bet changes. Also clarified scoring signal architecture — Product Hunt and Farcaster confirmed as Ajsa monitoring inputs, not scoring signals. Reddit confirmed as the sole social/discourse scoring signal in current Layer 1B.

**April 26, 2026 (Phase 5 update):** No bet changes. Confirming momentum on Bet A — tiered evidence-ranking model shipped, x402 trust-summary/history now return `tier` field, first machine payment landed Apr 22, Farcaster reactivated as distribution channel via Neynar. Bet A signals remain positive. Reddit scoring still blocked pending API approval; this affects Bet A's signal coverage but does not change the bet. HN signal integration live. Package-download timer active. v2 scoring stability to be confirmed over coming Sunday tier-promotion runs before any Bet A re-evaluation is warranted.

**April 26, 2026 (ERC-8004 v1 + comparison pages update):** Bet B advances from exploration to v1 live. ERC-8004 reader prototype confirmed 10% overlap rate with evidence-ranked agents. `agent_erc8004_registrations` table live. Profile pages and trust-summary/verification-status APIs now surface ERC-8004 state via service role key. Key finding: CrewAI's ERC-8004 registration is on Base with `x402_supported: true` — this is the first confirmed real-world overlap between the ERC-8004 open ecosystem and the x402 closed ecosystem. Strengthens both Bet A and Bet B simultaneously. Phase 2 (ingestion discovery) go/no-go pending after full evidence_ranked scan. Comparison pages scaffold v1 also shipped — new SEO surface for discovery. No bet changes. Multi-registry neutrality confirmed.

**Next monthly review:** First Sunday of June 2026

---

**End of document.**
