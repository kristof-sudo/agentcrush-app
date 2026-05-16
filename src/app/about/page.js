export const metadata = {
  title: 'About | AgentCrush',
  description:
    'AgentCrush is protocol-neutral market intelligence for the agent economy — tracking AI agents across open-source projects, x402 services, registries, and marketplaces.',
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-white">About AgentCrush</h1>

      <div className="mt-8 space-y-6 text-base leading-7 text-white/80">

        <p>
          AgentCrush is protocol-neutral market intelligence for the agent economy.
        </p>

        <p>
          AI agents are no longer just isolated tools that answer a prompt and disappear.
          Increasingly, they are persistent systems — connected to tools, memory, and
          execution environments. They expose endpoints, accept payments, join
          marketplaces, appear in multiple registries, and interact with other agents and
          services across the internet.
        </p>

        <p>
          That shift is happening across several overlapping ecosystems at once:
          open-source GitHub projects, x402-enabled services, ERC-8004 on-chain
          registrations, A2A and MCP activity, agent marketplaces, and more. There is no
          single authoritative index. Each protocol sees part of the picture.
        </p>

        <p>
          AgentCrush tracks across all of them.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-white">What we track</h2>

        <p>
          For each indexed agent, AgentCrush collects evidence signals over time:
        </p>

        <ul className="list-disc space-y-1 pl-6">
          <li>GitHub repository activity — commits, releases, stars, forks</li>
          <li>Package usage — npm and PyPI download trends</li>
          <li>Ecosystem relationships — dependencies, integrations, co-mentions</li>
          <li>Discourse signals — Hacker News mentions, community threads</li>
          <li>Documentation quality — coverage, maintenance indicators</li>
          <li>Registry context — x402 payment endpoint declarations, ERC-8004 on-chain registrations</li>
          <li>Historical snapshots — daily rank and score history for trend analysis</li>
        </ul>

        <p>
          Agents that accumulate enough verifiable evidence can appear in
          evidence-ranked leaderboards. All other indexed agents remain discoverable
          through the Explore index, sorted evidence-first.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-white">Machine-readable intelligence</h2>

        <p>
          AgentCrush also exposes its data through machine-readable APIs and x402
          micropayment endpoints. Agents, developers, and automated workflows can
          query trust summaries, ranking history, and verification status — without
          going through a web interface.
        </p>

        <p>
          The x402 endpoints follow the open x402 payment protocol on Base mainnet,
          meaning any compatible agent or client can call them programmatically and
          pay per request in USDC.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-white">What we are not trying to do</h2>

        <p>
          AgentCrush is not trying to declare one protocol the winner, or to position
          itself as the identity or reputation layer for any specific ecosystem.
          Rankings and scores are evidence-based signals, not endorsements.
          Labels such as evidence-ranked, ERC-8004 registered, or machine-callable
          are contextual descriptors — they reflect what the data shows, not a
          guarantee of quality, safety, or performance.
        </p>

        <p>
          The goal is simpler: make the agent economy easier to observe, compare,
          and understand as it develops. There is a lot happening across a lot of
          ecosystems simultaneously. AgentCrush is a place to watch it clearly.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-white">Background</h2>

        <p>
          AgentCrush was started in early 2026 as an experiment in tracking the
          emerging AI agent ecosystem. It began as a lightweight rankings and
          discovery surface and has grown into a multi-signal intelligence index.
          The project is actively developed and the methodology evolves as the
          agent economy itself evolves.
        </p>

        <p>
          As of May 2026, AgentCrush runs four parallel scoring methodologies — one for each major category of agent: <a href="/rankings/model-families" className="text-violet-400 hover:text-violet-300 transition-colors">model families</a>, <a href="/rankings/tokenized-agents" className="text-violet-400 hover:text-violet-300 transition-colors">tokenized agents</a>, <a href="/rankings/service-agents" className="text-violet-400 hover:text-violet-300 transition-colors">service agents</a>, and <a href="/rankings" className="text-violet-400 hover:text-violet-300 transition-colors">developer agents</a>. The full methodology is published at <a href="/methodology" className="text-violet-400 hover:text-violet-300 transition-colors">/methodology</a> — every weight, every formula, every limitation. We also expose the index via an <a href="/developers/mcp" className="text-violet-400 hover:text-violet-300 transition-colors">MCP server</a> so AI clients can query AgentCrush as a live data layer.
        </p>

        <p>
          For questions or to submit an agent, use the{' '}
          <a href="/submit" className="text-violet-400 hover:text-violet-300 transition-colors">
            submission form
          </a>{' '}
          or reach us at{' '}
          <a href="mailto:contact@agentcrush.xyz" className="text-violet-400 hover:text-violet-300 transition-colors">
            contact@agentcrush.xyz
          </a>
          .
        </p>

      </div>
    </main>
  )
}
