import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function StartHerePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 text-white">
      <div className="max-w-3xl">
        <div className="text-sm uppercase tracking-[0.18em] text-white/45">
          Start here
        </div>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          New to AI agents?
        </h1>

        <p className="mt-4 text-lg leading-8 text-white/70">
          AI agents are software systems that can notice things, decide what to
          do, and act automatically. AgentCrush helps you understand who is who
          in that ecosystem.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">What is an AI agent?</h2>
          <p className="mt-3 text-white/65">
            An AI agent is software that can observe, decide, and act.
          </p>

          <div className="mt-5 space-y-3 text-sm text-white/70">
            <div>Coding agents write or fix code.</div>
            <div>Research agents gather and analyze information.</div>
            <div>Social agents watch conversations and reply.</div>
            <div>Crypto agents operate inside onchain systems.</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Why is everyone talking about them now?</h2>
          <p className="mt-3 text-white/65">
            Better AI models can now understand tasks, use tools, and act more
            independently. That is why agent projects are suddenly appearing
            across GitHub, research labs, developer communities, and crypto
            networks.
          </p>
        </section>

       <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
  <h2 className="text-xl font-semibold">How the AI agent ecosystem is structured</h2>

  <p className="mt-3 text-white/65 max-w-3xl">
    The modern AI agent ecosystem has several layers. Each layer plays a
    different role in how autonomous systems are built and operate.
  </p>

  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="font-medium text-white">Frameworks</div>
      <div className="mt-1 text-sm text-white/60">
        Developer tools used to build AI agents. Example: LangChain, CrewAI.
      </div>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="font-medium text-white">Agents</div>
      <div className="mt-1 text-sm text-white/60">
        Software systems that observe, decide, and perform tasks.
      </div>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="font-medium text-white">Infrastructure</div>
      <div className="mt-1 text-sm text-white/60">
        Systems that agents depend on to operate reliably.
      </div>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="font-medium text-white">Ecosystems</div>
      <div className="mt-1 text-sm text-white/60">
        Networks, communities, and platforms where agents collaborate.
      </div>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="font-medium text-white">Observation Layer</div>
      <div className="mt-1 text-sm text-white/60">
        Platforms like AgentCrush that track activity and map the ecosystem.
      </div>
    </div>
  </div>
</section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">What AgentCrush does</h2>
          <p className="mt-3 text-white/65">
            AgentCrush is not where agents run. It is where people understand
            the agent ecosystem.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium text-white">Evidence</div>
              <div className="mt-1 text-sm text-white/60">
                GitHub activity, ecosystem integrations, machine-discoverable surfaces.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium text-white">Cross-protocol signals</div>
              <div className="mt-1 text-sm text-white/60">
                x402, ERC-8004, MCP, Bazaar — which rails an agent supports.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium text-white">Activity</div>
              <div className="mt-1 text-sm text-white/60">
                Signal movement, score deltas, and momentum.
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold">How scores work</h2>
        <p className="mt-3 max-w-3xl text-white/65">
          AgentCrush scores reflect visibility, reputation, and momentum. The
          exact formula is not public, but rankings respond to ecosystem
          attention, reputation signals, and recent activity.
        </p>
      </section>

<section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
  <h2 className="text-xl font-semibold">Follow the index</h2>

  <p className="mt-3 max-w-3xl text-white/65">
    AgentCrush publishes weekly ecosystem intelligence on{' '}
    <a href="https://x.com/agentcrush_xyz" target="_blank" rel="noreferrer noopener" className="text-violet-400 hover:text-violet-300 transition-colors">
      X (@agentcrush_xyz)
    </a>{' '}
    and{' '}
    <a href="https://warpcast.com/agentcrush" target="_blank" rel="noreferrer noopener" className="text-violet-400 hover:text-violet-300 transition-colors">
      Farcaster (@agentcrush)
    </a>{' '}
    — rank moves, cross-protocol findings, and Labs audits.
  </p>

</section>
            
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/rankings"
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Explore rankings
        </Link>

        <Link
          href="/categories"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Browse categories
        </Link>

        <Link
          href="/submit"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Submit agent
        </Link>
      </div>
    </main>
  )
}
