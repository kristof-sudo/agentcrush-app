# AgentCrush Intelligence Backlog

**Created:** 2026-04-28
**Purpose:** Append-only log of ecosystem signals from Ajsa briefs, experiments, and research that may become AgentCrush tasks later.
**Owner:** Kristof + Ajsa

---

## How to use this file

1. Add entries in reverse-chronological order (newest at top within each date block).
2. Every entry answers the five decision questions below.
3. Do not delete entries — use status labels to update them.
4. When an entry becomes a task, commit, PR, or doc, mark it **Converted to task** and link the output.
5. Ajsa should surface relevant entries in weekly briefs if status changes.

---

## Status labels

| Label | Meaning |
|---|---|
| **Monitor** | Worth watching; no action yet |
| **Investigate** | Needs a closer look before deciding |
| **Build next** | Approved for the current or next sprint |
| **Build later** | Agreed to build; not yet scheduled |
| **Rejected** | Decided against; reason noted |
| **Converted to task** | Moved into execution; linked below |

---

## Decision rule

Every entry must answer:

1. **What happened?** (the signal, event, or finding)
2. **Why does it matter for AgentCrush?** (implication for index, scoring, distribution, monetization)
3. **What could AgentCrush do with it?** (concrete action options)
4. **Status?** (Monitor / Investigate / Build next / Build later / Rejected)
5. **Where does it move if promoted?** (Execution plan, Labs, Ajsa, scoring, distribution, infrastructure, dashboard)

---

## Log

---

### 2026-04-28 — AgentCash / no-API-key paid API access

**Status:** Monitor

**What happened?**
AgentCash demonstrates a pattern where agents access APIs without API key registration — using x402 micropayments for per-request access. Targeted at agents as buyers, not human developers.

**Why does it matter for AgentCrush?**
AgentCrush already has live x402 endpoints. The question is whether the discovery/conversion layer (how agents find and choose services) becomes a monetizable surface — through offers, credits, referral incentives, or featured placement in the intelligence graph.

**What could AgentCrush do?**
- (A) Nothing yet — index AgentCash as a discovery-layer player
- (B) Future: opt-in offers/credits/referral surface for API providers, clearly labeled
- (C) Future: sell structured "API discovery + payment readiness" intelligence (like AgentCash but built on AgentCrush's evidence graph)

**Decision:** Monitor. Option B/C both require x402 traffic and core index to grow first. Ads convert humans; agents may convert on trust score + price + reliability. Revisit if inbound appears or Ajsa surfaces repeated demand.

**If promoted:** → Labs (offers/credits idea) or distribution surface

---

### 2026-04-27/28 — Bazaar discovery indexing: output schema gotchas

**Status:** Converted to task → commits `d79e1dc`, `d1f145e`

**What happened?**
After getting live x402 endpoints on Base mainnet, AgentCrush was not visible on Agentic.Market. Investigation found:
1. CDP discovery API (the actual index) WAS working — `verification-status` appeared after first paid settlement.
2. `output` field was absent from all three Bazaar extension declarations because `declareDiscoveryExtension` only includes output when `output.example` is explicitly passed.
3. EXTENSION-RESPONSES is not emitted by any AgentCrush-side code — it is handled by the CDP backend. Not a config problem on our side.
4. `trust-summary` and `history` won't appear in CDP index until their first paid settlements.

**Why does it matter?**
Bazaar discovery quality affects whether agents querying the CDP index can understand what our endpoints return. Output schema is what Agentic.Market and agent clients use to decide whether to call a service.

**What we did:**
Added `output.example` to all three `declareDiscoveryExtension` calls in `src/proxy.js`. Verified CDP index updated `lastUpdated` timestamp and now shows `info.output` + `schema.properties.output` after one fresh paid settlement.

**Lesson for future x402 implementations:** Always pass `output.example` to `declareDiscoveryExtension`. Schema updates only propagate when a new paid settlement triggers CDP re-indexing.

---

### 2026-04-27 — DivigentAI / x402 wallet behavior metrics

**Status:** Monitor

**What happened?**
DivigentAI surfaced in Ajsa brief. Referenced as tracking or exposing x402 wallet behavior metrics — potentially measuring how agents use micropayment APIs.

**Why does it matter for AgentCrush?**
If wallet behavior metrics (call frequency, payment patterns, repeat payer rate, payment size distribution) become a signal, AgentCrush could incorporate them as an evidence tier for x402-enabled agents. We already have `quality.l30DaysTotalCalls` and `quality.l30DaysUniquePayers` from the CDP discovery API.

**What could AgentCrush do?**
- Watch what DivigentAI is actually measuring
- Determine if CDP quality fields are sufficient or if richer wallet behavior data is needed
- Eventually: add `x402_call_volume`, `x402_unique_payers`, `x402_repeat_rate` as optional agent evidence fields

**Decision:** Monitor. Do not ingest until CDP quality fields prove insufficient or DivigentAI publishes a structured data source.

**If promoted:** → Scoring (new evidence signal) or Agent Economy Index V1 metrics

---

### 2026-04-27 — Decixa / x402 directory probe methodology

**Status:** Monitor

**What happened?**
Decixa referenced in Ajsa brief as probing x402 directories — potentially systematically discovering x402 endpoints via `.well-known/x402` and related discovery endpoints.

**Why does it matter for AgentCrush?**
Two implications:
1. AgentCrush's own `/.well-known/x402` and `/.well-known/x402.json` should be maintained and correct — they are indexed by such probes.
2. Decixa's methodology (systematic directory scanning) could be adapted as an ingestion technique: run periodic discovery scans against known agent domains to find new x402 endpoints and map them into the index.

**What could AgentCrush do?**
- Ensure our own discovery files are always valid (currently passing all checks)
- Build a lightweight x402 directory prober as an ingestion source: given a list of known agent domains, check for `/.well-known/x402` and extract service metadata
- Add discovered x402 services to the Agent Economy Index tracked surfaces count

**Decision:** Monitor. Keep our discovery files clean. Add a discovery-prober to the adapter backlog for later.

**If promoted:** → Infrastructure (x402 discovery prober adapter) or Agent Economy Index ingestion

---

### 2026-04-27 — Nexus A2A/MCP Show HN signal

**Status:** Investigate

**What happened?**
A "Show HN" post for Nexus (A2A/MCP project) appeared in Ajsa brief. Significant HN community engagement, possibly indicating growing developer interest in A2A and MCP as standards.

**Why does it matter for AgentCrush?**
1. HN is already a tracked discourse signal (HN score in v2 evidence). Nexus appearing on HN gives it a measurable evidence event.
2. If Nexus is a new A2A/MCP infrastructure player, it should be indexed.
3. Sustained HN + GitHub traction on A2A/MCP tools validates the scoring weight for discourse signals.
4. May surface developer demand for AgentCrush to track MCP servers explicitly.

**What could AgentCrush do?**
- Index Nexus as an agent/infrastructure project if not already in the index
- Check whether A2A/MCP Show HN posts are being captured in the HN scraper
- Consider a dedicated MCP infrastructure category page if multiple MCP tools are appearing on HN

**Decision:** Investigate. Check if Nexus is in the index. Check if HN ingestion is capturing A2A/MCP discourse.

**If promoted:** → Scoring (validate HN signal), ingestion (ensure MCP/A2A tools are captured), or distribution (MCP infrastructure category page)

---

*— end of log —*
