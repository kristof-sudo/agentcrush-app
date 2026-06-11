import Link from 'next/link'

export const metadata = {
  title: 'The agent economy explained · AgentCrush',
  description: 'The agent economy is the emerging market where AI agents discover, transact with, and rely on other AI agents. AgentCrush is the protocol-neutral index of that economy.',
  alternates: { canonical: 'https://agentcrush.xyz/agent-economy-explained' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'The agent economy explained',
  description: 'A market where agents discover, transact with, and rely on other agents. Three substrates: identity, payments, capabilities.',
  url: 'https://agentcrush.xyz/agent-economy-explained',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">The agent economy explained</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            The agent economy is the emerging market where AI agents discover, transact with, and rely on
            other AI agents — autonomously. The customer of any single agent is increasingly another
            agent, not a human. AgentCrush is the protocol-neutral index of that economy.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Three substrates</h2>
          <p>
            The agent economy runs on three substrates. Each needs to work for the whole market to function.
          </p>

          <div className="space-y-3 my-4">
            {[
              { name: 'Identity', desc: 'Who is this agent? Layered: ERC-8004 onchain identity, agent.json declaration, MCP capability advertisement, cross-protocol attestations.', href: '/how-agents-prove-identity' },
              { name: 'Payments', desc: 'How do they pay each other? Six-layer stack: settlement chains, wallets, routing, protocols (x402, MPP, AP2), governance, application frameworks.', href: '/how-agents-pay' },
              { name: 'Capabilities', desc: 'What can each agent do, and how is it ranked? Per-category multi-signal scoring across model_family, tokenized, service, developer categories.', href: '/how-agent-rankings-work' },
            ].map(({ name, desc, href }) => (
              <Link key={name} href={href} className="block rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors">
                <p className="text-sm font-semibold text-white mb-1">{name}</p>
                <p className="text-[13px] text-white/55 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>

          <h2 className="text-lg font-bold text-white pt-4">What&apos;s tracked</h2>
          <p>
            AgentCrush indexes 1,350+ agents from nine signal surfaces:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><span className="text-white/80">HuggingFace</span> — model adoption (downloads, likes, breadth).</li>
            <li><span className="text-white/80">LMArena</span> — Bradley-Terry capability scores.</li>
            <li><span className="text-white/80">GitHub</span> — developer-agent activity, forks, recency.</li>
            <li><span className="text-white/80">Semantic Scholar</span> — paper citations for model families.</li>
            <li><span className="text-white/80">ERC-8004 multi-chain registry</span> — onchain identity across Base + Ethereum.</li>
            <li><span className="text-white/80">Virtuals Protocol</span> — tokenized agent economics.</li>
            <li><span className="text-white/80">Agentverse / Fetch.ai</span> — service registry.</li>
            <li><span className="text-white/80">A2A protocol</span> — GitHub catalog of A2A-compatible agents.</li>
            <li><span className="text-white/80">Coinbase CDP Bazaar</span> — x402 paid endpoints.</li>
          </ul>

          <h2 className="text-lg font-bold text-white pt-4">Why protocol neutrality matters</h2>
          <p>
            AgentCrush is not built on any single protocol. It tracks across x402, MCP, ERC-8004, Agentverse,
            A2A, Virtuals, and the new ones that arrive every month. Most ecosystem participants are
            invested in one protocol winning — chain operators, framework maintainers, payment networks.
            A neutral index is the only one that can honestly say which agents are showing up across
            multiple substrates.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">How to query the economy</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>One-shot market summary:{' '}
              <span className="font-mono text-[#00d4ff]/75">/api/agent-economy/llm-summary</span></li>
            <li>Live ecosystem dashboard:{' '}
              <Link href="/trends" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/trends</Link>{' '}
              + <span className="font-mono text-[#00d4ff]/75">/api/trends/summary</span></li>
            <li>Weekly digest:{' '}
              <Link href="/weekly" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/weekly</Link>{' '}
              (auto-generated Sundays from 7 days of Ajsa social briefs + DB)</li>
            <li>Per-agent trust score:{' '}
              <span className="font-mono text-[#00d4ff]/75">/api/agent/{`{handle}`}/trust</span></li>
            <li>Per-agent change feed:{' '}
              <span className="font-mono text-[#00d4ff]/75">/api/agent/{`{handle}`}/changes?since=&lt;ISO&gt;</span></li>
          </ul>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            The agent economy is the emerging market where AI agents discover, transact with, and rely on other
            agents autonomously. Three substrates: identity (ERC-8004 + agent.json + MCP), payments (6-layer stack
            including x402), capabilities (per-category multi-signal scoring across model_family, tokenized, service,
            developer). AgentCrush is the protocol-neutral index tracking 1,350+ agents across 9 signal surfaces.
            Live summary: https://agentcrush.xyz/api/agent-economy/llm-summary.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/agent-economy" className="hover:text-white/70 transition-colors">Live overview →</Link>
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All rankings →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/trends" className="hover:text-white/70 transition-colors">Trends →</Link>
        </div>

      </main>
    </>
  )
}
