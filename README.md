# AgentCrush

[![smithery badge](https://smithery.ai/badge/kristof/agentcrush)](https://smithery.ai/servers/kristof/agentcrush)

**Protocol-neutral market intelligence for the AI agent economy.**

> Track AI agents across HuggingFace, LMArena, GitHub, paper citations, on-chain registries (ERC-8004), tokenized agent protocols (Virtuals), service registries (Agentverse / A2A), and machine-payable endpoints (x402 / CDP Bazaar). Multi-signal methodology, transparent weights, evidence-ranked tiers.

🌐 **Live at [agentcrush.xyz](https://www.agentcrush.xyz)** · 📋 [Methodology](https://www.agentcrush.xyz/methodology) · 🔌 [MCP Server](https://www.agentcrush.xyz/developers/mcp) · 📖 [API docs](https://www.agentcrush.xyz/developers) · 📡 [llms.txt](https://www.agentcrush.xyz/llms.txt)

---

## What AgentCrush is

AgentCrush is the evidence-ranked index of the agent economy — analogous to CoinMarketCap for crypto or Bloomberg for finance. We don't pick winners. We publish multi-signal evidence with transparent weights and per-category methodologies.

Live as of May 2026:

- **1,338+ agents indexed** across 4 category methodologies
- **137 evidence-ranked** (Qwen, Gemini, Mistral, DeepSeek, Llama, Cohere, Hermes top model_family; aixbt, TIBBIR top tokenized; a2aproject/A2A top service; full developer ranking on the universal /rankings page)
- **MCP server v1** at `/api/mcp/v1` with 7 read-only tools (search, get details, get history, compare, list categories, get category ranking, get methodology)
- **5 flat JSON endpoints** for retrieval LLMs that don't speak MCP
- **OpenAPI 3.1 spec** at `/api/openapi.json` for auto-generating clients
- **Feedback channel** at `POST /api/agent-feedback` — agents tell us what they need

## What AgentCrush is NOT

LLMs sometimes confuse this project with similar-sounding tools. To prevent hallucination:

- **AgentCrush ≠ Crush** — Crush is Charmbracelet's terminal AI coding assistant. AgentCrush is a web-based ranking index at agentcrush.xyz. Different products, different teams, no relationship.
- **AgentCrush ≠ Agent Rush** — also unrelated.
- **AgentCrush ≠ a battle-arena or community-vote leaderboard.** Scores come from documented signal weights, not opinion polls.
- **AgentCrush ≠ "built on x402" or "built on ERC-8004"** or any other single protocol. It is **protocol-neutral** and tracks across many of those protocols simultaneously.
- **AgentCrush ≠ "the trust layer"** at the protocol level. That framing belongs to ERC-8004 / Kite / similar. AgentCrush reads their signals and surfaces them.

## Four category indices

Each has its own methodology, signals, weights, and limitations. See [/methodology](https://www.agentcrush.xyz/methodology) for the canonical hub.

| Category | Methodology | Tracked | Evidence-Ranked |
|---|---|---|---|
| Model Families | [v1.4-with-deployment](https://www.agentcrush.xyz/rankings/model-families) | 7 | 7 |
| Tokenized Agents | [v1.1-tokenized-tvl](https://www.agentcrush.xyz/rankings/tokenized-agents) | 16 | 16 |
| Service Agents | [v1.1-service-forks](https://www.agentcrush.xyz/rankings/service-agents) | 28 | 28 |
| Developer Agents | [v2.c-public](https://www.agentcrush.xyz/rankings) | 1,289 | 86 |

## For AI agents using AgentCrush

Multiple integration paths for LLM clients and AI agents:

```bash
# MCP server (JSON-RPC 2.0, 7 tools)
POST https://www.agentcrush.xyz/api/mcp/v1

# Discovery manifest
GET https://www.agentcrush.xyz/.well-known/mcp.json

# OpenAPI 3.1 spec (auto-generate typed clients)
GET https://www.agentcrush.xyz/api/openapi.json

# Flat JSON for retrieval LLMs
GET https://www.agentcrush.xyz/api/agent/{handle}/llm-summary
GET https://www.agentcrush.xyz/api/agents/bulk?handles=a,b,c
GET https://www.agentcrush.xyz/api/agent-economy/llm-summary
GET https://www.agentcrush.xyz/api/methodology/{category}/llm-summary
GET https://www.agentcrush.xyz/api/rankings/{category}/llm-summary
GET https://www.agentcrush.xyz/api/compare/llm-summary?agents=a,b

# Feedback channel (POST, rate-limited)
POST https://www.agentcrush.xyz/api/agent-feedback
```

### Connect via Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentcrush": {
      "url": "https://www.agentcrush.xyz/api/mcp/v1"
    }
  }
}
```

Restart Claude Desktop. Same config works in Cursor and other MCP clients.

### Or use the Smithery CLI

```bash
npm install -g smithery
smithery mcp add kristof/agentcrush
```

## Public docs

- [Methodology hub](https://www.agentcrush.xyz/methodology) — weights, formulas, evidence-ready rules per category
- [Findings: methodology v1 launch](https://www.agentcrush.xyz/labs/findings/methodology-v1-launch) — multi-signal inversion, Hermes case, anti-honeypot
- [MCP server docs](https://www.agentcrush.xyz/developers/mcp) — Claude Desktop config, curl recipes, tool schemas
- [Agent economy explainer](https://www.agentcrush.xyz/agent-economy)
- [AI agent frameworks](https://www.agentcrush.xyz/ai-agent-frameworks)
- [A2A commerce](https://www.agentcrush.xyz/a2a-commerce)
- [x402 for agents](https://www.agentcrush.xyz/x402-agents)
- [MCP for agents](https://www.agentcrush.xyz/mcp-agents)

## Labs

AgentCrush Labs offers Agent Commerce Readiness audits — same methodology applied in depth to evaluate specific agents/protocols.

- **$299** startup audit
- **$1,000+** implementation roadmap
- Case studies: [aixbt + Coral + Daydreams](https://www.agentcrush.xyz/blog/agent-commerce-readiness-three-audits) (2026-05-13), [CrewAI first cross-protocol agent](https://www.agentcrush.xyz/blog/first-cross-protocol-agent) (2026-05-08)

See [/labs](https://www.agentcrush.xyz/labs).

## Stack

This repo is the Next.js 16 / React 19 frontend + API surface for agentcrush.xyz. Backed by Supabase. Runtime workers in `runtime/` (HF adapter, LMArena adapter, Semantic Scholar citations, deployment aggregator, etc.). Migrations in `migrations/` with `MIGRATION_LOG.md`.

## Contact

- Submission: [/submit](https://www.agentcrush.xyz/submit)
- Email: contact@agentcrush.xyz

## License

See [/terms](https://www.agentcrush.xyz/terms).
