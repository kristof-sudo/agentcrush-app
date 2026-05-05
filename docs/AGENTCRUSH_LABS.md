# AgentCrush Labs — Working Backlog

**Created:** 2026-04-28
**Owner:** Kristof
**Purpose:** Operational backlog for monetization and service experiments. Not a public doc.

---

## What AgentCrush Labs is

The service arm of AgentCrush. A place to test paid offers that reuse the existing stack and increase credibility without distracting from the core product.

Labs exists to:
- Generate early revenue while the ranking product matures
- Produce public case studies (e.g. "how AgentCrush made its own API machine-payable")
- Surface real-world agent-commerce problems that improve AgentCrush's index and scoring
- Give Kristof a structured way to take on implementation work without it leaking into the product roadmap

---

## What it is not

- A second SaaS product
- A consulting firm
- A replacement for the core AgentCrush ranking/intelligence product
- An excuse to build custom tooling outside the AgentCrush stack
- A reason to spend more than 10–15% of weekly time unless revenue is appearing

---

## Current thesis

Agent commerce readiness is poorly understood. Most APIs, startups, and traditional businesses have not thought through whether agents can discover, understand, pay for, and verify their services. AgentCrush has already done this for itself. That is a sellable advantage.

Short window: early implementations will drive differentiation. Demand will grow as protocols mature.

---

## Offers under consideration

### Offer 1: Agent Commerce Readiness Audit

**Status:** Draft — not yet promoted

**Target:** AI agent startups, API/data providers, crypto AI projects, traditional companies exploring agentic commerce

**Supporting evidence (May 2026):** The agent-commerce stack is expanding beyond x402. Stripe now offers Link / Single-Purpose Tokens for consumer-agent purchasing through existing merchant rails. Visa's stablecoin settlement infrastructure covers nine blockchains including Base at $7B+ annualized run rate. Kite Mainnet launched Agent Passport as a programmable wallet / spending-control layer. Businesses now need to answer whether agents can discover, understand, pay for, and verify their services across Stripe Link/SPT, x402, AP2, Kite Passport, MCP, and other rails. The audit scope — and the value of getting it right — has grown.

**Deliverable:** 5–8 page report covering the full agent-commerce stack:
- Can an agent discover your service? (x402.json, Bazaar, MCP, A2A, Agentverse, Tempo MPP)
- Can an agent understand your API? (schema, docs, machine-readable spec, MCP tool definitions)
- Can an agent pay you? (x402, Stripe ACP / SPTs, ERC-8183 escrow, Visa CLI, Tempo MPP, or none)
- Can an agent verify what it received? (response schema, evidence format, ERC-8004 reputation surface)
- Can a merchant trust the agent? (Experian Agent Trust / KYA, Visa Trusted Agent Protocol, Skyfire — TradFi-side agent identity layer launched April 30, 2026; parallel to crypto-side ERC-8004)
- Is there a human override path? (CROPS-aligned: Censorship Resistance, Open-source, Privacy, Security)
- Which protocol surfaces should you support first, given your audience and risk profile?
- Prioritized implementation roadmap with cost/effort estimates per surface
- Explicit "skip this" list — which standards you can safely ignore today

**Positioning:** "Most teams adopting agent commerce don't know which of x402, ACP, ERC-8004, ERC-8183, ERC-8211, MCP, Tempo MPP, or Visa CLI they actually need. We tell you which to ship, in what order, and which to ignore. We've done it ourselves on AgentCrush — three live x402 endpoints on Base mainnet, two confirmed ERC-8004 cross-protocol matches, MCP server v0 — and we have the post-mortem and case studies to prove it."

**Pricing draft:**
- Free teardown for 1–2 public examples (content / case study)
- $299 audit for startups
- $1,000+ implementation roadmap for companies
- Custom quote if build support is wanted

**Pricing rationale:** $299 is calibrated to be a no-friction decision for a funded agent project; $1,000+ implementation roadmap is for teams that want a written plan, not just a diagnosis. Keep both prices stable through first 5 audits before reviewing.

**Activation gates (current state):**
- ✅ Public case study #1: x402 discovery post-mortem (live at /blog/x402-discovery-postmortem)
- ⬜ Public case study #2: First cross-protocol agent (CrewAI ERC-8004 + x402 worked example) — in draft
- ⬜ Public case study #3: Free Agent Commerce Readiness Audit on a high-visibility agent — in draft
- ⬜ First inbound interest from public outreach (Coinbase DevRel Discord, x402 Foundation, Daydreams, Virtuals communities)
- ⬜ First paying audit customer — target by July 4, 2026

