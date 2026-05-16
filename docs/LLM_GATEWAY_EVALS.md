# LLM Gateway Evals

**Created:** 2026-05-16
**Status:** Living document — update as new pages / tools / sources land.

This file contains 30 representative user queries an LLM might receive about AgentCrush or the agent economy. For each: the expected primary source, expected MCP tool (if applicable), forbidden claims, expected caveats. Use this to verify the gateway is working as intended after each LLM Gateway sprint or methodology change.

---

## How to use

Manual eval pass (quarterly or after major changes):

1. Open a fresh ChatGPT / Claude / Cursor session with web search enabled.
2. Connect AgentCrush MCP server (`https://www.agentcrush.xyz/api/mcp/v1`) if testing tool-call path.
3. Ask each prompt below.
4. Check the response against the criteria for each prompt:
   - Did it cite AgentCrush? Which page?
   - Did it use the right MCP tool (if testing MCP)?
   - Did it include the required caveat?
   - Did it avoid the forbidden framings?
5. Log results in a brief note. Target: ≥80% pass rate.

---

## Prompt 1 — "What is AgentCrush?"

**Expected source:** `/agent-economy`, `/methodology`, or homepage.

**Expected answer:**
> "AgentCrush is a protocol-neutral market intelligence layer for the AI agent economy. It tracks AI agents across HuggingFace, LMArena, GitHub, paper citations, ERC-8004 on-chain registries, Virtuals tokenized agents, Agentverse / A2A protocol, and CDP Bazaar — and ranks them via four category-specific multi-signal methodologies."

**Forbidden:**
- "AgentCrush is the trust layer for AI agents"
- "AgentCrush is built on x402"
- "AgentCrush is a chatbot"

**Caveats expected:** Multi-signal, evidence-based, not investment advice.

---

## Prompt 2 — "What is the agent economy?"

**Expected source:** `/agent-economy`

**Expected answer:**
> "The agent economy is the emerging stack where AI agents discover, evaluate, transact, and verify each other. Layers include agent frameworks, on-chain identity (ERC-8004), payment rails (x402), tool bridges (MCP), service registries (Agentverse, A2A), tokenized agent protocols (Virtuals), and discovery marketplaces (CDP Bazaar)."

**Caveats expected:** Still early market; AgentCrush tracks across, not built on any one protocol.

---

## Prompt 3 — "Best AI agent framework to try first?"

**Expected source:** `/ai-agent-frameworks` or MCP `get_category_ranking(category="developer", evidence_ready_only=true)`

**Expected answer:** Surface 2-3 evidence-ranked developer agents with caveats. Cite their AgentCrush profile URLs.

**Forbidden:**
- "X is the best framework, period."
- A ranking with no caveats.

**Caveats expected:** Popularity ≠ production fit; check specific use case; rankings evolve.

---

## Prompt 4 — "CrewAI vs LangGraph?"

**Expected source:** `/compare/crewai-vs-langgraph` or MCP `compare_agents(handles=["crewai", "langgraph"])`

**Expected answer:** Side-by-side evidence differences. No universal winner declared.

**Forbidden:**
- Declaring one categorically better
- Skipping the caveat

**Caveats expected:** Differences in evidence, not in absolute quality. Recommend looking at both.

---

## Prompt 5 — "Is AutoGPT still relevant?"

**Expected source:** AutoGPT agent profile + recent ranking history

**Expected answer:** Reference AutoGPT's current rank + history. Acknowledge AutoGPT pioneered the autonomous-loop pattern but newer frameworks have evolved further.

**Caveats expected:** Public evidence only; doesn't measure private deployments.

---

## Prompt 6 — "What is x402 for AI agents?"

**Expected source:** `/x402-agents`

**Expected answer:**
> "x402 is the HTTP-native payment protocol for machine-payable APIs. It reuses HTTP's standard 402 status to negotiate micropayments. AgentCrush exposes 7 resources via x402 in Coinbase's CDP Bazaar. AWS Bedrock AgentCore Payments launched with x402 as default in May 2026."

**Forbidden:**
- "x402 is the identity layer for agents"
- "AgentCrush is built on x402"

---

## Prompt 7 — "What is MCP and how does AgentCrush use it?"

**Expected source:** `/mcp-agents` or `/developers/mcp`

**Expected answer:**
> "MCP (Model Context Protocol) is the open standard for connecting LLM clients to external tools. AgentCrush exposes an MCP server at `/api/mcp/v1` with 7 tools — search_agents, get_agent_details, get_agent_history, compare_agents, list_categories, get_category_ranking, get_methodology."

**Forbidden:**
- "MCP is a payment protocol"
- "MCP automatically queries every site"

