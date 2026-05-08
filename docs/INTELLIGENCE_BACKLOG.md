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

### 2026-05-08 — AWS Bedrock AgentCore Payments launched (preview)

**Status:** Build next / Ajsa source candidate

**What happened?**
AWS launched Amazon Bedrock AgentCore Payments in preview on
May 7, 2026, in partnership with Coinbase and Stripe. Preview
supports x402 protocol first, with additional protocols on the
roadmap. The Coinbase x402 Bazaar MCP server is exposed through
AgentCore Gateway so agents can search, discover, and pay for
x402 endpoints. Wallet infrastructure: Coinbase CDP wallet or
Stripe Privy wallet. Spending limits enforced per session.
Available in 4 AWS regions at preview.

Quote from announcement: "agents will discover, evaluate, and
pay for resources when they need, all within a single
execution loop."

Customer references: Cox Automotive, Thomson Reuters, PGA TOUR,
Warner Bros. Discovery (Mit Majithia, EVP), Heurist AI (JW
Wang, Founder).

**Why does it matter for AgentCrush?**
- Institutional validation of x402 specifically as the first
  agent payment protocol AWS supports — bigger than any
  previous endorsement.
- AWS literally describes the agent commerce stack
  (discovery + payment + governance + observability) the way
  AgentCrush has been positioning around. The framing is now
  industry-standard, not AgentCrush-internal.
- The Bazaar MCP server exposure through AgentCore Gateway
  means AgentCrush's existing Bazaar listing (verification-
  status endpoint) could become discoverable to Bedrock-built
  agents by extension. Worth verifying once Bazaar updates
  show through to AgentCore.
- Strengthens the cross-protocol thesis the May 8 blog post
  is built on. Multi-rail moves from "we expect" to "yesterday
  it shipped at AWS scale."

**What could AgentCrush do?**
- Add AWS Bedrock AgentCore Payments / AgentCore docs as an
  Ajsa source if there is an RSS or changelog feed.
- Update AP2_X402_TRACKING_BRIEF.md to add Bedrock AgentCore
  Payments as a tracked surface in the agent commerce stack.
