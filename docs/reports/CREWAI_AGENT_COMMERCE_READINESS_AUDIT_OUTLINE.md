# Agent Commerce Readiness Audit — CrewAI (Outline)

**Status:** Internal outline only — not published, not sent to CrewAI
**Date:** May 5, 2026
**Auditor:** AgentCrush Labs
**Purpose:** Template for the first free Agent Commerce Readiness Audit case study. Findings will be published as a blog post on agentcrush.xyz/blog after completion.

---

## 1. Executive summary

*(To write after audit is complete.)*

CrewAI is one of the most widely adopted open-source multi-agent frameworks. This audit assesses its readiness across the full agent-commerce stack: can agents discover it, understand its API surface, pay for services built on it, verify what they received, and trust the agent operating it?

This is not a product review. It is a protocol-surface readiness assessment using publicly available data, AgentCrush's evidence index, and the audit methodology developed from AgentCrush's own agent-commerce implementation.

---

## 2. What is being audited

**Subject:** CrewAI — the framework and its reference implementation
**GitHub:** `crewAIInc/crewAI`
**Website:** https://crewai.com (to verify)
**Docs:** https://docs.crewai.com (to verify)
**Audit scope:** Protocol surface readiness across the full agent-commerce stack as defined in `docs/AP2_X402_TRACKING_BRIEF.md`

**What this audit does NOT cover:**
- Individual applications or agents built with CrewAI
- CrewAI's internal product roadmap or private APIs
- Any paid CrewAI Enterprise features not publicly documented

---

## 3. Evidence sources to check

| Source | What to verify |
|---|---|
| AgentCrush index | Current tier, rank, evidence signals |
| ERC-8004 registry | On-chain registration via 8004scan.xyz |
| CDP merchant discovery | x402 endpoints in Bazaar/Agentic.Market |
| `/.well-known/x402.json` | x402 discovery metadata |
| docs.crewai.com | MCP tool definitions, API schema, integration docs |
| PyPI: crewai package | Download volume, dependency graph |
| GitHub: crewAIInc/crewAI | Activity, stars, releases, open issues |
| HN / Discourse | Community signal |
| Agentverse / Fetch.ai | Listed? |
| Experian/Visa Agent Trust | KYA registration (to verify — new as of Apr 30 2026) |

---

## 4. Current known AgentCrush state for CrewAI

*(All data from AgentCrush index as of May 5, 2026. Live queries used — no illustrative numbers.)*

**AgentCrush profile:**
- Handle: `@crewai`
- Display name: CrewAI
- Global rank: #23 (evidence_ranked tier)
- Tier: `evidence_ranked`
- GitHub anchor: `crewAIInc/crewAI`

**Evidence scores (v2 conservative formula):**
- Score v2: 76.15 (coverage tier: high)
- GitHub signal: 99.22
- Package usage: 99.13
- Dependency graph: 66.63
- Docs quality: 86
- HN discourse: 37.65
- Ecosystem: 55.07
- Trust (ERC-8004): 20

**ERC-8004 registration:**
- Registered: yes — Base mainnet, token #17997
- x402_supported field: true (as declared in the on-chain record)
- Match confidence: to verify in `agent_erc8004_registrations` table

**x402 support:**
- x402 endpoint detected: to verify
- CDP discovery entry: to verify
- Agentic.Market listing: to verify
- Note: ERC-8004 token declares `x402_supported: true` — verify whether an actual x402 endpoint exists or if this is a metadata declaration only

**MCP support:**
- CrewAI has documented MCP integrations: to verify exact tool definitions and whether a machine-callable MCP endpoint exists for the framework itself (vs. user-built agents)

**Package / download evidence:**
- PyPI: `crewai` package — download volume: to verify current numbers from package_discovery table
- Dependency graph: 66.63 — detected in downstream projects

**Visibility and reputation:**
- Visibility score: 81
- Reputation score: 62
- Weekly delta: to check at time of audit

---

## 5. Agent commerce stack checklist

### 5.1 Discovery

| Check | Finding | Confidence |
|---|---|---|
| Website publicly accessible | to verify | — |
| Docs site publicly accessible | to verify | — |
| Machine-readable API schema | to verify | — |
| `/.well-known/x402.json` present | to verify | — |
| `/.well-known/x402` present | to verify | — |
| discoverable: true in x402 metadata | to verify | — |
| Listed in CDP merchant discovery (Bazaar) | to verify | — |
| Listed on Agentic.Market | to verify | — |
| Listed on Agentverse / Fetch.ai | to verify | — |
| Sitemap / structured URLs for programmatic access | to verify | — |

### 5.2 MCP / tool interface

| Check | Finding | Confidence |
|---|---|---|
| MCP server endpoint exists | to verify | — |
| Tool definitions machine-readable | to verify | — |
| Tool schemas documented | to verify | — |
| MCP endpoint publicly callable without auth | to verify | — |
| MCP endpoint listed in a public registry | to verify | — |

### 5.3 x402 / payment endpoint readiness

| Check | Finding | Confidence |
|---|---|---|
| x402 endpoint live | to verify | — |
| 402 challenge returns correctly | to verify | — |
| Paid settlement confirmed | to verify | — |
| Output schema defined | to verify | — |
| output.example present | to verify | — |
| pathParamsSchema present | to verify | — |
| Fresh settlement post metadata change | to verify | — |
| Supported networks declared | to verify | — |

Note: ERC-8004 token #17997 declares `x402_supported: true`. Whether this reflects a live endpoint or is a metadata assertion is the core question.

### 5.4 AP2 / intent / spending authorization

| Check | Finding | Confidence |
|---|---|---|
| AP2 or FIDO Verifiable Intent declared | to verify | — |
| Kite Passport compatibility declared | to verify | — |
| Spending constraint support documented | to verify | — |
| Human-present / human-not-present modes documented | to verify | — |

