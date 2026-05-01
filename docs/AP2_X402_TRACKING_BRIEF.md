# Agent Commerce Stack: what AgentCrush should track

**Created:** May 1, 2026 (as AP2 vs x402 brief)
**Expanded:** May 1, 2026 (to full agent-commerce stack taxonomy)
**Owner:** Kris
**Purpose:** Internal reference for how AgentCrush distinguishes and tracks the full agent-commerce protocol stack without building adapters or taking protocol positions.

---

## Core distinction

Agent commerce is not one protocol — it is a stack. Each layer answers a different question. They are not competitors.

### Stripe Link / Issuing for agents

Consumer-agent purchasing through existing merchant and card rails.

Stripe Link answers:
- Can an agent complete a purchase through a standard merchant checkout flow?
- Can the agent use a one-time virtual card or Single-Purpose Token (SPT)?
- Does the human owner approve the purchase?
- Are future spending controls possible?

Stripe Link routes agent purchases through Stripe's existing merchant rails. It does not require merchants to change their checkout. The human retains approval authority. This is the "buy things on the internet" layer for agents.

### x402

HTTP-native payment and resource discovery for machine-callable services.

x402 answers:
- Can this HTTP resource ask for payment?
- Can an agent pay per request?
- Can the payment settle cheaply and programmatically via stablecoin?
- Can a service be discovered as machine-payable (via `.well-known/x402`, CDP discovery, Agentic.Market)?
- Can an API monetize without API keys or subscriptions?

x402 is where the resource sits and how it gets paid. It is visible at the HTTP layer. AgentCrush already has live x402 endpoints listed in CDP discovery on Base mainnet.

### AP2 (Agent Payments Protocol)

Agent payment authorization, intent declaration, constraints, auditability, and human-present / human-not-present transaction governance.

AP2 answers:
- Did the user authorize this agent to take this action?
- What constraints did the user give?
- Can a merchant or payment provider verify intent?
- Who is accountable if something goes wrong?
- Can an autonomous (human-not-present) payment be audited after the fact?

AP2 is the authorization wrapper around a transaction — governance at the agent-identity layer. Google donated AP2 v0.2 to the FIDO Alliance in April 2026. Mastercard's Verifiable Intent framework is being contributed alongside it.

### Kite Mainnet / Agent Passport

Programmable wallet, identity, and spending-control layer for agents.

Kite Passport answers:
- Can the agent's spending be scoped to specific sessions, services, or limits?
- Is the agent operating within human-defined constraints?
- Can a wallet be tied to an agent identity and audited?
- Can governance rules be enforced programmatically across protocols?

Kite positions as a cross-protocol layer, declaring interoperability with x402, AP2, MPP, and MCP. Agent Passport is the "scoped wallet governance" layer — humans set limits, agents operate within them.

### Visa stablecoin settlement

Institutional settlement abstraction for cross-border and cross-chain stablecoin transactions.

Visa settlement answers:
- Can a stablecoin payment settle through institutional payment rails?
- Which blockchains are settlement-grade for enterprise use?
- Is Base a production-ready settlement network for agent commerce?

Visa's stablecoin settlement infrastructure now covers nine blockchains including Base, with a reported $7B annualized settlement run rate. Base is explicitly framed for agentic commerce. This is the institutional confirmation layer — it means stablecoin transactions on Base can settle through Visa's network, bridging crypto-native agent commerce to traditional enterprise payments.

### MCP (Model Context Protocol)

AI-client and tool interface. Not a payment rail. MCP gives LLM clients structured access to tools, context, and data. AgentCrush already exposes an MCP server.

MCP answers:
- Can an AI client call this tool?
- What does this tool return?
- What arguments does it take?

MCP and x402 can coexist at the same endpoint: MCP defines the interface, x402 can gate access behind payment.

### ERC-8004 / ERC-8183

On-chain agent identity, registry, and job/evaluator commerce lifecycle.

ERC-8004 answers: Is this agent registered on-chain? Who is the owner? What networks is it active on?

ERC-8183 answers: Can agents transact in a structured job lifecycle (request → negotiation → escrow → evaluation → settlement)? Who are the evaluator agents?

### How the stack relates

```
Human approval / spending control:   Stripe Link / Kite Passport (governance, SPTs, scoped wallets)
          ↓
Authorization / intent / audit:      AP2 + Mastercard Verifiable Intent (auditability, HNP governance)
          ↓
HTTP payment / resource layer:       x402 (per-request stablecoin payment, machine discovery)
          ↓
Job lifecycle / evaluator layer:     ERC-8183 / ACP (structured commerce, escrow, evaluation)
          ↓
Identity / registry layer:           ERC-8004 (on-chain agent identity, ownership)
          ↓
Tool / interface layer:              MCP (structured tool calls, context, schema)
          ↓
Institutional settlement:            Visa stablecoin (enterprise cross-chain settlement abstraction)
```

A well-designed agent-commerce service could support multiple layers simultaneously. AgentCrush should track which agents and services support which, and at what confidence tier.

### AgentCrush

Protocol-neutral market intelligence layer tracking agents across all of these surfaces.

AgentCrush tracks. AgentCrush does not choose.

---

## What AgentCrush should track per agent / service

