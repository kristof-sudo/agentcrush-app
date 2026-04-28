import Link from 'next/link'

export const metadata = {
  title: 'MCP Server | AgentCrush Developers',
  description:
    'AgentCrush MCP Server v0 — read-only AI agent market intelligence for AI clients and agents. Query rankings, search agents, compare, and retrieve history.',
}

const TOOLS = [
  {
    name: 'lookup_agent',
    input: '{ "handle": "crewai" }',
    description: 'Rank, score, tier, archetype, and profile for a single agent.',
  },
  {
    name: 'search_agents',
    input: '{ "query": "agent", "limit": 10 }',
    description: 'Search agents by name or keyword. Returns up to 20 results.',
  },
  {
    name: 'compare_agents',
    input: '{ "handle_a": "crewai", "handle_b": "autogpt" }',
    description: 'Side-by-side rank, score, and archetype comparison for two agents.',
  },
  {
    name: 'get_history',
    input: '{ "handle": "crewai", "days": 30 }',
    description: 'Daily rank and score snapshots for up to 90 days.',
  },
]

const CONFIG_EXAMPLE = `{
  "mcpServers": {
    "agentcrush": {
      "url": "https://agentcrush.xyz/api/mcp",
      "transport": "http"
    }
  }
}`

export default function McpDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          Developers · MCP
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          AgentCrush MCP Server
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
          v0 · Read-only · No auth required
        </p>
        <p className="mt-3 text-sm text-white/50 max-w-xl leading-relaxed">
          Query AgentCrush directly from any MCP-compatible AI client or agent.
          Evidence-ranked agent index, rankings, history, and comparisons — all
          read-only, no API key needed in v0.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mb-10 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
        <p className="text-xs text-amber-400/80 leading-relaxed">
          <span className="font-semibold text-amber-400">Informational only.</span>{' '}
          AgentCrush market intelligence is for research and discovery purposes.
          Do not use for financial decisions. Rankings are deterministic signals,
          not investment advice.
        </p>
      </div>

      {/* Endpoint */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Endpoint</h2>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-mono text-sm text-violet-300">
          POST https://agentcrush.xyz/api/mcp
        </div>
        <p className="mt-2 text-xs text-white/40">
          MCP JSON-RPC 2.0 · Protocol version 2024-11-05 · Streamable HTTP transport
        </p>
      </section>

      {/* Client config */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Client configuration</h2>
        <p className="text-sm text-white/50 mb-3">
          Add to your MCP client config (e.g. Claude Desktop, Cursor, or any MCP-compatible host):
        </p>
        <pre className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-xs text-white/70 overflow-x-auto whitespace-pre-wrap">
          {CONFIG_EXAMPLE}
        </pre>
      </section>

      {/* Tools */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-1">Available tools</h2>
        <p className="text-xs text-white/35 mb-5">4 read-only tools in v0</p>
        <div className="space-y-4">
          {TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <code className="text-sm font-semibold text-violet-300">{tool.name}</code>
              </div>
              <p className="text-xs text-white/50 mb-3">{tool.description}</p>
              <pre className="text-xs text-white/40 font-mono bg-white/[0.03] rounded px-3 py-2 overflow-x-auto">
                {`{ "name": "${tool.name}", "arguments": ${tool.input} }`}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Protocol notes */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Protocol notes</h2>
        <ul className="space-y-2 text-sm text-white/50">
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>
              <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">POST /api/mcp</code>{' '}
              accepts MCP JSON-RPC 2.0 requests
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>
              <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">GET /api/mcp</code>{' '}
              returns server info and tool manifest
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>No authentication required in v0</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>All tools are read-only — no write actions exposed</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>
              Inputs are validated and sanitized; limits are server-enforced
              (search max 20, history max 90 days)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>CORS open for AI client access</span>
          </li>
        </ul>
      </section>

      {/* Related */}
      <section className="mb-10 pt-6 border-t border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">
          Related
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/api-docs"
            className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] rounded px-3 py-1.5 transition-colors"
          >
            x402 API docs →
          </Link>
          <Link
            href="/agent-economy-index"
            className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] rounded px-3 py-1.5 transition-colors"
          >
            Agent Economy Index →
          </Link>
          <Link
            href="/rankings"
            className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] rounded px-3 py-1.5 transition-colors"
          >
            Rankings →
          </Link>
          <Link
            href="/explore"
            className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] rounded px-3 py-1.5 transition-colors"
          >
            Explore agents →
          </Link>
        </div>
      </section>

    </main>
  )
}