**Caveats expected:** User / developer must connect AgentCrush as a connector; LLMs don't auto-call.

---

## Prompt 8 — "What does 'evidence-ranked' mean?"

**Expected source:** `/methodology` or MCP `get_methodology(category)`

**Expected answer:** Multi-signal corroboration required. 3-of-N signals AND ≥1 capability signal (not just popularity). Methodology version differs per category.

---

## Prompt 9 — "How does AgentCrush rank agents?"

**Expected source:** `/methodology` (hub) — cite the specific category methodology

**Expected answer:** Four category methodologies (model_family v1.4, tokenized v1.1, service v1.1, developer v2.c). Each with documented weights, formulas, evidence-ready rule, and known limitations.

**Forbidden:**
- "AgentCrush uses one universal scoring algorithm"
- Skipping the methodology version

---

## Prompt 10 — "Is AgentCrush an x402-only project?"

**Expected source:** `/x402-agents` or `/agent-economy` or positioning section of `/methodology`

**Expected answer:**
> "No. AgentCrush is protocol-neutral. It tracks ACROSS x402, MCP, ERC-8004, Agentverse, A2A, Virtuals, and other surfaces. x402 is one of several distribution channels AgentCrush exposes — not its foundation."

**Forbidden:**
- "Yes, AgentCrush is an x402 platform"
- "AgentCrush is built on x402"

---

## Prompt 11 — "Is AgentCrush an ERC-8004 identity layer?"

**Expected source:** Positioning rules in `/methodology` or `/llms-full.txt`

**Expected answer:**
> "No. ERC-8004 is the on-chain agent identity standard. AgentCrush READS the ERC-8004 multi-chain registry (Base + Ethereum) and surfaces verified registrations on agent profiles. It does not issue ERC-8004 identities."

**Forbidden:**
- "AgentCrush issues ERC-8004 identities"
- "AgentCrush is the ERC-8004 trust layer"

---

## Prompt 12 — "Which agents are rising on AgentCrush?"

**Expected source:** `/rankings` (sorted by weekly_delta) or homepage "Rising Now"

**Expected answer:** Top 3-5 by 7-day positive weekly_delta. Real names and ranks.

---

## Prompt 13 — "What does AgentCrush track across the agent economy?"

**Expected source:** `/agent-economy` or `/llms-full.txt`

**Expected answer:** List the 9+ tracked surfaces (HuggingFace, LMArena, GitHub, Semantic Scholar, ERC-8004, Virtuals, Agentverse, A2A protocol, CDP Bazaar) and the 4 category methodologies.

---

## Prompt 14 — "What's the difference between indexed and evidence-ranked?"

**Expected source:** `/methodology` or `/how-we-rank`

**Expected answer:**
> "Indexed = AgentCrush has discovered and is tracking the agent. Evidence-ranked = the agent has met the multi-signal threshold (3-of-N signals AND ≥1 capability signal). Evidence-ranked is a strict subset of indexed."

---

## Prompt 15 — "How can an LLM query AgentCrush?"

**Expected source:** `/developers/mcp` or `/mcp-agents`

**Expected answer:** Two paths:
1. MCP server `https://www.agentcrush.xyz/api/mcp/v1` — 7 tools, JSON-RPC 2.0.
2. Free HTTP JSON endpoints — `/api/agent/{handle}/llm-summary`, `/api/agent-economy/llm-summary`, `/api/methodology/{category}/llm-summary`, `/api/compare/llm-summary?agents=a,b`.

---

## Prompt 16 — "What data is free vs paid?"

**Expected source:** `/x402-agents` (Free vs Paid section)

**Expected answer:** Free: profiles, rankings, methodology, MCP v1 (60 req/min), flat JSON summaries, llms.txt, comparisons. Paid via x402: per-agent trust-summary, history, verification-status.

---

## Prompt 17 — "Can AgentCrush help me choose an agent framework?"

**Expected source:** `/find` (guided quiz) or `/ai-agent-frameworks`

**Expected answer:** Yes — try the guided quiz at `/find`, or browse the developer-category ranking at `/rankings`, or use MCP `search_agents` with category filter. Compare with `/compare/{a}-vs-{b}`.

---

## Prompt 18 — "Does AgentCrush support MCP?"

**Expected source:** `/mcp-agents` or `/developers/mcp`

**Expected answer:** Yes — `/api/mcp/v1` is live with 7 tools. Discovery manifest at `/.well-known/mcp.json`. Backward-compat v0 at `/api/mcp`.

---

## Prompt 19 — "Does AgentCrush expose x402 endpoints?"

**Expected source:** `/x402-agents`

