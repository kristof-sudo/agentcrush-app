import Link from 'next/link'

export const metadata = {
  title: 'MCP Server | AgentCrush Developers',
  description:
    'AgentCrush MCP Server v0 — free, read-only AI agent market intelligence for AI clients and agents. Query rankings, search agents, compare, and retrieve history. No auth or payment required.',
}

const CURL_EXAMPLE = `curl -s https://www.agentcrush.xyz/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "lookup_agent",
      "arguments": { "handle": "crewai" }
    }
  }'`

const EXAMPLE_RESPONSE = `{
  "handle": "crewai",
  "name": "CrewAI",
  "tier": "evidence_ranked",
  "rank": 23,
  "scores": {
    "total": 7820,
    "visibility": 81,
    "reputation": 62
  },
  "profile_url": "https://agentcrush.xyz/agent/crewai"
}`

const TOOLS = [
  {
    name: 'lookup_agent',
    description: 'Rank, score, tier, archetype, ERC-8004 status, and profile for a single agent.',
    required: ['handle: string'],
    optional: [],
    args: '{ "handle": "crewai" }',
  },
  {
    name: 'search_agents',
    description: 'Search agents by name or keyword. Returns up to 20 results ordered by visibility score.',
    required: ['query: string'],
    optional: ['limit: number (1–20, default 10)'],
    args: '{ "query": "agent", "limit": 10 }',
  },
  {
    name: 'compare_agents',
    description: 'Side-by-side rank, score, and archetype comparison for two agents, with a plain-text summary.',
    required: ['handle_a: string', 'handle_b: string'],
    optional: [],
    args: '{ "handle_a": "crewai", "handle_b": "autogpt" }',
  },
  {
    name: 'get_history',
    description: 'Daily rank and score snapshots (deduplicated per calendar day). Returns safe empty result if no history exists.',
    required: ['handle: string'],
    optional: ['days: number (1–90, default 30)'],
    args: '{ "handle": "crewai", "days": 30 }',
  },
]

const CONFIG_EXAMPLE = `{
  "mcpServers": {
    "agentcrush": {
      "url": "https://www.agentcrush.xyz/api/mcp",
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
          v0 · Read-only · Free · No auth required
        </p>
        <p className="mt-3 text-sm text-white/60 max-w-xl leading-relaxed">
          AgentCrush is market intelligence for the agent economy — an evidence-ranked index of AI agents,
          frameworks, and agent-facing services. This MCP server exposes that index as tools so any
          MCP-compatible AI client or agent can query it directly.
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

      {/* Free & open */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Free &amp; open in v0</h2>
        <ul className="space-y-2 text-sm text-white/55">
          <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span><span>No payment required — MCP calls are free in v0</span></li>
          <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span><span>No API key, no registration, no auth header</span></li>
          <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Read-only — all 4 tools are queries, no write actions exist</span></li>
          <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span><span>CORS open — accessible from browsers and agent runtimes</span></li>
        </ul>
      </section>

      {/* MCP vs x402 */}
      <section className="mb-10 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-4">
        <h2 className="text-sm font-semibold text-white mb-2">MCP vs x402 APIs — two separate channels</h2>
        <p className="text-xs text-white/45 leading-relaxed mb-3">
          AgentCrush has two machine-readable interfaces. They serve different use cases and are independently priced:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded border border-violet-500/20 bg-violet-500/[0.04] px-3 py-3">
            <p className="font-semibold text-violet-300 mb-1">MCP server (this page)</p>
            <p className="text-white/45 leading-relaxed">Free. No auth. Read-only tools for AI clients — lookup, search, compare, history.</p>
          </div>
          <div className="rounded border border-white/[0.08] px-3 py-3">
            <p className="font-semibold text-white/60 mb-1">x402 REST APIs</p>
            <p className="text-white/45 leading-relaxed mb-2">Pay-per-call via USDC on Base. No subscriptions.</p>
            <ul className="text-white/35 space-y-0.5">
              <li>trust-summary — $0.02 / call</li>
              <li>history — $0.02 / call</li>
              <li>verification-status — $0.005 / call</li>
            </ul>
            <Link href="/api-docs" className="text-violet-400 hover:text-violet-300 transition-colors mt-2 inline-block">x402 API docs →</Link>
          </div>
        </div>
      </section>

      {/* Endpoint */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Endpoint</h2>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-mono text-sm text-violet-300">
          POST https://www.agentcrush.xyz/api/mcp
        </div>
        <p className="mt-2 text-xs text-white/40">
          MCP JSON-RPC 2.0 · Protocol version 2024-11-05 · Streamable HTTP transport
        </p>
        <p className="mt-1 text-xs text-white/30">
          GET returns server info and tool manifest.
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

      {/* Quick test */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-2">Quick test</h2>
        <p className="text-sm text-white/50 mb-3">
          Full JSON-RPC 2.0 call — run this directly in your terminal:
        </p>
        <pre className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-xs text-white/70 overflow-x-auto whitespace-pre-wrap">
          {CURL_EXAMPLE}
        </pre>
        <p className="mt-3 text-xs text-white/35 mb-2">Example response (abbreviated):</p>
        <pre className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-xs text-white/50 overflow-x-auto whitespace-pre-wrap">
          {EXAMPLE_RESPONSE}
        </pre>
      </section>

      {/* Tools */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-1">Available tools</h2>
        <p className="text-xs text-white/35 mb-5">
          4 read-only tools · pass as <code className="text-violet-300 bg-white/[0.05] px-1 rounded">params</code> in a{' '}
          <code className="text-violet-300 bg-white/[0.05] px-1 rounded">tools/call</code> JSON-RPC request
        </p>
        <div className="space-y-4">
          {TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-4"
            >
              <code className="text-sm font-semibold text-violet-300">{tool.name}</code>
              <p className="text-xs text-white/50 mt-1 mb-3">{tool.description}</p>
              <div className="text-xs text-white/35 mb-3 space-y-0.5">
                {tool.required.map((f) => (
                  <div key={f}><span className="text-white/20">required</span> {f}</div>
                ))}
                {tool.optional.map((f) => (
                  <div key={f}><span className="text-white/20">optional</span> {f}</div>
                ))}
              </div>
              <p className="text-xs text-white/25 mb-1">arguments:</p>
              <pre className="text-xs text-white/45 font-mono bg-white/[0.03] rounded px-3 py-2 overflow-x-auto">
                {tool.args}
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
              accepts MCP JSON-RPC 2.0 — supports <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">initialize</code>,{' '}
              <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">tools/list</code>,{' '}
              <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">tools/call</code>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>
              <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">GET /api/mcp</code>{' '}
              returns server info and tool manifest (no JSON-RPC wrapper needed)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-400 mt-0.5">·</span>
            <span>Inputs validated server-side — handles allow only <code className="text-violet-300 bg-white/[0.05] px-1 rounded text-xs">[a-zA-Z0-9_-]</code>, search queries stripped of SQL wildcards, limits clamped</span>
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