| Signal | Notes |
|---|---|
| x402 support | Is the service callable with x402? Listed in CDP discovery / Agentic.Market? |
| AP2 support | Does the service declare AP2 or FIDO Verifiable Intent support? (public metadata only) |
| Stripe Link / SPT support | Can the service be purchased via Stripe Link or Single-Purpose Token? (consumer purchasing layer) |
| Kite Passport compatibility | Does the agent or service declare Kite Passport / scoped wallet support? |
| MCP support | Is there a machine-readable MCP endpoint? |
| ERC-8004 registration | Is the agent registered on-chain with verifiable ownership? |
| ERC-8183 / ACP job lifecycle | Does the agent participate in structured job/evaluator commerce? |
| Agentic.Market / Bazaar presence | Is the service listed and indexed? |
| CDP discovery metadata quality | Is the discovery metadata complete (pathParamsSchema, output.example)? |
| Payment method / asset / network | Stablecoin, card, wallet, bank rail, network (Base, Ethereum, etc.) |
| Settlement network | Is the service on a Visa-settlement-supported chain (Base, etc.)? |
| Authorization / intent support | AP2, Mastercard Verifiable Intent, Kite governance — if publicly declared |
| Human-present vs human-not-present capability | If publicly declared |
| Evidence tier | Verified onchain / public API / marketplace-reported / public webpage / self-reported |

Every tracked signal must carry its evidence tier. Do not mix verified and self-reported without a label.

---

## What AgentCrush should not do now

- No AP2 adapter. AP2 does not yet have a public registry or structured API AgentCrush can ingest.
- No Stripe Link adapter. Stripe Link is a consumer purchasing tool, not an agent registry. Nothing to index yet.
- No Kite Passport adapter. Monitor Kite's registry/API surface — build only when structured public data exists.
- No protocol favoritism. AgentCrush tracks all layers as separate surfaces. None gets a scoring advantage.
- No scoring weight changes. Self-declared stack support is not a scoring signal without a verifiable, structured data source.
- No claim that any single protocol is "the winner." The stack layers are complementary and may coexist indefinitely.
- No ranking impact from self-reported support. An agent self-declaring Kite or AP2 support without a verifiable source does not affect evidence score.

---

## AgentCrush positioning

Use:
- "tracks agents across x402, AP2, MCP, ERC-8004, and emerging payment and authorization rails"
- "protocol-neutral market intelligence"
- "indexes signals from multiple payment, authorization, and commerce standards"
- "agent commerce stack coverage: discovery, payment, authorization, identity, settlement"

Avoid:
- "built on x402"
- "AP2 reputation layer"
- "the x402 trust provider"
- "the Kite intelligence layer"
- any language implying AgentCrush belongs inside one protocol

---

## Future use

**Agent Economy Index V1 — protocol taxonomy**
Add x402, AP2, Stripe Link/SPT, Kite Passport, MCP, ERC-8004, ACP/ERC-8183, and Visa settlement as tracked protocol presence columns. Show which indexed agents and services support which standards.

**Labs audit checklist**
A well-formed agent commerce readiness audit should now check the full stack:
- Discovery: `.well-known/x402`, Bazaar/Agentic.Market listing, MCP endpoint
- Payment: x402 (stablecoin per-request), Stripe Link/SPT (card-rail consumer purchasing)
- Authorization: AP2 / Mastercard Verifiable Intent, Kite Passport governance
- Identity: ERC-8004 registration
- Settlement: Visa stablecoin settlement network support
- Commerce lifecycle: ERC-8183 / ACP job support
- CDP metadata quality: pathParamsSchema, output.example completeness

**Ajsa watchlist**
Monitor:
- AP2 / FIDO Alliance spec updates (v0.3+)
- Mastercard Verifiable Intent RFC progress
- Kite Passport adoption among evidence-ranked AgentCrush agents
- Stripe Link / Issuing agent-purchasing case studies and merchant adoption
- Visa stablecoin settlement volume on Base (track toward and past $10B run rate)
- Any AP2, Kite, or Stripe registry or public API surface that could become an AgentCrush adapter
- Cases where multiple stack layers are used together by the same agent/service
- x402 volume recovery past $5M/week (key Bet A threshold)

**Future adapter triggers (not now)**
- AP2: build adapter when AP2 exposes a structured public registry or API
- Kite Passport: build adapter when Kite exposes a public agent registry with structured metadata
- Stripe Link: not an indexable registry; track case studies and merchant adoption instead

---

## Decision summary

AgentCrush tracks the full agent-commerce stack as separate evidence surfaces.
No protocol gets favoritism or a scoring advantage.
x402 is already live in scoring and discovery.
MCP is already live as a client interface.
AP2, Kite Passport, and Stripe Link are on the watchlist and audit checklist — not yet in scoring.
Build adapters only when reliable, structured public data sources exist.

---

*See also: [INTELLIGENCE_BACKLOG.md](INTELLIGENCE_BACKLOG.md) — AP2/FIDO entry, Stripe/Visa/Kite entry | [EXECUTION_PLAN_SUPPLEMENT.md](EXECUTION_PLAN_SUPPLEMENT.md) — Section 2.2 economic activity signals | [AGENTCRUSH_LABS.md](AGENTCRUSH_LABS.md) — Agent Commerce Readiness Audit checklist*
