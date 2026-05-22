# agentcrush-brain MCP server

Exposes the [agentcrush-brain](https://github.com/kristof-sudo/agentcrush-brain) repo as queryable MCP tools. Phase 2 #3 of the AI-infrastructure architecture.

Replaces grep + Read + SSH for any MCP-aware client (Claude Code, Claude Desktop, Cursor) that needs to query brain state.

## Tools

| Tool | Purpose |
|---|---|
| `get_state` | Return current STATE.md (canonical week focus, product state, blockers) |
| `search_log` | Search Log.md entries by substring; filter by date; newest-first |
| `append_log` | Append a structured entry (agent, did, decided, open, handoff) to Log.md |
| `get_decisions` | List Decisions/ files; read one by id |
| `list_queue` | Return Queue/open.md (current WIP) |
| `read_agent_output` | Read latest (or named) file from `Agents/<name>/output/` — e.g. today's Ajsa social brief without SSH |

## Register with Claude Code

```bash
cd /Users/pk/projects/agentcrush-app/runtime/brain-mcp
npm install
claude mcp add brain node "$(pwd)/server.mjs"
```

Or add to `~/.claude/mcp.json` manually:

```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["/Users/pk/projects/agentcrush-app/runtime/brain-mcp/server.mjs"],
      "env": {
        "BRAIN_PATH": "/Users/pk/projects/agentcrush-brain"
      }
    }
  }
}
```

Then in a Claude Code session, the tools are callable as `mcp__brain__get_state`, `mcp__brain__search_log`, etc.

## Smoke test

```bash
node server.mjs <<< '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

## Env

| Var | Default | Notes |
|---|---|---|
| `BRAIN_PATH` | `/Users/pk/projects/agentcrush-brain` | Absolute path to the brain checkout |

## Design notes

- **stdio transport.** Each Claude Code session spawns its own server process. No daemon, no port, no auth surface.
- **Read tools cache nothing** — every call re-reads from disk. Safe across `git pull`.
- **Write tools are minimal** — only `append_log` writes, and only ever appends (never edits existing entries).
- **No tools for Memory.md or STATE.md writes.** Those are Class C (Memory) and Class B (STATE) per the brain's write protocol — require explicit operator action, not agent action.
- **Cached EPIPE handler** so the server exits cleanly when a client closes the pipe (smoke tests, abrupt disconnects).
