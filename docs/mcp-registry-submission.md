# MCP Registry Submission Guide

**Target:** registry.modelcontextprotocol.io (official Anthropic-maintained MCP registry)  
**Status:** Ready to submit — `server.json` in repo root is accurate and validated  
**Date prepared:** 2026-06-10

---

## What this achieves

Listing on the official MCP registry makes AgentCrush discoverable to:
- Claude Desktop / Claude.ai users browsing the built-in registry
- Any MCP client that resolves server names from `registry.modelcontextprotocol.io`
- Developers building agentic systems who search the registry for data/intelligence tools

This is the highest-leverage free distribution to agents (agents look up tools by registry name).

---

## The `server.json` file

`/server.json` in the repo root is the submission artifact. It is validated against:
`https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`

Current content: 12 tools, `streamable-http` transport, no auth, rate limit 60/min.

---

## Submission steps

### Option A — Registry web form (preferred if available)

1. Go to https://registry.modelcontextprotocol.io
2. Look for "Submit a server" or "Add listing"
3. Paste the URL `https://raw.githubusercontent.com/kristof-sudo/agentcrush-app/main/server.json`
   or upload the `server.json` file directly
4. The registry name is: `io.github.kristof-sudo/agentcrush-app`

### Option B — GitHub PR to the registry repo

If the registry is maintained as a public GitHub repo (confirm at https://github.com/modelcontextprotocol):

```bash
# Fork the registry repo on GitHub, then:
git clone https://github.com/<your-fork>/registry
cd registry

# Copy our server.json into the servers directory
# (directory structure may vary — check the existing entries)
mkdir -p servers/io.github.kristof-sudo
cp /path/to/agentcrush-app/server.json servers/io.github.kristof-sudo/agentcrush-app.json

git checkout -b add-agentcrush
git add servers/io.github.kristof-sudo/agentcrush-app.json
git commit -m "Add AgentCrush MCP server — protocol-neutral market intelligence for AI agents"
git push origin add-agentcrush
# Open PR against the registry's main branch
```

### Option C — `npx @modelcontextprotocol/create-server` or similar CLI

If Anthropic releases an official publisher CLI, the invocation would be:

```bash
cd /path/to/agentcrush-app
npx @modelcontextprotocol/publish-server server.json
# or
npx mcpx publish server.json
```

Check https://www.npmjs.com/org/modelcontextprotocol for any new CLI packages.

---

## After submission

- The registry name `io.github.kristof-sudo/agentcrush-app` is how Claude Desktop will resolve it
- Users can add it to Claude Desktop config as:

```json
{
  "mcpServers": {
    "agentcrush": {
      "url": "https://www.agentcrush.xyz/api/mcp/v1"
    }
  }
}
```

- Once listed, update `STATE.md` distribution table: MCP Registry → ✅ LIVE

---

## Already listed

- ✅ Glama Connectors: https://glama.ai/mcp/connectors/io.github.kristof-sudo/agentcrush-app (confirmed live 2026-06-10)
- ⬜ registry.modelcontextprotocol.io — pending this submission
- ⬜ PulseMCP + mcp.so — B2 (next task)
- ⬜ Smithery — B3 (if compatible with hosted SaaS)