### 5.5 ERC-8004 identity / registry

| Check | Finding | Confidence |
|---|---|---|
| ERC-8004 registration confirmed | Yes — Base, token #17997 | verified_api (onchain) |
| Owner wallet verifiable | to verify | — |
| x402_supported field accurate | to verify against live endpoint | — |
| Registration current / not stale | to verify last_checked_at | — |

### 5.6 ERC-8183 / ACP job lifecycle

| Check | Finding | Confidence |
|---|---|---|
| ACP (Virtuals) integration documented | to verify | — |
| Job lifecycle (Open → Funded → Submitted → Terminal) supported | to verify | — |
| Evaluator agent mechanism present | to verify | — |
| Escrow / payment primitive integrated | to verify | — |

### 5.7 Agentic.Market / Bazaar presence

| Check | Finding | Confidence |
|---|---|---|
| Listed on Agentic.Market | to verify | — |
| Listed in Bazaar / CDP discovery | to verify | — |
| Route metadata complete | to verify | — |

### 5.8 Payment rails / supported networks

| Check | Finding | Confidence |
|---|---|---|
| Supported stablecoin / network declared | to verify | — |
| Base mainnet | to verify | — |
| Visa stablecoin settlement coverage (Base) | inferred — Base is a covered chain | public_docs |
| Stripe Link / SPT compatibility | to verify | — |

### 5.9 Human override / governance

| Check | Finding | Confidence |
|---|---|---|
| Human-in-the-loop mechanisms documented | to verify | — |
| CROPS alignment: Censorship Resistance | to verify | — |
| CROPS alignment: Open-source | Yes — Apache 2.0 license | public_docs |
| CROPS alignment: Privacy | to verify | — |
| CROPS alignment: Security | to verify | — |
| Audit log or traceability mechanism | to verify | — |

### 5.10 Evidence gaps

- x402 endpoint existence: declared in ERC-8004 but not confirmed live
- MCP endpoint: documented integrations but unclear if framework itself exposes one
- AP2 / Kite support: no public evidence found
- ERC-8183 / ACP: unclear — to research
- Experian/Visa Agent Trust registration: unknown — new surface as of Apr 30 2026

---

## 6. Risk / friction findings

*(To complete after audit.)*

Placeholder observations based on known data:

1. **x402 declared but unconfirmed:** ERC-8004 token says `x402_supported: true`. If no live endpoint exists, this is a metadata-only declaration that agents cannot act on. Friction: agent tries to pay, finds no endpoint.

2. **Discovery metadata unknown:** Without `/.well-known/x402.json` and CDP discovery, agents cannot find the service programmatically even if payment support exists.

3. **MCP ambiguity:** CrewAI integrates with MCP tools but may not itself be a machine-callable MCP service. The distinction matters for agent-commerce readiness.

4. **HN discourse score: 37.65 (moderate):** Lower than GitHub signal. Suggests active development but limited practitioner discussion on technical forums.

5. **AP2 / Kite / ERC-8183:** No evidence of support found. Expected at current maturity level of the stack.

---

## 7. Recommendations

*(To write after audit is complete.)*

Structure:
1. **Ship first (≤1 week):** highest-leverage gaps with lowest effort
2. **Ship next (1–4 weeks):** medium effort, meaningful commerce readiness improvement
3. **Skip for now:** surfaces with no live ecosystem yet

---

## 8. What AgentCrush can track today

- ERC-8004 registration: live, confirmed
- GitHub evidence: live (stars, activity, dependency graph, docs quality)
- Package download: live (PyPI `crewai`)
- Evidence tier: `evidence_ranked` — high coverage
- x402 endpoint: not confirmed — would appear in CDP discovery when live

---

## 9. What AgentCrush cannot verify yet

- Whether `x402_supported: true` in ERC-8004 token reflects a live endpoint or a metadata declaration
- MCP server presence and tool definitions (no structured MCP registry ingestion yet)
- AP2 / Kite Passport support (no public registry / API)
- ERC-8183 / ACP participation (no indexer yet)
- Experian Agent Trust / KYA registration (new surface, not yet integrated)
- Stripe Link / SPT compatibility (no indexable signal)
- Human override / CROPS alignment (requires manual review)

---

## 10. Readiness score

**NOT SCORED YET.**

Score placeholder to be filled after all "to verify" items are resolved:

| Dimension | Score (0–10) | Notes |
|---|---|---|
| Discovery | — | to verify |
| API / schema clarity | — | to verify |
| Payment readiness (x402) | — | to verify |
| Authorization / governance | — | to verify |
| Identity (ERC-8004) | — | confirmed registration |
| Commerce lifecycle (ERC-8183) | — | to verify |
| Marketplace presence | — | to verify |
| Overall readiness | — | pending |

Final score will be calculated using the AgentCrush Labs audit methodology. Score reflects observable protocol surface coverage, not product quality or team quality.

---

## Production checklist (before publishing)

- [ ] All "to verify" items resolved with cited sources
- [ ] No unsupported factual claims
- [ ] x402 endpoint status confirmed (live vs. metadata-only)
- [ ] ERC-8004 match confidence verified in AgentCrush DB
- [ ] Recommendations section written
- [ ] Readiness score filled and methodology note attached
- [ ] Draft reviewed by Kris before publishing to /blog
- [ ] CrewAI team not contacted before publication (first audit is a public case study, not a client engagement)

---

*See also: `docs/AGENTCRUSH_LABS.md` — Offer 1 audit scope | `docs/AP2_X402_TRACKING_BRIEF.md` — protocol stack taxonomy | `docs/ERC8183_READER_SCOPING.md` — ERC-8183 context*