- Use as Friday May 8 / cross-protocol blog post talking
  point (done — referenced in prediction #4 of the post).
- Include as Item #1 in first AEB (May 11) — this is the
  ecosystem signal for the week.
- Watch for first published x402 endpoints by AgentCore-built
  agents. If the volume of x402 sellers spikes in
  Agentic.Market over the next 30 days, AgentCore is the
  cause. Track week-over-week.

**Decision:** Build next — add to Ajsa source list this week
if a feed exists; surface in AEB Item #1; track downstream
Bazaar volume effect over the next 30 days.

**If promoted:** → AP2_X402_TRACKING_BRIEF.md update; Ajsa
source addition; future Agent Economy Index metric (count of
x402 sellers in Bazaar week-over-week post-AgentCore launch).

---

### 2026-05-05 — Kite Passport test cohort: applied

**Status:** Pending review

**What happened?**
Submitted the Kite Passport test user typeform. Application framed
read-only: index Passport-enabled agents into AgentCrush's
cross-protocol surface alongside x402, ERC-8004, AP2, MCP. Submission
confirmation: "3-5 days, notify accepted testers via email."

**Why does it matter for AgentCrush?**
- Bet B (open ecosystem): early-cohort presence on a named acquihire-
  candidate platform without commitment to building on it.
- Audit credibility: when the Agent Commerce Readiness Audit pitches
  Kite Passport as a tracked rail, "we are in their test cohort"
  beats "we read their docs."
- Bet D positioning: AgentCrush in Kite's funnel without ever
  saying acquihire out loud.

**What could AgentCrush do?**
- Wait for email response (3-5 days)
- If accepted: take SDK access, document the Passport API surface,
  add Passport to payment_rails_supported field options, scope a
  read-only adapter
- If not accepted: re-apply to next cohort or wait for public access

**Decision:** Passive monitor. Check email through May 10.

**If promoted:** → New rail in `payment_rails_supported`; scoping doc
similar to ERC-8183; Wednesday methodology cast about the scoped-
wallet-governance layer of the agent commerce stack.

---

### 2026-05-05 — Agentverse registration: complete

**Status:** Done

**What happened?**
@agentcrush registered on Agentverse via External Integration →
Custom Integration → register_chat_agent (uagents-core 0.4.4).
Agent address: agent1qg...dcv6wg (full address in 1Password).
Endpoint declared: https://agentcrush.xyz/api/mcp.
Active flag: true. Registration confirmed by Almanac sync.
Profile setup completed: avatar, bio, README, handle. Checklist
at ~85% (skipped 10-interactions item — requires test traffic from
other agents; defer).

Plumbing note: required pyenv-installed Python 3.12 (Homebrew
python@3.12 has a libexpat link bug on this macOS version that
breaks pyexpat). Future Python work on this Mac should use
~/.pyenv/versions/3.12.7/bin/python3.

**Why does it matter for AgentCrush?**
@agentcrush handle reserved on the Fetch ecosystem agent registry.
Bet B presence ticked off without committing AgentCrush to building
on Fetch. Endpoint pointed at the existing MCP server — no new
infrastructure. Registry is forward-compatible: if AgentCrush ever
exposes a real ACP-shaped endpoint, the same registration can be
updated rather than re-registered.

**What could AgentCrush do?**
- Add Agentverse to the Wednesday methodology backlog: "Why we
  publish AgentCrush across multiple agent registries (Bazaar,
  Agentverse, ERC-8004, future Kite Passport-aware catalogs)."
- Eventually: index Agentverse-listed agents in AgentCrush. Their
  search API at POST agentverse.ai/v1/search/agents is public and
  no-auth. Adapter scope similar to the ERC-8004 reader.
- When/if AgentCrush exposes a real ACP-conformant endpoint at
  /api/agentverse, update the registration to point there instead
  of /api/mcp.

**Decision:** Keep handle live. No further build action this week.

**If promoted:** → Agentverse adapter (read-only); Wednesday cast.

---

### 2026-05-04 — Experian Agent Trust + KYA framework

**Status:** Investigate

**What happened?**
Experian launched an "Agent Trust" and Know-Your-Agent (KYA) framework on April 30, 2026. Part of a TradFi-side trust ecosystem alongside Visa's Trusted Agent Protocol, Cloudflare, and Skyfire. This is a parallel trust/identity layer for agents built on traditional financial infrastructure rather than on-chain registries.

**Why does it matter for AgentCrush?**
Direct conceptual overlap with AgentCrush's agent registry positioning. The TradFi side (Experian/Visa/Cloudflare/Skyfire) is building an agent trust layer simultaneously with the crypto side (ERC-8004/x402/ACP). AgentCrush's protocol-neutral positioning means this is a surface to index and understand, not ignore. If their registry can be probed, it's a new evidence source. If their identifier format is standardized, it's a new field to track.

**What could AgentCrush do?**
- Probe whether Experian Agent Trust / Visa Trusted Agent Protocol endpoints are publicly accessible
- Determine the agent-identifier format used (DID? proprietary?)
- Assess whether this registry can be indexed as an evidence surface
- Add Experian/Visa/Skyfire to the Labs Offer 1 audit scope (trust verification section)
- Consider a future Wednesday methodology post: TradFi trust layer vs. crypto trust layer — why neither wins alone

**Where does it move if promoted?** Agent Economy Index tracked surfaces, evidence pipeline, Labs Offer 1 scope, Ajsa monitoring.

---

### 2026-05-04 — AI inference aggregators with crypto payment (b.ai, Chutes, OpenRouter)

**Status:** Monitor

**What happened?**
AI inference aggregators — b.ai, Chutes, OpenRouter — are emerging as multi-model API gateways with crypto payment options. These services sit between agent developers and underlying models, potentially becoming x402-relevant aggregation points.

**Why does it matter for AgentCrush?**
If inference aggregators adopt x402 as a payment rail, they become a high-traffic node in the agent commerce stack — and a class of agent worth indexing and tracking separately. First movers here may become comparison targets.

**What could AgentCrush do?**
- Monitor b.ai, Chutes, OpenRouter for x402 integration announcements
- If any adopt x402: index as evidence-ranked agents, surface in AEB

**Where does it move if promoted?** Ingestion / evidence pipeline, AEB content backlog.

---

### 2026-05-04 — Fetch.ai uAgents Payment Protocol

**Status:** Investigate

**What happened?**
Fetch.ai's uAgents framework includes a payment protocol for agent-to-agent payments. Positioned as an alternative to x402 within the Fetch.ai / Agentverse ecosystem.

**Why does it matter for AgentCrush?**
Competitive context for x402: if uAgents payment is gaining traction, it's another protocol surface AgentCrush should understand and potentially track. Fetch.ai / Agentverse is already in scope for agent discovery.

**What could AgentCrush do?**
- Read the Innovation Lab docs section for uAgents payment protocol within 2 weeks
- Assess: does this merit a tracked surface on the Agent Economy Index?
- Assess: is there a discovery / machine-payable endpoint pattern here worth indexing?

**Where does it move if promoted?** Agent Economy Index tracked surfaces, Ajsa monitoring.

---

### 2026-05-04 — Pantera + Coinbase Ventures + DCG coordinated agent-infra investment pattern

**Status:** Monitor

**What happened?**
Three investors — Pantera Capital, Coinbase Ventures, and DCG — appear repeatedly across recent agent-infrastructure rounds. Confirmed: SURF AI ($15M Dec 2025, Pantera lead), OpenMind ($20M Aug 2025, Pantera lead). Pattern of co-investment across the agent commerce + decentralized robotics stack.

**Why does it matter for AgentCrush?**
Two implications:
1. These three firms have a thesis on "agent-economy infrastructure" and are funding the data, identity, and embodied-AI layers in parallel. AgentCrush sits structurally above their portfolio — protocol-neutral intelligence that maps across what they fund.
2. Bet D (acquihire optionality) signal: track which of their portfolio companies emerge as natural acquirers or partners. Coinbase Ventures portfolio is the most aligned given x402.

**What could AgentCrush do?**
- Add Pantera, Coinbase Ventures, DCG portfolio moves to Ajsa monitoring
- When they fund a new agent-infra company, log it and assess whether the company is something AgentCrush should index
- No public mention of this pattern (per Bet D rule: never say acquihire bet out loud)

**Decision:** Monitor via Ajsa. Add as named investor watchlist.

**If promoted:** → Ajsa source list update; STRATEGIC_BETS.md Bet D evidence section

---

### 2026-05-04 — OpenClaw ecosystem catalyst tracker (Feb 26 → May 4)

**Status:** Investigate

**What happened?**
Khala's Feb 26, 2026 OpenClaw report flagged specific catalysts to watch for KellyClaude, Clawd, Felix, Clawnch, AntiHunter. ~10 weeks later, those catalysts are now evaluable: KellyClaude 2nd App Store approval; Felix month-2 revenue sustainability; Clawnch Clawtomaton developer adoption (not just token launches); AntiHunter first profitable cash-returning exit. Also flagged in original article: OpenClaw founder Steinberger left for OpenAI; CVE-2026-25253 security vulnerability; competing forks (NanoClaw, ZeroClaw, PicoClaw).

**Why does it matter for AgentCrush?**
These projects are exactly the agent class AgentCrush exists to track. Whether they hit their catalysts is direct signal on the "external revenue at scale" question for autonomous software factories. A coverage page (`/category/autonomous-software-factories`) is queued; this entry funds that page with current data.

**What could AgentCrush do?**
- Have Ajsa scan for: KellyClaude App Store presence (current count of approved apps), Felix Stripe revenue dashboard (current rate), Clawnch SDK adoption beyond token launches, AntiHunter buyback/burn cadence
- Index all five plus the OpenClaw forks; surface evidence and current state on the new category page
- Publish a "State of Autonomous Software Factories — May 2026" post citing the data

**Decision:** Investigate. Ask Ajsa to run the scan in next morning brief.

**If promoted:** → New category page (`/category/autonomous-software-factories`); blog post; Bet B+C signal

---

### 2026-05-04 — Messari x402 pay-per-call launch (March 2026)

**Status:** Monitor

**What happened?**
Per Khala's SURF report (April 2026), Messari launched x402 pay-per-call access to its institutional research data in March 2026, packaged as an agent skill for Claude Code and OpenClaw. This puts a well-funded incumbent (Messari ~$21.5M ARR, ~120 staff) on the same x402 surface AgentCrush operates.

**Why does it matter for AgentCrush?**
Different products, different buyers (Messari = institutional research; AgentCrush = agent-graph + cross-protocol intelligence), but they now sit on the same payment rail. Worth tracking whether Messari's x402 surface generates meaningful agent-driven revenue, and whether their endpoints appear adjacent to AgentCrush's in CDP discovery / Agentic.Market.

**What could AgentCrush do?**
- Probe `/.well-known/x402` on messari.io and confirm endpoint shape
- Add Messari to the comparison surface area in the methodology page (we are not the only x402 intelligence provider — be honest about it)
- Watch for Messari's CDP discovery presence vs ours over 90 days

**Decision:** Monitor. No build action.

**If promoted:** → Comparison content; competitive context for Labs audit framing

---

### 2026-05-04 — ERC-8183 reader adapter (promoted to Build next)

**Status:** Build next — queued after GitHub mapping Batch 2 + tier-promotion run

**What happened?**
Castle Labs' April 2026 piece "The Beginning of Agentic Finance" articulated the four-standard agent-commerce stack: x402 (payments) + ERC-8004 (trust/identity) + ERC-8183 (commerce/escrow) + ERC-8211 (execution). AgentCrush has reader v1 for ERC-8004; ERC-8183 is the next protocol surface to map.

**Why does it matter for AgentCrush?**
ERC-8183 defines the "Job" primitive (Open → Funded → Submitted → Terminal) co-developed by Virtuals + EF dAI team. Agents using ERC-8183 are doing actual commerce work, not just registration. This is higher-signal evidence than ERC-8004 presence alone.

**What could AgentCrush do?**
- Mirror the ERC-8004 reader pattern: read on-chain Job events, store in `agent_erc8183_jobs` table, surface job count + completion rate on agent profiles
- No scoring impact in v1; informational surface only

**Decision:** Build next, after GitHub mapping Batch 2 + evidence pipeline run + tier-promotion dry-run completes.

**If promoted:** → New adapter; Agent Economy Index "ACP / commerce jobs tracked" KPI gets first real data

---

### 2026-05-01 — x402 builder pain: indexing gaps and transaction-risk primitives

**Status:** Monitor

**What happened?**

- Multiple x402 builders continue reporting Bazaar/Agentic.Market indexing gaps even after successful settlements and valid discovery metadata.
- Strale floated an x402-native onchain counterparty assurance service for Agentic Wallet / AgentKit flows.
- AgentOracle published signed receipt/JWKS examples for non-binary verification/confidence outputs.
- Builder feedback emphasized verdict + reason code over heavy audit trail in agent runtime flows.

**Why it matters for AgentCrush?**

- AgentCrush's x402 post-mortem remains useful because the indexing path is still non-deterministic for builders.
- Agent transaction-risk and signed evidence receipts may become an important category in agent-commerce infrastructure.
- AgentCrush may eventually need to track risk/verdict providers and possibly sign its own evidence outputs, but not now.

**What could AgentCrush do with it?**

- Monitor x402 indexing pain as a Labs lead signal.
- Track transaction-risk / counterparty-assurance services as a future Agent Economy Index category.
- Add "verdict + reason code + evidence URL" as a future response-design pattern for AgentCrush APIs.
- Monitor signed receipt / JWKS patterns for future verifiable evidence snapshots.

**Decision:** Monitor. No build now.

**If promoted:** Agent Economy Index V1/V2, Labs audit checklist, future verifiable evidence API design.

---

### 2026-05-01 — Stripe Link / Visa / Kite agent-commerce stack acceleration

**Status:** Build next — Tempo/MPP signal source for Ajsa

**What happened?**

Three signals arrived in close succession, suggesting the agent-commerce infrastructure stack is consolidating faster than expected.

**Stripe Link wallet for agents:** Stripe announced Link as a purchaser wallet for AI agents — enabling agents to complete purchases through existing merchant checkout flows using one-time-use virtual cards and Single-Purpose Tokens (SPTs). Human approval and future spending-control layers are part of the design. This is consumer-agent purchasing routed through Stripe's existing merchant and card rails, not a new payment protocol.

**Visa stablecoin settlement expansion:** Visa disclosed that its stablecoin settlement infrastructure now covers nine blockchains, with a $7B annualized settlement run rate. Base is explicitly named as one of the supported networks and framed in the context of agentic commerce. This is institutional confirmation that stablecoin settlement on Base is a serious payment surface, not a crypto experiment.

**Kite Mainnet / Agent Passport:** Kite shipped its mainnet and "Agent Passport" — a programmable wallet, identity, and spending-control layer for agents. Kite positions around interoperability with x402, AP2, MPP, and MCP. Agent Passport is essentially scoped spending sessions: agents operate within constraints set by humans, with programmable governance at the wallet layer.

**Why it matters for AgentCrush?**
- Agent commerce is becoming a stack, not a single protocol. The emerging layers are: Stripe Link/Issuing (consumer purchasing through existing rails) → x402 (HTTP-native paid resources) → AP2 (intent/authorization/auditability) → Kite Passport (scoped wallet governance) → Visa settlement (institutional stablecoin abstraction).
- This validates Bet A (x402 institutional momentum) and Bet D (Kite as potential strategic acquirer/partner) simultaneously.
- Kite's direct positioning around x402 + AP2 + MCP interoperability makes it a closer strategic watch item.
- Visa's Base settlement volume is the strongest institutional signal yet that stablecoin payment on Base is production-grade.
- The audit question for AgentCrush Labs now spans multiple rails — not just "does this API support x402?" but "which rails can agents use to pay for this service, and at what governance level?"

**What could AgentCrush do?**
- Update `docs/AP2_X402_TRACKING_BRIEF.md` to reflect the full agent-commerce stack (done in this commit).
- Add Stripe Link / Kite / Visa Base settlement to Ajsa watchlist.
- Add Stripe Link SPT and Kite Passport as tracked protocol surfaces in Agent Economy Index V1.
- Add multi-rail commerce readiness to the Labs audit checklist (can agents pay via Link/SPT, x402, Kite Passport, or other rails — and which does the service support?).
- Monitor Kite Passport adoption among evidence-ranked AgentCrush agents.
- No integration or adapter yet. Observe first.

**Decision:** Investigate. Use for positioning and audit checklist expansion. No new adapters or scoring changes.

**If promoted:** → Agent Economy Index V1 protocol taxonomy, Ajsa watchlist, Labs audit checklist (multi-rail), `AP2_X402_TRACKING_BRIEF.md` expansion (done), Bet A/D review at next monthly strategy review.

**Promoted May 4 strategy session.** Build scope: Add Tempo (Stripe + Paradigm L1) update feed and Stripe Machine Payments Protocol (MPP) news source to Ajsa monitoring. Watch for: named enterprise integrations, MPP volume disclosure, Anthropic/OpenAI launch-partner activity.

---

### 2026-04-30 — Moltbook / Meta / agent-social identity surface

**Status:** Investigate

**What happened?**
Moltbook, an AI-agent social network, was acquired by Meta in March 2026. Founders Matt Schlicht and Ben Parr joined Meta Superintelligence Labs. Terms undisclosed.

Public attention around Moltbook came partly from humans watching agents post and interact — "AI theater." The strategic substance appears to be agent identity, registry mechanics, owner-tethering, and interaction/visibility infrastructure, not the social posting behavior itself.

Note: Moltbook also had reported authenticity and security concerns. Treat any Moltbook-sourced agent data as low-confidence.

**Why does it matter for AgentCrush?**
- Agent social / identity platforms may become a source of agent identity, owner verification, social graph, attention, and interaction data — a surface AgentCrush does not currently track.
- The Meta acquisition validates that agent identity / registry infrastructure is strategically interesting to large platforms. This is consistent with existing analysis of Bet D (acquihire optionality).
- It also warns that visibility and distribution matter, not only methodology. A project can gain significant platform attention without deep technical substance.
- Moltbook-style agent personas (social posting, interaction counts) are not the same as developer agents or economically active agents. The index should not conflate them.

**What could AgentCrush do?**
- Add Moltbook / Meta MSL / agent-social platforms to Ajsa monitoring watchlist later.
- Monitor whether Moltbook under Meta becomes real developer-agent infrastructure (registry, identity primitives, owner verification) or remains performative social theater.
- Eventually consider "Agent Social" as a tracked surface in Agent Economy Index V1/V2, if a reliable, structured data source becomes available.
- Later map Moltbook profiles to AgentCrush profiles only if there is a public, reliable, and low-noise data source — not before.
- Treat social activity (posts, interactions, follower counts) as low-confidence attention evidence, not trust or reputation.

**Decision:** Investigate / monitor. Do not build a Moltbook clone. Do not build agent-persona scoring now.

**If promoted:** → Ajsa watchlist, Agent Economy Index V1 tracked surfaces, future social/activity evidence adapter (see EXECUTION_PLAN_SUPPLEMENT.md Section 7).

---

### 2026-04-29 — Google AP2 donated to FIDO Alliance

**Status:** Converted to task → [docs/AP2_X402_TRACKING_BRIEF.md](AP2_X402_TRACKING_BRIEF.md) (created May 1, 2026)

**What happened?**
Google donated Agent Payments Protocol (AP2) to the FIDO Alliance. AP2 v0.2 adds Human Not Present payments, and Mastercard's Verifiable Intent framework is being contributed alongside it.

**Why does it matter for AgentCrush?**
AP2 may become the institutional authorization / intent / payment-governance layer for agent commerce, while x402 remains important for HTTP-native machine payments and stablecoin settlement. AgentCrush should track both as separate but related surfaces.

AP2 answers:
- Did the user authorize this agent action?
- What constraints did the user give?
- Can a merchant/payment provider verify intent?
- Who is accountable if something goes wrong?
- Can autonomous "human not present" payments be audited?

x402 answers:
- Can this HTTP resource ask for payment?
- Can an agent pay per request?
- Can the payment settle cheaply and programmatically?
- Can a service be discovered as machine-payable?
- Can APIs monetize without API keys or subscriptions?

AgentCrush should track:
- AP2 support / FIDO alignment
- x402 support / Bazaar or CDP discovery
- Verifiable Intent support
- payment method support: stablecoin, card, wallet, bank rails
- human-present vs human-not-present payment capability
- whether the service exposes machine-readable metadata
- whether the service has observable usage/payment evidence

**What could AgentCrush do?**
- Add AP2/FIDO/Verifiable Intent to Ajsa watchlist
- Add AP2 as a tracked protocol on Agent Economy Index V1
- Write a short AP2 vs x402 brief
- Later track agents/services that support AP2, x402, or both

**Decision:** Investigate. Do not build an adapter yet. AgentCrush does not choose AP2 or x402 — AgentCrush tracks both.

**If promoted:** → Agent Economy Index V1, Ajsa watchlist, payment protocol taxonomy, future Labs audit checklist

---

### 2026-04-28 — AgentOracle / claim verification for agents

**Status:** Monitor

**What happened?**
AgentOracle is positioning as "the trust layer for AI agents," focused on per-claim verification, confidence scoring, ACT / VERIFY / REJECT recommendations, MCP, and x402-native paid endpoints.

**Why does it matter for AgentCrush?**
This validates demand for agent-facing verification infrastructure, but also confirms AgentCrush should not compete directly on "trust layer" positioning. AgentCrush should track projects like AgentOracle as part of the agent economy intelligence graph.

**What could AgentCrush do?**
- Index AgentOracle if not already indexed
- Add "claim verification / truth oracle" as a monitored category
- Watch their x402/MCP adoption
- Later consider whether claim-verification providers can become evidence sources for AgentCrush Labs audits or agent profile verification

**Decision:** Monitor. Do not build claim verification now.

**If promoted:** → Ajsa watchlist, Agent Economy Index category, future verification/evidence source

---

### 2026-04-28 — HeadlessOracle / environment-state constraints for agent commerce

**Status:** Monitor

**What happened?**
HeadlessOracle published an architectural argument around x402 + environment-state composition, with two RFCs on Mastercard's Verifiable Intent repository for `environment.market_state` and `environment.wallet_state`. Reference implementation reportedly runs on Cloudflare Workers + Base + Ed25519.

**Why does it matter for AgentCrush?**
If agent commerce matures, agents may need to evaluate not only identity/payment capability, but whether external conditions permit an action: wallet state, market state, constraints, and verification context. This could become a future evidence category or Ajsa watch item.

**What could AgentCrush do?**
- Monitor the RFCs and adoption
- Add "environment-state / constraint primitives" to Ajsa watchlist
- Later consider whether services/agents expose constraint metadata useful for AgentCrush profiles

**Decision:** Monitor. Do not build now.

**If promoted:** → Ajsa watchlist, Agent Economy Index V1/V2, or future scoring/evidence taxonomy

---

### 2026-04-28 — Future distribution loop: builder outreach

**Status:** Build later

**What happened?**
Idea: once profiles, badges, claim flow, and MCP/developer docs are stable, contact top evidence-ranked builders and tell them they are ranked. Provide a shareable profile link, badge link, and optional claim link.

**Why does it matter for AgentCrush?**
Ranked builders have an external reason to share AgentCrush. Each share brings inbound from the builder's own audience — a distribution loop driven by the index itself rather than by paid or Mike-only distribution.

**What could AgentCrush do?**
- Identify top evidence-ranked agents whose builders have a public contact point (GitHub, X, email in profile)
- Send a short outreach message: "You're ranked on AgentCrush. Here's your profile, badge, and claim link."
- Measure whether outreach recipients share or claim

**Decision:** Build later. Do not start outreach until claim flow and profile/badge presentation are polished enough that the link landing is worth sharing.

**If promoted:** → Distribution (outreach campaign) or growth loop tracking

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
