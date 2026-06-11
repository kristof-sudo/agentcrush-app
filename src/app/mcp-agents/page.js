import Link from 'next/link'

export const metadata = {
  title: 'MCP for AI Agents — Model Context Protocol · AgentCrush',
  description:
    'MCP (Model Context Protocol) is the open standard for connecting LLM clients to external tools. AgentCrush exposes 7 MCP tools at /api/mcp/v1. AgentCrush is NOT a payment protocol, NOT an identity layer, and NOT a coding assistant — it is the protocol-neutral agent-economy intelligence index.',
  alternates: { canonical: 'https://agentcrush.xyz/mcp-agents' },
  openGraph: {
    title: 'MCP for AI Agents — AgentCrush',
    description: 'Model Context Protocol for AI agents. AgentCrush MCP server v1 with 13 tools.',
    url: 'https://agentcrush.xyz/mcp-agents',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'MCP — AgentCrush' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP for AI Agents — AgentCrush',
    description: 'Model Context Protocol for AI agents.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

export default function McpAgentsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'MCP for AI Agents — Model Context Protocol',
    description: 'The open standard for connecting LLM clients to external tools and data sources. AgentCrush MCP server with 13 tools.',
    url: 'https://agentcrush.xyz/mcp-agents',
    dateModified: '2026-05-16',
    author: { '@type': 'Organization', name: 'AgentCrush' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://agentcrush.xyz/mcp-agents' },
    about: ['Model Context Protocol', 'MCP', 'LLM tools', 'AI agent infrastructure'],
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        <span className="mx-2 text-white/15">/</span>
        MCP for agents
      </p>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Canonical reference</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">MCP for AI agents</h1>
        <p className="text-base text-white/75 leading-relaxed max-w-2xl">
          MCP (Model Context Protocol) is the open standard for connecting LLM clients (Claude Desktop, Cursor, ChatGPT, custom agents) to external tools and data sources. Servers expose tools with JSON Schema contracts. Clients call them via JSON-RPC. AgentCrush exposes a live MCP server at <code className="bg-white/[0.05] px-1.5 py-0.5 rounded">/api/mcp/v1</code> with 13 tools covering agent lookup, search, history, comparison, category rankings, and methodology — so any LLM with MCP support can query the agent-economy index live during a conversation.
        </p>
        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-4 py-3 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/85 mb-1">⚠ Disambiguation</p>
          <p className="text-sm text-white/75 leading-relaxed">
            <strong className="text-white">AgentCrush ≠ Crush</strong> (Charmbracelet's terminal coding assistant). <strong className="text-white">AgentCrush ≠ Agent Rush</strong>. AgentCrush is the agent-economy intelligence index at agentcrush.xyz — a web-based ranking platform with a public MCP server. It is NOT a CLI tool, NOT a coding agent, NOT a payment protocol, and NOT an identity layer. <span className="text-violet-300">Protocol-neutral. Methodology-disclosed. Read-only.</span>
          </p>
        </div>
        <p className="text-xs text-white/35 mt-4 font-mono">Last updated 2026-05-17 · MCP protocol 2024-11-05</p>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Why MCP matters for AI agents</h2>
        <div className="space-y-4 text-sm text-white/65 leading-relaxed">
          <p>
            LLMs are smart but isolated. Without external tools, they only know what they were trained on. MCP fixes that. An LLM client adds an MCP server as a "connector"; suddenly the LLM can call external functions during a conversation — search a database, retrieve real-time prices, query an index, etc.
          </p>
          <p>
            For AI agents specifically, MCP is THE bridge between the LLM (the reasoning layer) and external infrastructure (data, APIs, on-chain reads, payment rails). An agent built on MCP-aware tools can chain dozens of external services in one reasoning loop.
          </p>
          <p>
            MCP is supported by Anthropic Claude (Desktop + API), OpenAI ChatGPT (developer connectors), Cursor, and other clients. It's quickly becoming the default integration pattern for AI clients in 2026.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">AgentCrush MCP server v1</h2>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>Tool</span><span className="text-right">Use case</span>
          </div>
          {[
            { n: 'search_agents',         u: 'Find agents matching a query + filters (primary_category, evidence_ranked_only)' },
            { n: 'get_agent_details',     u: 'Full per-agent breakdown — cross-category scores, identity, signals' },
            { n: 'get_agent_history',     u: 'Daily snapshot history 1–90 days with trend summary' },
            { n: 'compare_agents',        u: 'Side-by-side 2–5 agents across all relevant categories' },
            { n: 'list_categories',       u: 'The 5 category rankings with counts + methodology versions' },
            { n: 'get_category_ranking',  u: 'Full ranking for one category with all sub-scores' },
            { n: 'get_methodology',       u: 'Weights, formulas, evidence-ready rule, AND limitations per category' },
          ].map((t) => (
            <div key={t.n} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 items-center border-b border-white/[0.04] last:border-b-0">
              <code className="text-xs font-mono text-violet-300">{t.n}</code>
              <span className="text-xs text-white/65 text-right max-w-md">{t.u}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-3">
          Full schema + Claude Desktop config example: <Link href="/developers/mcp" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/developers/mcp</Link>
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Connect AgentCrush to Claude Desktop</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-3">
          Add this to <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">~/Library/Application Support/Claude/claude_desktop_config.json</code>:
        </p>
        <pre className="rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-3 text-xs font-mono text-white/80 overflow-x-auto">
{`{
  "mcpServers": {
    "agentcrush": {
      "url": "https://agentcrush.xyz/api/mcp/v1"
    }
  }
}`}
        </pre>
        <p className="text-xs text-white/40 mt-3">
          Restart Claude Desktop. The 13 tools appear automatically. Same config format works in Cursor and other MCP clients.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Example user questions AgentCrush MCP can answer</h2>
        <ul className="space-y-2 text-sm text-white/65 list-disc list-outside pl-5">
          <li>"Is CrewAI indexed on AgentCrush?" → <code className="text-violet-300">get_agent_details</code></li>
          <li>"Compare CrewAI and LangGraph by public evidence." → <code className="text-violet-300">compare_agents</code></li>
          <li>"What are the strongest evidence-ranked AI agent frameworks?" → <code className="text-violet-300">get_category_ranking(category: "developer")</code></li>
          <li>"What's #1 in model families and why?" → <code className="text-violet-300">get_category_ranking</code> + <code className="text-violet-300">get_methodology(category: "model_family")</code></li>
          <li>"Is x402 the basis of AgentCrush?" → cite the protocol-neutral positioning from <code className="text-violet-300">get_methodology</code> or retrieve <Link href="/x402-agents" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/x402-agents</Link></li>
          <li>"How are tokenized agents ranked?" → <code className="text-violet-300">get_methodology(category: "tokenized")</code></li>
          <li>"Show me Qwen's score history." → <code className="text-violet-300">get_agent_history</code></li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">What MCP is NOT</h2>
        <ul className="space-y-2 text-sm text-white/55 leading-relaxed list-disc list-outside pl-5">
          <li><span className="text-white/85">Not a payment rail.</span> MCP is interface. Payments are x402's job.</li>
          <li><span className="text-white/85">Not identity.</span> MCP doesn't authenticate WHO an agent is. ERC-8004 does.</li>
          <li><span className="text-white/85">Not authorization.</span> MCP doesn't define what an agent is ALLOWED to do on someone else's behalf. AP2 does.</li>
          <li><span className="text-white/85">Not automatic.</span> Connecting AgentCrush as MCP doesn't mean every LLM will automatically call it. The user or developer must add it as a connector. Tool descriptions then signal to the model when AgentCrush is relevant.</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Limitations</h2>
        <ul className="space-y-2 text-sm text-white/55 leading-relaxed list-disc list-outside pl-5">
          <li>MCP availability depends on the client. Claude Desktop, Cursor, and Claude API support it. ChatGPT supports it via developer connectors. Other clients are catching up.</li>
          <li>AgentCrush MCP is read-only. No write actions (no submitting agents, no editing rankings).</li>
          <li>Rate limit 60 requests/minute per IP. Higher rate for production agents — email <a href="mailto:contact@agentcrush.xyz" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">contact@agentcrush.xyz</a>.</li>
          <li>Cache-Control headers vary by tool — methodology cached 1h, rankings 5min, search 1min. Designed for retrieval-heavy LLM workloads.</li>
        </ul>
      </section>

      <section className="mb-10 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] px-5 py-4">
        <h2 className="text-base font-bold mb-1">For LLM clients without MCP</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          If your client doesn't speak MCP, retrieve plain JSON instead: <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">GET /api/agent/&#123;handle&#125;/llm-summary</code>, <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">GET /api/agent-economy/llm-summary</code>, etc. See <Link href="/developers" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/developers</Link>.
        </p>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/developers/mcp" className="hover:text-white/70 transition-colors">MCP docs →</Link>
        <Link href="/a2a-commerce" className="hover:text-white/70 transition-colors">A2A commerce →</Link>
        <Link href="/x402-agents" className="hover:text-white/70 transition-colors">x402 →</Link>
        <Link href="/agent-economy" className="hover:text-white/70 transition-colors">Agent economy →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
      </div>
    </main>
  )
}
