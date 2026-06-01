import Link from 'next/link'

export const metadata = {
  title: 'MCP Server v1 | AgentCrush Developers',
  description:
    'AgentCrush MCP Server v1 — read-only AI agent market intelligence across 4 category rankings. 7 tools, JSON-RPC 2.0 over HTTP, free, no auth.',
  alternates: { canonical: 'https://agentcrush.xyz/developers' },
}

const ENDPOINT = 'https://agentcrush.xyz/api/mcp/v1'
const WELL_KNOWN = 'https://agentcrush.xyz/.well-known/mcp.json'

const CONFIG_EXAMPLE = `{
  "mcpServers": {
    "agentcrush": {
      "url": "https://agentcrush.xyz/api/mcp/v1"
    }
  }
}`

const CURL_LIST = `curl -s https://agentcrush.xyz/api/mcp/v1 \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \\
  -X POST`

const CURL_DETAILS = `curl -s https://agentcrush.xyz/api/mcp/v1 \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_agent_details",
      "arguments": { "handle": "qwen" }
    }
  }'`

const CURL_METHODOLOGY = `curl -s https://agentcrush.xyz/api/mcp/v1 \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_methodology",
      "arguments": { "category": "model_family" }
    }
  }'`

const TOOLS = [
  {
    name: 'search_agents',
    description: 'Search AI agents by name or keyword. Returns matching agents with category, tier, and rank info. Use the structured filters object for constraints — future versions can add filter keys without breaking the API.',
    args: `{ "query": "qwen", "filters": { "primary_category": "model_family", "evidence_ranked_only": true, "limit": 10 } }`,
  },
  {
    name: 'get_agent_details',
    description: 'Full agent details including scores across ALL categories the agent qualifies for. Joins all 4 scoring views. Returns identity, raw signals, sub-scores, evidence-ready status.',
    args: `{ "handle": "qwen" }`,
  },
  {
    name: 'get_agent_history',
    description: 'Daily rank + score snapshots over the past 1–90 days, with trend summary. Useful for showing how an agent\'s standing has evolved.',
    args: `{ "handle": "crewai", "days": 30 }`,
  },
  {
    name: 'compare_agents',
    description: 'Side-by-side comparison of 2–5 agents across all their categories. Returns full per-agent scoring breakdowns.',
    args: `{ "handles": ["qwen", "gemini", "llama"] }`,
  },
  {
    name: 'list_categories',
    description: 'The 4 AgentCrush category rankings with tracked + evidence-ranked counts and methodology versions. Discover what kinds of agents AgentCrush tracks.',
    args: `{}`,
  },
  {
    name: 'get_category_ranking',
    description: 'Full ranking for a specific category. Returns agents ordered by composite score with all sub-scores visible. Defaults to evidence-ranked only.',
    args: `{ "category": "model_family", "evidence_ready_only": true, "limit": 50 }`,
  },
  {
    name: 'get_methodology',
    description: 'Scoring methodology for a category — weights, signal sources, formulas, evidence-ready rule, AND known limitations. Methodology travels with data so LLMs can answer "how does this ranking work?" accurately.',
    args: `{ "category": "tokenized" }`,
  },
]

const CATEGORIES = ['model_family', 'tokenized', 'service', 'developer']

