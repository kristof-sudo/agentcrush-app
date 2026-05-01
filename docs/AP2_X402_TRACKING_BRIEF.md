# AP2 vs x402: what AgentCrush should track

**Created:** May 1, 2026
**Owner:** Kris
**Purpose:** Internal reference for how AgentCrush distinguishes and tracks AP2 and x402 without building adapters or taking protocol positions.

---

## Core distinction

These protocols answer different questions. They are not competitors — they operate at different layers.

### x402

HTTP-native payment and resource discovery for machine-callable services.

x402 answers:
- Can this HTTP resource ask for payment?
- Can an agent pay per request?
- Can the payment settle cheaply and programmatically?
- Can a service be discovered as machine-payable (via `.well-known/x402`, CDP discovery, Agentic.Market)?
- Can an API monetize without API keys or subscriptions?

x402 is where the resource sits and how it gets paid. It is visible at the HTTP layer. AgentCrush already has live x402 endpoints and is listed in CDP discovery.

### AP2 (Agent Payments Protocol)

Agent payment authorization, intent declaration, constraints, auditability, and human-present / human-not-present transaction governance.

AP2 answers:
- Did the user authorize this agent to take this action?
- What constraints did the user give?
- Can a merchant or payment provider verify intent?
- Who is accountable if something goes wrong?
- Can an autonomous (human-not-present) payment be audited after the fact?

AP2 is about the authorization wrapper around a transaction. It is governance at the agent-identity layer. Google donated AP2 v0.2 to the FIDO Alliance in April 2026. Mastercard's Verifiable Intent framework is being contributed alongside it.

### MCP (Model Context Protocol)

AI-client and tool interface. Not a payment rail. MCP gives LLM clients structured access to tools, context, and data. AgentCrush already exposes an MCP server.

MCP answers:
- Can an AI client call this tool?
- What does this tool return?
- What arguments does it take?

MCP and x402 can coexist at the same endpoint: MCP defines the interface, x402 can gate access behind payment.

### How they relate

```
Agent intent / authorization layer:  AP2 (governance, auditability, constraints)
          ↓
HTTP payment / resource layer:       x402 (per-request payment, machine discovery)
          ↓
Tool / interface layer:              MCP (structured tool calls, context)
```

A well-designed agent-commerce endpoint could support all three. AgentCrush should track which agents and services support each, and at what confidence.

### AgentCrush

Protocol-neutral market intelligence layer tracking agents across all of these surfaces.

AgentCrush tracks. AgentCrush does not choose.

---

## What AgentCrush should track per agent / service

| Signal | Notes |
|---|---|
| x402 support | Is the service callable with x402? Is it listed in CDP discovery / Agentic.Market? |
| AP2 support | Does the service declare AP2 or FIDO Verifiable Intent support? (public metadata only) |
| MCP support | Is there a machine-readable MCP endpoint? |
| ERC-8004 registration | Is the agent registered on-chain? |
| Agentic.Market / Bazaar presence | Is the service listed and indexed? |
| CDP discovery metadata quality | Is the discovery metadata complete (pathParamsSchema, output.example)? |
| Payment method / asset / network | Stablecoin, card, wallet, bank rail, network (Base, Ethereum, etc.) |
| Authorization / intent support | AP2, Mastercard Verifiable Intent, or equivalent — if publicly declared |
| Human-present vs human-not-present capability | If publicly declared |
| Evidence tier | Verified onchain / public API / marketplace-reported / public webpage / self-reported |

Every tracked signal must carry its evidence tier. Do not mix verified and self-reported without a label.

---

## What AgentCrush should not do now

- No AP2 adapter. AP2 does not yet have a public registry or structured API AgentCrush can ingest.
- No protocol favoritism. AgentCrush tracks both AP2 and x402 as separate surfaces. Neither gets a scoring advantage.
- No scoring weight changes. AP2 support is not yet a scoring signal. It has no verifiable, publicly structured data source.
- No claim that AP2 or x402 is "the winner." Both may coexist indefinitely across different use cases and institutional layers.
- No ranking impact from self-reported protocol support. An agent self-declaring AP2 support without a verifiable source does not affect evidence score.

---

## AgentCrush positioning

Use:
- "tracks agents across x402, AP2, MCP, ERC-8004, and emerging payment rails"
- "protocol-neutral market intelligence"
- "indexes signals from multiple payment and authorization standards"

Avoid:
- "built on x402"
- "AP2 reputation layer"
- "the x402 trust provider"
- any language implying AgentCrush belongs inside one protocol

---

## Future use

**Agent Economy Index V1 — protocol taxonomy**
Add x402, AP2, MCP, ERC-8004, ACP/ERC-8183 as tracked protocol presence columns. Show which indexed agents support which standards.

**Labs audit checklist**
A well-formed agent commerce readiness audit should check: x402 discovery, AP2 / Verifiable Intent declaration, MCP endpoint, ERC-8004 registration, Bazaar listing, CDP metadata quality. AP2 should be on the checklist even if it is not yet a scoring signal.

**Ajsa watchlist**
Monitor:
- AP2 / FIDO Alliance spec updates (v0.3+)
- Mastercard Verifiable Intent RFC progress
- Any AP2-native registry or public API surface that could become an AgentCrush adapter
- Named enterprise AP2 deployments or Visa/Stripe/Coinbase endorsements
- x402 volume recovery past $5M/week (key Bet A threshold)
- Cases where AP2 + x402 are used together by the same agent/service

**Future adapter trigger (not now)**
Build an AP2 adapter only when AP2 exposes a structured public registry or API that AgentCrush can query with reasonable confidence. Self-declared metadata in a public webpage is a start, not a trigger.

---

## Decision summary

AgentCrush tracks both AP2 and x402 as separate evidence surfaces.
Neither gets protocol favoritism.
AP2 is on the watchlist and audit checklist — not yet in scoring.
x402 is already live in scoring and discovery.
MCP is already live as a client interface.
Build the AP2 adapter when a reliable, structured public data source exists.

---

*See also: [INTELLIGENCE_BACKLOG.md](INTELLIGENCE_BACKLOG.md) — AP2/FIDO entry | [EXECUTION_PLAN_SUPPLEMENT.md](EXECUTION_PLAN_SUPPLEMENT.md) — Section 2.2 economic activity signals*