---

### Offer 2: x402 / Machine-Payable API Implementation

**Status:** Draft — not yet promoted

**Target:** Data APIs, AI tools, scraping/browser/image/search services, agent marketplaces, crypto AI projects

**Deliverable:**
- x402 endpoint implementation (Next.js middleware or standalone)
- Pricing metadata + discovery declarations
- Buyer test script
- Bazaar/Agentic.Market listing checklist
- Docs for handover

**Differentiator:** AgentCrush has live, indexed x402 endpoints on Base mainnet. We have already debugged the full implementation path including discovery metadata, output schema, CDP index propagation, and paid settlement. This is not theoretical.

---

### Offer 3: Traditional-Industry A2A Readiness

**Status:** Monitor — not yet promoted

**Target:** Logistics, warehousing, ecommerce ops, freight forwarding, customs brokerage, procurement-heavy SMEs, trade companies

**Core idea:** A2A commerce means companies will need machine-readable quoting, booking, availability, documentation, payment, and status endpoints. Most do not know this yet.

**Kristof's edge:** Logistics, warehousing, China/EU trade operations, multi-party coordination experience.

**Example flow to explain:**
1. Buyer agent requests freight quote
2. Warehouse agent checks availability
3. Customs agent checks document completeness
4. Finance agent approves payment
5. Monitoring agent tracks shipment and escalates exceptions
6. Human approves only exceptions above threshold

**Deliverable:** Readiness report + protocol mapping. Build only if inbound appears.

---

### Future idea: Offers / Credits / Referral layer

**Status:** Monitor — 2026-04-28

Agents may route buying decisions through machine-readable discovery, trust/evidence, price, reliability, and incentives — not ads. A clearly labeled offers/credits/referral surface for API providers and agent tools could be a natural AgentCrush monetization layer.

**AgentCash insight (2026-04-28):** Ads are one route to conversion, but agents doing autonomous purchasing may be more influenced by structured signals (price, trust score, reliability, machine-readable terms) than by ad placement. Potential future surface: an opt-in AgentCrush offers/credits layer where providers pay for featured placement or referral tracking in the intelligence graph.

**Decision:** Monitor now, do not build. Revisit if:
- inbound interest from API providers appears
- Ajsa surfaces repeated demand for this pattern
- x402/MCP/agent-commerce traffic on AgentCrush grows meaningfully

---

### Future idea: AgentCash-style API Discovery / Payment Intelligence

**Status:** Monitor

A future product direction: sell structured intelligence about which APIs are machine-payable, what they cost, how they perform, and how to discover them. Similar to what AgentCash explores, but built on AgentCrush's evidence graph.

**Decision:** Do not build now. The core index must be stronger first. Revisit in month 3+.

---

## Rules

1. **Paid offers must never affect rankings.** Labs revenue cannot influence scoring, tier assignment, or evidence weighting. Any paid customer gets the same ranking treatment as any other agent.
2. **Sponsored / referral / credits surfaces must be clearly labeled.** No dark patterns. Users and agents must be able to tell what is organic vs promoted.
3. **Labs must reuse AgentCrush infrastructure.** No separate database, separate ingestion, separate domain. Labs content feeds back into the index.
4. **No more than 10–15% of weekly time** on Labs unless revenue is appearing or a specific client is engaged.
5. **Every offer must produce a public artifact.** Case study, post-mortem, or `/labs` page copy. If it cannot be shared, it probably should not be done.

---

## Activation gates

At least one of these must be true before activating an offer:

- [ ] A public case study exists for that offer type
- [ ] Inbound interest has appeared (DM, email, referral)
- [ ] Ajsa has surfaced the same demand signal 3+ times in briefs
- [ ] The relevant x402/MCP/API surface is stable and documented
- [ ] Kristof has available time beyond the core product sprint

---

## Parking lot

Ideas that may become offers later. Not prioritized.

- MCP server implementation for API providers
- Agent identity claim + verification service
- Agentic.Market / Bazaar listing service (for providers who want to be indexed faster)
- "Agent-ready" certification badge (paid, clearly labeled, no ranking effect)
- Evaluator-agent commissioning for startups building A2A commerce
- Bittensor subnet intelligence reports (if subnet economy grows)