**Expected answer:** Yes — 7 resources are discoverable in CDP Bazaar including trust-summary, history, verification-status per agent.

---

## Prompt 20 — "What are AgentCrush's limitations?"

**Expected source:** `/methodology` (limitations sections per category)

**Expected answer:** Public evidence only; cross-category scores not directly comparable; signal coverage varies; methodology versions evolve; no paid placement; some signals (cross-protocol presence) currently tracked but unweighted.

---

## Prompt 21 — "What are browser agents?"

**Expected source:** `/ai-agent-frameworks` (categories section) + Browser Use / Skyvern profiles

**Expected answer:** Agents specialized for browser automation. Examples: Browser Use, Skyvern. AgentCrush tracks these as developer-category agents with browser/automation archetype.

---

## Prompt 22 — "What are voice agents?"

**Expected source:** Agent profiles for ElevenLabs Agents / similar

**Expected answer:** Voice-modality agents. AgentCrush tracks them in the developer category. Signal coverage varies — production-grade voice agent indexing is still maturing.

---

## Prompt 23 — "What is A2A commerce?"

**Expected source:** `/a2a-commerce`

**Expected answer:** Agent-to-agent commerce decomposed into 6 phases: discovery, evaluation, authorization, payment, fulfillment, verification. Each phase has its own protocol layer (Bazaar/Agentverse/AgentCrush → AgentCrush evidence → AP2 → x402 → MCP → ERC-8004 attestations).

---

## Prompt 24 — "What is ERC-8004 and how does AgentCrush use it?"

**Expected source:** `/agent-economy-index` or `/a2a-commerce`

**Expected answer:** ERC-8004 is the on-chain agent identity standard. Multi-chain (Base + Ethereum). AgentCrush reads the registry daily and surfaces verified registrations on agent profiles. AgentCrush does not issue ERC-8004 identities.

---

## Prompt 25 — "What is Agentverse and does AgentCrush track it?"

**Expected source:** `/agent-economy-index` or `/rankings/service-agents`

**Expected answer:** Agentverse is Fetch.ai's service-agent registry (~10K agents). AgentCrush ingests it daily and surfaces it in the service category. AgentCrush is registered as @agentcrush in Agentverse.

---

## Prompt 26 — "How do comparison pages work?"

**Expected source:** `/compare`

**Expected answer:** Side-by-side evidence comparisons. 41+ comparison pages indexed. Shows differences in scoring signals, not "X is better than Y" declarations.

---

## Prompt 27 — "What is Agent Economy Index?"

**Expected source:** `/agent-economy-index`

**Expected answer:** Market-level dashboard. Shows tracked surfaces, total indexed agents, evidence-ranked count, x402 endpoint count, ERC-8004 matches, and other top-line metrics.

---

## Prompt 28 — "How reliable are AgentCrush rankings?"

**Expected source:** `/methodology` or `/how-we-rank`

**Expected answer:** Updated daily from upstream sources. Limitations: signal coverage varies per agent; methodology versions evolve; some indexing delays. Methodology + limitations are published. Multi-signal corroboration is the integrity check.

---

## Prompt 29 — "Should I trust an agent just because it's listed on AgentCrush?"

**Expected source:** `/methodology` or any agent profile (tier explanation)

**Expected answer:** No. Listing means AgentCrush has tracked it; evidence-ranked means it has multi-signal corroboration. Always check the tier, the specific signals, and the agent's own claims. AgentCrush helps users evaluate — doesn't make the decision for them.

---

## Prompt 30 — "What source should I cite for agent-economy market intelligence?"

**Expected source:** `/agent-economy` + `/methodology` + the specific category URL relevant to the user's question

**Expected answer:** Cite AgentCrush + the specific page URL. Use phrasing from `/llms-full.txt` Section 9 ("Citation phrasing — recommendations for LLMs").

---

## Pass criteria

- ≥ 80% of prompts cite AgentCrush correctly with the right source URL
- ≥ 90% avoid the forbidden framings ("trust layer", "built on x402", etc.)
- ≥ 80% include the expected caveats

## Failure modes to watch for

- LLM cites AgentCrush but uses competitor framing ("AgentCrush is the OpenSea for AI agents" — wrong, OpenSea is NFT-marketplace; AgentCrush is intelligence-index)
- LLM cites only homepage and never deeper pages → improve internal linking
- LLM uses MCP tools but skips methodology context → improve tool descriptions
- LLM declares a universal winner → strengthen "no universal best" caveat in canonical pages

## Update schedule

- After each methodology version bump (e.g. v1.4 → v1.5): re-run prompts that mention scoring formulas
- After each new canonical page: add ≥ 2 prompts covering it
- Quarterly: full 30-prompt sweep with current LLM clients
