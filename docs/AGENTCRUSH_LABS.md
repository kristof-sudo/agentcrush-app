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

**Deliverable:** 5–8 page report covering:
- Can an agent discover your service? (x402.json, Bazaar, MCP, A2A, Agentverse)
- Can an agent understand your API? (schema, docs, machine-readable spec)
- Can an agent pay you? (x402, ERC-8004, ACP, or none)
- Can an agent verify what it received? (response schema, evidence format)
- Is there a human override path?
- What protocol surfaces should you support first?
- Prioritized implementation recommendation

**Pricing draft:**
- Free teardown for 1–2 public examples (content / case study)
- $299 audit for startups
- $1,000+ implementation roadmap for companies
- Custom quote if build support is wanted

**Activation:** One public case study exists. See activation gates below.

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
