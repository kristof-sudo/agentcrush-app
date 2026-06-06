import Link from 'next/link'

export const metadata = {
  title: 'Agents with agent.json — live registry · AgentCrush',
  description: 'Public registry of agents that serve a /.well-known/agent.json. Self-submission via the feedback endpoint; auto-discovery scan runs nightly.',
  alternates: { canonical: 'https://agentcrush.xyz/agents-with-agent-json' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Agents implementing agent.json v0.1',
  url: 'https://agentcrush.xyz/agents-with-agent-json',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Organization',
        name: 'AgentCrush',
        url: 'https://agentcrush.xyz',
        sameAs: 'https://agentcrush.xyz/.well-known/agent.json',
      },
    },
  ],
}

// Manual seed list. Auto-discovery scanner will populate this from a DB table
// once R-4.1 ships, but for launch the only listed agent is AgentCrush itself.
const REGISTRY = [
  {
    name: 'AgentCrush',
    handle: 'agentcrush',
    homepage: 'https://agentcrush.xyz',
    agent_json: 'https://agentcrush.xyz/.well-known/agent.json',
    agent_type: 'registry',
    description: 'The evidence-ranked index of the AI agent economy. Reference implementation of agent.json v0.1.',
    is_reference: true,
  },
]

export default function AgentsWithAgentJsonPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Live registry · v0.1</p>
        <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
          Agents with agent.json
        </h1>
        <p className="mt-3 text-[15px] text-white/55 leading-relaxed max-w-[60ch]">
          Every agent below serves a valid <span className="font-mono text-white/75">/.well-known/agent.json</span>{' '}
          declaring identity, capabilities, endpoints, and trust signals. List grows as the standard catches on.
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono">
          <Link href="/agent-json" className="text-[#00d4ff]/70 hover:text-[#00d4ff] border border-[#00d4ff]/20 rounded px-3 py-1.5">
            Spec →
          </Link>
          <a href="https://agentcrush.xyz/api/agent-json/validate" className="text-[#00d4ff]/70 hover:text-[#00d4ff] border border-[#00d4ff]/20 rounded px-3 py-1.5">
            Validator →
          </a>
          <a href="https://agentcrush.xyz/api/agent-feedback" className="text-violet-400/70 hover:text-violet-300 border border-violet-400/20 rounded px-3 py-1.5">
            Submit yours →
          </a>
        </div>

        <hr className="my-10 border-white/[0.06]" />

        {/* Registry list */}
        <section className="mb-10">
          <p className="text-xs font-mono text-white/30 mb-4">{REGISTRY.length} listed</p>
          <div className="space-y-3">
            {REGISTRY.map(({ name, handle, homepage, agent_json, agent_type, description, is_reference }) => (
              <div key={handle} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-baseline gap-3">
                    <Link href={homepage} className="text-white font-semibold hover:text-[#00d4ff] transition-colors">{name}</Link>
                    <span className="text-xs font-mono text-white/30">@{handle}</span>
                    {is_reference && <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400/70">reference</span>}
                  </div>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{agent_type}</span>
                </div>
                <p className="text-sm text-white/55 leading-relaxed">{description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-mono">
                  <a href={agent_json} className="text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors">
                    agent.json →
                  </a>
                  <a href={`https://agentcrush.xyz/api/agent-json/validate?url=${encodeURIComponent(agent_json)}`} className="text-violet-400/60 hover:text-violet-300 transition-colors">
                    validate →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to get listed */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">How to get listed</h2>
          <ol className="space-y-3 text-sm text-white/55 leading-relaxed list-decimal pl-5">
            <li>
              Read the <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">spec</Link>{' '}
              and use the <Link href="https://agentcrush.xyz/.well-known/agent.json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">reference</Link>{' '}
              as your template.
            </li>
            <li>Drop your file at <span className="font-mono text-white/75">https://your-domain.com/.well-known/agent.json</span>. Make sure it returns <span className="font-mono text-white/75">Content-Type: application/json</span> and is publicly fetchable.</li>
            <li>
              Run the validator:{' '}
              <span className="font-mono text-white/75 text-xs">GET /api/agent-json/validate?url=&lt;your-url&gt;</span>.
              Address any errors. Warnings are recommended-coverage hints — fix as many as you can.
            </li>
            <li>
              Tell us:{' '}
              <span className="font-mono text-white/75 text-xs">POST /api/agent-feedback</span>{' '}
              with body <span className="font-mono text-white/75 text-xs">{`{"type":"agent_json_submission","agent_json_url":"<your-url>"}`}</span>. Nightly scan also auto-discovers from agents we already index.
            </li>
          </ol>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/agent-json" className="hover:text-white/70 transition-colors">Spec →</Link>
          <a href="https://agentcrush.xyz/schemas/agent.v1.json" className="hover:text-white/70 transition-colors">Schema →</a>
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        </div>

      </main>
    </>
  )
}