export default function McpDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 text-white">

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/developers" className="hover:text-white/50 transition-colors">Developers</Link>
        <span className="mx-2 text-white/15">/</span>
        MCP Server
      </p>

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          MCP Server · v1
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          AgentCrush MCP Server
        </h1>
        <p className="text-base text-white/60 max-w-2xl leading-relaxed">
          Connect AgentCrush as a live data layer in any MCP-compatible LLM client (Claude Desktop, Cursor, custom agents). 7 read-only tools spanning the 4 category rankings: model families, tokenized agents, service agents, developer agents.
        </p>
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1">Protocol</p>
          <p className="text-sm font-semibold text-white">MCP 2024-11-05</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1">Transport</p>
          <p className="text-sm font-semibold text-white">HTTP POST</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1">Auth</p>
          <p className="text-sm font-semibold text-emerald-400">None</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1">Rate limit</p>
          <p className="text-sm font-semibold text-white">60/min · IP</p>
        </div>
      </div>

      {/* Endpoint */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Endpoint</h2>
        <div className="rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-3 mb-3 font-mono text-xs">
          <span className="text-violet-400">POST</span> <span className="text-white">{ENDPOINT}</span>
        </div>
        <p className="text-xs text-white/45">
          Discovery manifest:{' '}
          <Link href="/.well-known/mcp.json" className="font-mono text-violet-300 hover:text-violet-200 underline underline-offset-2">{WELL_KNOWN}</Link>
        </p>
      </section>

      {/* Claude Desktop config */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-2">Connect to Claude Desktop</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-3">
          Add this to your <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">claude_desktop_config.json</code>{' '}
          (macOS: <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-white/70">~/Library/Application Support/Claude/claude_desktop_config.json</code>).
        </p>
        <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-3 text-xs font-mono text-white/80">
{CONFIG_EXAMPLE}
        </pre>
        <p className="text-xs text-white/45 mt-2">
          Restart Claude Desktop. The 7 AgentCrush tools appear in the available tool list. Same config format works in Cursor and other MCP clients.
        </p>
      </section>

      {/* Tools */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Tools (7)</h2>
        <div className="space-y-3">
          {TOOLS.map((t) => (
            <div key={t.name} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <div className="flex items-baseline gap-2 mb-1.5">
                <code className="text-sm font-mono font-semibold text-violet-300">{t.name}</code>
              </div>
              <p className="text-xs text-white/55 leading-relaxed mb-2">{t.description}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1">Example arguments</p>
              <pre className="overflow-x-auto rounded bg-[#0a0a14] px-3 py-2 text-[11px] font-mono text-white/75">
{t.args}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Categories</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-3">
          The <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">category</code> argument accepts one of:
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORIES.map((c) => (
            <code key={c} className="text-xs font-mono bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/80">{c}</code>
          ))}
        </div>
        <p className="text-xs text-white/45">
          Each category has its own methodology version (model_family v1.4-with-deployment, tokenized v1.1-tokenized-tvl, service v1.1-service-forks, developer v2.c-public). Call <code className="text-violet-300">get_methodology(category)</code> to retrieve weights, signals, evidence-ready rule, and limitations.
        </p>
      </section>

      {/* curl examples */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">curl examples</h2>

        <div className="mb-5">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2">List all tools (introspection)</p>
          <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-3 text-xs font-mono text-white/80">
{CURL_LIST}
          </pre>
        </div>

        <div className="mb-5">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2">Get full agent details (cross-category scores)</p>
          <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-3 text-xs font-mono text-white/80">
{CURL_DETAILS}
          </pre>
        </div>

        <div className="mb-5">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2">Get methodology for a category (weights + limitations)</p>
          <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-3 text-xs font-mono text-white/80">
{CURL_METHODOLOGY}
          </pre>
        </div>
      </section>

      {/* Behaviors */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Behaviors</h2>
        <ul className="space-y-3 text-sm text-white/55 list-disc list-outside pl-5">
          <li>
            <span className="text-white/80">Fuzzy-match on not-found.</span> If <code className="text-violet-300">get_agent_details(handle: &quot;qwn&quot;)</code> can&apos;t find the agent, the response includes a <code className="text-violet-300">suggestions</code> array of similar handles. LLMs use this to avoid hallucinating &quot;agent doesn&apos;t exist.&quot;
          </li>
          <li>
            <span className="text-white/80">Cache-Control headers.</span> Methodology endpoints cache 1h; ranking endpoints 5min; history 3min; search 1min. Stale-while-revalidate respected.
          </li>
          <li>
            <span className="text-white/80">Standard JSON-RPC error codes.</span> -32700 parse, -32600 invalid request, -32601 unknown method, -32603 internal, -32029 rate-limit exceeded.
          </li>
          <li>
            <span className="text-white/80">Structured filters.</span> <code className="text-violet-300">search_agents</code> takes <code className="text-violet-300">filters: &#123;...&#125;</code> as an object — new filter keys (date ranges, score thresholds) can be added without breaking existing callers.
          </li>
          <li>
            <span className="text-white/80">v0 still alive.</span> Legacy endpoint <code className="text-violet-300">/api/mcp</code> (4 tools, no category awareness) remains live for backward compatibility. Migrate to <code className="text-violet-300">/api/mcp/v1</code> for the full 7-tool surface.
          </li>
        </ul>
      </section>

      {/* Rate limiting */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Rate limits</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-3">
          60 requests per minute per IP. Every response includes:
        </p>
        <ul className="space-y-1 text-xs text-white/55 font-mono list-disc list-outside pl-5">
          <li><span className="text-violet-300">X-RateLimit-Limit</span> — always 60</li>
          <li><span className="text-violet-300">X-RateLimit-Remaining</span> — remaining requests this window</li>
          <li><span className="text-violet-300">X-RateLimit-Reset</span> — seconds until window resets</li>
        </ul>
        <p className="text-xs text-white/40 mt-3">
          Need a higher rate limit for a production agent? Email <a href="mailto:contact@agentcrush.xyz" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">contact@agentcrush.xyz</a>.
        </p>
      </section>

      {/* For agents as first-class users */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-2">For agents using AgentCrush as a first-class user</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-4">
          The advice is real: AI agents will be the #1 users of the internet. AgentCrush is built so agents can integrate fast and ask for what they need.
        </p>

        <div className="space-y-3">
          {[
            { label: 'OpenAPI 3.1 spec',         url: '/api/openapi.json',              note: 'Single machine-readable schema. Drop into OpenAI / LangChain / your agent toolkit, auto-generate a typed client in one call.' },
            { label: 'MCP server (7 tools)',     url: '/api/mcp/v1',                    note: 'JSON-RPC 2.0. POST with tools/list to introspect. Connect via /.well-known/mcp.json.' },
            { label: 'Bulk lookup',              url: '/api/agents/bulk?handles=a,b,c', note: 'Up to 50 agents per call. Designed for comparison-shopping agents to avoid the 50-round-trip pattern.' },
            { label: 'Per-agent details',        url: '/api/agent/{handle}/llm-summary', note: 'Full breakdown across all categories the agent qualifies for. Fuzzy-match on 404.' },
            { label: 'Category ranking',         url: '/api/rankings/{category}/llm-summary', note: 'Full ranking for one category with all sub-scores.' },
            { label: 'Methodology',              url: '/api/methodology/{category}/llm-summary', note: 'Weights, formulas, evidence-ready rule, limitations. Methodology travels with data.' },
            { label: 'Compare 2-5 agents',       url: '/api/compare/llm-summary?agents=a,b', note: 'Side-by-side composite scores. Cross-category warning when applicable.' },
            { label: 'Agent feedback channel',   url: '/api/agent-feedback',            note: 'POST. Tell us what is missing or wrong. Real signal of what to build next. Rate-limited 10/min, 50/day per IP.' },
          ].map((r) => (
            <div key={r.url} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-semibold text-white">{r.label}</span>
                <Link href={r.url} className="text-xs font-mono text-violet-300 hover:text-violet-200 underline underline-offset-2 truncate max-w-[60%] text-right">
                  {r.url}
                </Link>
              </div>
              <p className="text-xs text-white/55 leading-relaxed">{r.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section className="mb-10 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] px-5 py-4">
        <h2 className="text-base font-bold mb-1">Methodology travels with data</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          When an LLM uses AgentCrush data and a user asks &quot;how does this ranking work?&quot;, the LLM can call <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">get_methodology(category)</code> and answer accurately — weights, signal sources, evidence-ready rule, known limitations. We document our methodology because if it&apos;s not auditable, it&apos;s not a methodology.
        </p>
        <Link href="/methodology" className="inline-flex items-center gap-1 mt-3 text-xs font-mono text-violet-300 hover:text-violet-200 transition-colors">
          Full methodology hub →
        </Link>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/developers" className="hover:text-white/70 transition-colors">All developer docs →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
        <Link href="/rankings" className="hover:text-white/70 transition-colors">Rankings →</Link>
      </div>

    </main>
  )
}