---

## Rejected / not now

- Token
- Paid builder verification that affects ranking
- Standalone newsletter (Mike's posts serve this function)
- White-label AgentCrush index for other projects
- Exclusive partnership with any single protocol (x402, ERC-8004, ACP, etc.)
- Labs as a separate brand or domain
- Any offer requiring expensive infrastructure before revenue

---

## Monetization + distribution backlog (May 5 snapshot)

These are ideas evaluated during the May 5 strategy session that
were not scheduled for May 6–8 execution. They are logged here so
they aren't lost or re-derived. Status defines what triggers a
revisit; do not promote items without the gate condition being met.

| ID | Idea | Effort | Status | Gate (when to revisit) |
|---|---|---|---|---|
| A1 | Paid tier on existing x402 endpoints (premium = deeper data) | 1–2 days | Build later | Confirmed buyer demand from existing endpoint usage logs (≥10 paid calls/week on at least one endpoint) |
| A2 | Methodology-as-a-service x402 endpoint (versioned, machine-readable) | 1 day | Build later | At least one external request for machine-readable methodology JSON |
| A4 | Paid MCP tools (hybrid free/paid; e.g. get_history_timeseries, forecast_trajectory, evidence-tier-filtered compares) | 2 days | Build later | ≥3 paid x402 customers exist — proves payment muscle before splitting MCP surface |
| B2 | Vault / company-brain structure as Gumroad product ($19–49 one-time) | 1 day to package | Build later — clarify | Edge case vs. not-now list "second product" rule. Revisit only after explicit re-evaluation in a strategy session |
| B3 | Quiet investor / fund-side briefings (Pantera, Coinbase Ventures, DCG, YZI Labs) | 1 day per scoping | Response offer only | Inbound from a fund. Never proactively scoped or marketed. Aligns with Bet D rule (see STRATEGIC_BETS.md) |
| C1 | Discovery-as-a-Service: register a client across Bazaar + Agentverse + ERC-8004 + Kite Passport-aware catalogs, with one dashboard | 1 day per client | Build later | At least one inbound asking for Bazaar listing help OR audit customer asks for implementation. Pricing target: $499–$999 |
| C3 | Expedited claim verification ($49 one-time, speed-only, no ranking effect) | 1 day | Monitor | Depends on auth layer build. Narrowly distinct from rejected $29/mo badge — one-time and speed-only, not subscription |
| D2 | x402 endpoint over agent_erc8183_jobs data (`/api/jobs/[handle]`) | +0 days downstream of reader | Build later | ERC-8183 reader passes go/no-go (cross-ref INTELLIGENCE_BACKLOG.md ERC-8183 entry). Reader build first, endpoint second |
| D3b | OpenClaw "agentcrush" skill on ClawHub | 1 day | Monitor | Coverage-not-membership scoping needed first. Confirm posture won't read as ecosystem allegiance before publishing |
| D3c | uAgents-compatible skill / Agentverse adapter for AgentCrush data | 1–2 days | Monitor | Wait for signal that Agentverse is driving real traffic / inbound to @agentcrush profile |

### Notes per ID

**A1 — Paid tier on x402 endpoints.** Same code path, gated by
payment amount. Premium returns longer history window, cross-protocol
joins, raw signal breakdowns. Differentiator that doesn't require
new endpoints. Don't build until usage logs show buyer demand.

**A2 — Methodology-as-a-service.** Pay-per-call endpoint returning
the current scoring methodology JSON (weights, signals, last-updated,
version). Buyers: framework builders, audit clients, competitors
seeking transparent benchmarking. Differentiated from `/how-we-rank`
because it is machine-readable, versioned, and supports agent
self-monitoring.

**A4 — Paid MCP tools.** Hybrid free/paid MCP servers are rare.
Aligns with the "AgentCrush as machine-readable intelligence"
positioning. Holding until paid x402 motion is proven, so we don't
fragment the buyer surface.

**B2 — Vault as Gumroad product.** Lab 1 outputs (CLAUDE.md template,
folder structure, lint prompt, lab-session-template, Cross-Lab
Decision Table) could be packaged as a digital download for other
solo founders. Edge case versus the not-now list rejection of
"second product" — this is one-time download, not SaaS, not
white-label index, but the rule is broad enough that an explicit
re-evaluation is required before building.

**B3 — Quiet investor briefings.** Bet D mental list explicitly
includes Pantera, Coinbase Ventures, DCG, YZI Labs. AgentCrush has
unique data on which agents are real and which catalysts hit.
Quarterly briefings are something funds pay for. The rule is
strict: never proactively scoped, never marketed, never promised.
This is a response offer only — only build the briefing if a fund
inbounds asking for one. Visible scoping risks performing Bet D.

**C1 — Discovery-as-a-Service.** Reuses adapter infrastructure
already on the build queue. High fit because it operationalizes
the "publish AgentCrush across multiple registries" methodology
into a paid service for clients who want the same coverage.

**C3 — Expedited claim verification.** Schema already has
claim_requests. The previously rejected $29/mo badge would have
affected ranking perception; this offer is one-time, speed-only,
and grants no score bonus. Worth scoping if/when the auth layer
is built.

**D2 — ERC-8183 jobs endpoint.** Once ERC-8183 reader passes
go/no-go, agent_erc8183_jobs data feeds a paid `/api/jobs/[handle]`
endpoint. Zero incremental build cost beyond the reader. Already
implicit in INTELLIGENCE_BACKLOG.md ERC-8183 entry; this is the
explicit downstream monetization surface.

**D3b — OpenClaw skill.** Publishing a `agentcrush` skill on
ClawHub follows the fetch-agents pattern: SKILL.md + scripts +
bash wrappers. The hesitation is positioning — AgentCrush has
declined to "join" OpenClaw as a faction. A published skill is
coverage, not membership, but the framing needs to be deliberate
to avoid reading as ecosystem allegiance. Re-scope before publishing.

**D3c — uAgents / Agentverse adapter.** AgentCrush is now
registered on Agentverse (May 5). The skill / adapter would let
other Agentverse agents query AgentCrush data via ACP shape.
Hold until Agentverse traffic to @agentcrush profile shows it's
worth the build.

---

## Rejected (logged with reason)

These ideas were evaluated and rejected. They are recorded here
so future strategy sessions don't re-derive and re-evaluate them
from scratch. Revisit only if the rejection reason changes.

| ID | Idea | Rejection reason |
|---|---|---|
| B4 | Frame-based AEB premium subscription | Functionally a paid newsletter. Inherits the existing newsletter rejection |
| C4 | Sponsored slots on comparison pages (clearly labeled) | Too close to ranking-influence territory at current trust level. Revisit only after first paying audit closes |
| E1 | Free REST API mirror of indexed data | Dilutes paid x402 endpoint demand. The free MCP server already serves read-only access |
| E2 | Affiliate links to indexed agents | Affects ranking trust. Hard rejection — same family as paid placement |
| E3 | Email newsletter | Pre-existing rejection. Still rejected |

---

## How to use this backlog

- **Don't pull from this list speculatively.** Each item has a
  gate. Wait for the gate.
- **When a gate trips,** promote the item from this section into
  one of the active offer sections above with an Activation Gates
  block.
- **Update this section** when ideas are added, when statuses
  change, and when items are rejected. Newest at top within each
  table.
- **Cross-reference,** don't duplicate: if an item has a home
  elsewhere (ERC-8183 in INTELLIGENCE_BACKLOG, Bet D in
  STRATEGIC_BETS), reference rather than re-explain.

---

## Operating note: scheduled May 6–8 (not in this backlog)

These items were scheduled for May 6–8 execution and are tracked
in the dashboard, not in this backlog:

- **C2** — Reframe verification-status endpoint as x402 onboarding
  tool. Folded into the cross-protocol blog post and `/developers`
  page on May 6.
- **B1** — Field Lab outputs explicitly tied to Farcaster
  cross-promotion. Wired into Field Lab session prompts and
  Farcaster doc on May 7.
- **D1** — Lab 5 → CrewAI audit case study #2 pipeline
  operationalized. Wired into Lab 5 prompt and audit outline on
  May 7.
- **D3a** — Claude Code skill (the first of three D3 sub-items).
  Selected as the highest-leverage skill packaging because it eats
  AgentCrush's own dog food and matches the existing user base.
  Build target: after A3 ships.
- **A3** — Agent Economy Index machine-readable x402 endpoint.
  Build target: May 8, conditional on F shipping cleanly on May 6.

If any of the May 6–8 items slip, slide subsequent items by the
same delay. F always wins; A3 always slips first.
