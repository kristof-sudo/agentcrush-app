import Link from 'next/link'

export const metadata = {
  title: 'MCP vs A2A — agent protocols compared · AgentCrush',
  description: 'Model Context Protocol exposes tools to agents. Agent-to-Agent (A2A) protocol lets agents delegate tasks to each other. Same use case, different layers — compared.',
  alternates: { canonical: 'https://agentcrush.xyz/mcp-vs-a2a' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'MCP vs A2A — agent protocols compared',
  description: 'Tool-exposure vs task-delegation. Which protocol fits which problem.',
  url: 'https://agentcrush.xyz/mcp-vs-a2a',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">MCP vs A2A</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            <span className="font-mono text-white/85">Model Context Protocol (MCP)</span> and{' '}
            <span className="font-mono text-white/85">Agent-to-Agent (A2A)</span> protocol get conflated
            because both are open standards for agent communication. They solve different problems.
          </p>

          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06] my-4">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 items-baseline">
              <p className="col-span-3 text-xs font-mono text-white/40 uppercase tracking-wider">dimension</p>
              <p className="col-span-4 text-xs font-semibold text-violet-400 font-mono">MCP</p>
              <p className="col-span-5 text-xs font-semibold text-[#00d4ff] font-mono">A2A</p>
            </div>
            {[
              ['Steward',           'Anthropic',                                       'Google'],
              ['Core abstraction',  'A server exposes tools to one agent',             'An agent delegates a task to another agent'],
              ['Direction',         'One-way (agent calls server)',                    'Bilateral (agents collaborate)'],
              ['Transport',         'JSON-RPC over stdio · HTTP · SSE',                'HTTP + SSE for streaming'],
              ['Discovery',         '/.well-known/mcp.json',                            'Agent Card (varies by deployment)'],
              ['Granularity',       'Function-level — list tools, call one',           'Task-level — submit a task, get streaming updates'],
              ['Maturity (2026)',   'Wide adoption: Claude Desktop, Cursor, OpenAI',   'Earlier-stage; growing alongside Google AP'],
              ['AgentCrush role',   '7 MCP tools live; listed in 3 MCP registries',    'Endpoint in queue (Phase R-4.17)'],
            ].map(([dim, mcp, a2a], i) => (
              <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3 items-baseline">
                <p className="col-span-3 text-[13px] text-white/55 font-mono">{dim}</p>
                <p className="col-span-4 text-sm text-white/75">{mcp}</p>
                <p className="col-span-5 text-sm text-white/75">{a2a}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold text-white pt-4">When to choose MCP</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>You want to expose your service as a set of callable tools to LLMs.</li>
            <li>Your typical interaction is &ldquo;LLM asks question, your service answers.&rdquo;</li>
            <li>You want plug-and-play with Claude Desktop, Cursor, OpenAI ChatGPT&apos;s Connectors.</li>
            <li>Single round-trip is the norm; streaming is nice-to-have.</li>
          </ul>

          <h2 className="text-lg font-bold text-white pt-4">When to choose A2A</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>You&apos;re building a multi-step task that spans multiple agents.</li>
            <li>Streaming progress updates back to the caller matters (long-running tasks).</li>
            <li>You expect bilateral negotiation — agents proposing alternatives, asking clarifying questions.</li>
            <li>You want a task ledger that survives connection drops.</li>
          </ul>

          <h2 className="text-lg font-bold text-white pt-4">Why pick both</h2>
          <p>
            In practice they compose. An A2A task can call MCP tools internally. An MCP server can be
            wrapped by an A2A endpoint to expose its tools as task primitives. The right answer is
            often <span className="text-white/80">advertise both</span> — declare an MCP server in your
            <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2"> agent.json</Link>{' '}
            <span className="font-mono text-white/75">endpoints.mcp</span> and an A2A endpoint in{' '}
            <span className="font-mono text-white/75">endpoints.a2a</span>.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">AgentCrush as MCP server</h2>
          <p>
            AgentCrush exposes 7 MCP tools at{' '}
            <Link href="/api/mcp/v1" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2 font-mono">/api/mcp/v1</Link>:{' '}
            <span className="font-mono text-white/75">search_agents</span>,{' '}
            <span className="font-mono text-white/75">get_agent_details</span>,{' '}
            <span className="font-mono text-white/75">get_agent_history</span>,{' '}
            <span className="font-mono text-white/75">compare_agents</span>,{' '}
            <span className="font-mono text-white/75">list_categories</span>,{' '}
            <span className="font-mono text-white/75">get_category_ranking</span>,{' '}
            <span className="font-mono text-white/75">get_methodology</span>. Discovery file at{' '}
            <Link href="/.well-known/mcp.json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2 font-mono">/.well-known/mcp.json</Link>.
            Listed on Smithery, mcp.so, and the Official MCP Registry.
          </p>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            MCP (Model Context Protocol, Anthropic) exposes tools from a server to an agent — function-level,
            JSON-RPC over stdio/HTTP/SSE, discovered via /.well-known/mcp.json. A2A (Agent-to-Agent, Google)
            handles task delegation between agents — task-level, HTTP+SSE, bilateral. Compose: A2A tasks
            internally call MCP tools. AgentCrush ships MCP at /api/mcp/v1 with 7 tools; A2A endpoint queued.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/api/mcp/v1" className="hover:text-white/70 transition-colors">MCP server →</Link>
          <Link href="/.well-known/mcp.json" className="hover:text-white/70 transition-colors">MCP discovery →</Link>
          <Link href="/developers/mcp" className="hover:text-white/70 transition-colors">MCP docs →</Link>
          <Link href="/agent-json" className="hover:text-white/70 transition-colors">agent.json →</Link>
        </div>

      </main>
    </>
  )
}
