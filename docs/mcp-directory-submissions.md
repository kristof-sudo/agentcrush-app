# MCP Directory Submissions — PulseMCP + mcp.so

**Prepared:** 2026-06-11  
**Status:** Ready for Kris to execute — copy-paste ready below

---

## What this achieves

Two more distribution surfaces for the AgentCrush MCP server:
- **PulseMCP** (17,000+ servers, ingested daily by Claude-ecosystem tooling)
- **mcp.so** (20,000+ servers, high SEO surface for "list of MCP servers" searches)

Already live: Glama Connectors ✅ `https://glama.ai/mcp/connectors/io.github.kristof-sudo/agentcrush-app`

---

## Shared metadata (prepared once, used below)

| Field | Value |
|---|---|
| Name | AgentCrush |
| Endpoint | `https://www.agentcrush.xyz/api/mcp/v1` |
| Transport | Streamable HTTP |
| Auth | None |
| Rate limit | 60 req/min per IP |
| Tool count | 12 |
| Repo | `https://github.com/kristof-sudo/agentcrush-app` |
| Homepage | `https://www.agentcrush.xyz` |
| Docs | `https://www.agentcrush.xyz/developers/mcp` |
| Icon (512px) | `https://www.agentcrush.xyz/agentcrush-icon-512.png` |

**One-line description (≤100 chars):**
```
Market intelligence for the AI agent economy — rankings, trust signals, liveness.
```

**Extended description (≤160 chars):**
```
Protocol-neutral market intelligence for the AI agent economy. Evidence-ranked rankings, trust signals, and liveness across 1,300+ indexed agents.
```

**Claude Desktop config snippet (copy this verbatim into submission forms):**
```json
{
  "mcpServers": {
    "agentcrush": {
      "url": "https://www.agentcrush.xyz/api/mcp/v1"
    }
  }
}
```

---

## 1. PulseMCP

**Primary path — auto-ingestion from official MCP Registry**

PulseMCP ingests from the official MCP Registry (GitHub) daily and processes weekly. Once the B1 official registry PR is submitted and merged, PulseMCP will list AgentCrush automatically within ~7 days.

> Dependency: B1 (PR #82) must be merged and the official registry GitHub PR submitted first.
> Check after ~7 days: `https://www.pulsemcp.com/servers?q=agentcrush`

**Fallback — direct form submission**

If not auto-listed within 7 days of the official registry submission:

1. Go to **https://www.pulsemcp.com/submit**
2. Select toggle: **MCP Server**
3. In the URL field enter: `https://github.com/kristof-sudo/agentcrush-app`
4. Submit

**Fallback — email (if form produces no result after 3 more days)**

Send to `hello@pulsemcp.com`:

> Subject: Listing request — AgentCrush MCP server
>
> Hi, we'd like to list the AgentCrush MCP server on PulseMCP.
>
> - Endpoint: https://www.agentcrush.xyz/api/mcp/v1
> - Repo: https://github.com/kristof-sudo/agentcrush-app
> - Glama listing (already live): https://glama.ai/mcp/connectors/io.github.kristof-sudo/agentcrush-app
> - 12 tools, streamable-http, no auth, 60 req/min
> - Description: Protocol-neutral market intelligence for the AI agent economy — evidence-ranked rankings, trust signals, and liveness across 1,300+ indexed agents.
>
> Happy to provide anything else you need.

---

## 2. mcp.so

**Submission method:** Self-registration via their website form.

1. Go to **https://mcp.so**
2. Look for "Submit" in the navigation bar (top right)
3. Fill in the fields using the copy below — all copy is ready to paste

### Fields to fill

**Name:**
```
AgentCrush
```

**Description:**
```
Protocol-neutral market intelligence for the AI agent economy. Evidence-ranked rankings, trust signals, and liveness across 1,300+ indexed agents.
```

**Homepage URL:**
```
https://www.agentcrush.xyz
```

**GitHub / Repository URL:**
```
https://github.com/kristof-sudo/agentcrush-app
```

**Transport type:** Streamable HTTP

**Auth:** None

**Docs URL:**
```
https://www.agentcrush.xyz/developers/mcp
```

**Config snippet (paste exactly):**
```json
{
  "mcpServers": {
    "agentcrush": {
      "url": "https://www.agentcrush.xyz/api/mcp/v1"
    }
  }
}
```

**Tools (12 total — paste as list if the form allows):**
- `search_agents` — Search AI agents by name or keyword with structured filters
- `get_agent_details` — Full scoring breakdown for any indexed agent
- `get_agent_history` — Daily rank + score snapshots (1–90 days)
- `compare_agents` — Side-by-side comparison of 2–5 agents
- `list_categories` — Category indices with agent counts and methodology versions
- `get_category_ranking` — Full ranking for a specific category
- `get_methodology` — Scoring methodology per category: weights, signals, limitations
- `get_agent_trust` — Composite trust score (0–100) + classification for delegation decisions
- `get_top_movers` — Top weekly rank movers (up or down)
- `get_protocol_adoption` — How many indexed agents touch each major protocol
- `get_agent_changes` — Material delta scan over an agent's recent snapshots
- `get_ecosystem_summary` — One-call ecosystem-level summary: counts, movers, snapshot volume

**Icon URL (512px PNG):**
```
https://www.agentcrush.xyz/agentcrush-icon-512.png
```

**Categories to select (choose all that apply):**
- Data
- AI & Machine Learning
- Directory / Discovery

---

## After both submissions

Update STATE.md distribution table once confirmed live:

```
| PulseMCP | ✅ LIVE — https://www.pulsemcp.com/servers?q=agentcrush |
| mcp.so   | ✅ LIVE — https://mcp.so/server/agentcrush |
```

---

## Status

| Registry | Status | Who acts |
|---|---|---|
| Glama Connectors | ✅ LIVE (2026-06-10) | — |
| PulseMCP | ⏳ Pending B1 merge + auto-ingest (7 days) | Kris: merge PR #82, submit official registry PR |
| mcp.so | ⏳ Pending form submission | Kris: fill form at mcp.so (copy above) |
| Official MCP Registry | ⏳ Pending PR #82 merge | Kris: external GitHub submission step in docs/mcp-registry-submission.md |
