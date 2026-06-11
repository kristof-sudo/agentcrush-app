# Smithery listing — submission guide (B3)

Verified 2026-06-11: Smithery supports **remote/hosted MCP servers** over streamable
HTTP — no self-hosting or Dockerfile requirement (unlike awesome-mcp-servers, which we
deferred permanently). Our endpoint qualifies as-is.

## What Smithery needs

| Field | Value (copy-paste) |
|---|---|
| Server URL | `https://www.agentcrush.xyz/api/mcp/v1` |
| Transport | Streamable HTTP (JSON-RPC 2.0) |
| Auth | None (open, rate-limited 60 req/min/IP) |
| Name | AgentCrush |
| Short description (≤100 chars) | `Market intelligence for the AI agent economy: rankings, trust signals, liveness. 13 tools.` |
| Longer description | `Protocol-neutral, evidence-ranked index of 1,350+ AI agents across GitHub, HuggingFace, LMArena, ERC-8004, Virtuals, Agentverse, A2A, and x402/Bazaar. Ask which agents are real, alive, and safe to pay: counterparty discovery (find_agents), trust evaluation, Ghost Index liveness, category rankings with published methodology. Free, no API key.` |
| Repository | `https://github.com/kristof-sudo/agentcrush-app` |
| Website | `https://agentcrush.xyz` |
| Icon | `https://agentcrush.xyz/agentcrush-logo.png` |
| Discovery manifest | `https://www.agentcrush.xyz/.well-known/mcp.json` |
| Tools (13) | search_agents, get_agent_details, get_agent_history, compare_agents, list_categories, get_category_ranking, get_methodology, get_agent_trust, get_top_movers, get_protocol_adoption, get_agent_changes, get_ecosystem_summary, find_agents |

## Human steps (Kris, ~10 min)

1. Sign in at https://smithery.ai with the GitHub account (kristof-sudo) → creates the
   publisher account.
2. Add server → choose **remote / hosted** → paste the URL + fields above.
3. Optional validation before/after: `npx @smithery/cli mcp add agentcrush` (or test the
   endpoint in their playground) — our server answers `initialize`, `tools/list`,
   `tools/call` per MCP 2024-11-05, already verified live in prod.
4. After listing appears, tell Claude Code → STATE distribution table + registry-presence
   KPI count get updated (this would be surface #6).

## Notes

- Smithery may also auto-ingest from the official MCP registry (we're listed,
  v1.2.0 live, v1.3.0 republish pending) — if the listing appears on its own after the
  republish, step 2 becomes a claim instead of a submission.
- No spend, no code changes required. Rate limit and tool quality already meet their
  remote-server bar (Glama scored the same endpoint A / 5-of-5 tools).
