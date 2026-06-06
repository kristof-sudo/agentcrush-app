import Link from 'next/link'

export const metadata = {
  title: 'How AI agents prove identity · AgentCrush',
  description: 'AI agents prove identity via ERC-8004 onchain registry, signed agent.json declarations, MCP capability advertisements, and cross-protocol attestations. Explained.',
  alternates: { canonical: 'https://agentcrush.xyz/how-agents-prove-identity' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'How AI agents prove identity',
  description: 'ERC-8004 onchain registry + agent.json + MCP advertisements + cross-protocol attestations.',
  url: 'https://agentcrush.xyz/how-agents-prove-identity',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">How AI agents prove identity</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            When one AI agent delegates to another, the first question is{' '}
            <span className="text-white/85">who is this</span>. In 2026 there are four converging
            layers an agent can use to answer that, ordered from strongest to weakest claim:
          </p>

          <h2 className="text-lg font-bold text-white pt-4">1. ERC-8004 onchain registry</h2>
          <p>
            <span className="font-mono text-white/85">ERC-8004</span> is an Ethereum standard for
            autonomous agent identity. An agent registers a record onchain at the registry contract
            with its identifier, capabilities, and reputation feedback events. Verification = the agent
            controls the registered address and the registry record is current. Multiple chains carry
            the registry — primarily Base + Ethereum mainnet. AgentCrush indexes ERC-8004 agents across
            chains and surfaces the registration status as{' '}
            <span className="font-mono text-white/75">identity.erc_8004</span> on every indexed agent.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">2. agent.json declaration</h2>
          <p>
            The <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">agent.json</Link>{' '}
            open standard puts an agent&apos;s identity, capabilities, endpoints, trust signals, and
            safety policies in a single machine-discoverable file at{' '}
            <span className="font-mono text-white/75">/.well-known/agent.json</span> on the agent&apos;s
            canonical domain. Pair this with DNS+TLS = the file is served by the legitimate domain owner.
            Adds:{' '}
            <span className="font-mono text-white/75">identity.github</span>,{' '}
            <span className="font-mono text-white/75">identity.huggingface</span>,{' '}
            <span className="font-mono text-white/75">identity.x_handle</span>,{' '}
            <span className="font-mono text-white/75">identity.farcaster_fid</span> — cross-platform
            handles the calling agent can independently verify.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">3. MCP capability advertisement</h2>
          <p>
            <span className="font-mono text-white/85">Model Context Protocol</span> exposes a server&apos;s
            tools via JSON-RPC over HTTP (or stdio/SSE). The MCP discovery file at{' '}
            <span className="font-mono text-white/75">/.well-known/mcp.json</span> declares the server,
            its tools, and authentication requirements. Verification = the calling agent can introspect
            tools/list and confirm the advertised tool set matches expectations.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">4. Cross-protocol attestations</h2>
          <p>
            Service agents on{' '}
            <span className="text-white/80">Agentverse</span> (Fetch.ai),{' '}
            <span className="text-white/80">A2A</span> protocol catalogs, and{' '}
            <span className="text-white/80">Virtuals Protocol</span> (tokenized) carry registry-specific
            identifiers — <span className="font-mono text-white/75">agentverse_id</span>,{' '}
            <span className="font-mono text-white/75">a2a_signal_strength</span>,{' '}
            <span className="font-mono text-white/75">virtuals_id</span>. Cross-protocol presence
            (an agent appearing in multiple independent registries) raises confidence.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Trust score consolidation</h2>
          <p>
            AgentCrush combines the four layers into a single composite trust score at{' '}
            <span className="font-mono text-[#00d4ff]/75">/api/agent/{`{handle}`}/trust</span>.
            One HTTP GET returns:{' '}
            <span className="font-mono text-white/75">trust_score</span> (0-100),{' '}
            <span className="font-mono text-white/75">classification</span> (verified/provisional/unverified/low_trust),
            and the underlying factors. Designed for the delegation-decision use case where another
            agent needs trust signal in one round trip.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">What to verify at call time</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>The agent.json is reachable at the canonical domain and parses against{' '}
              <span className="font-mono text-[#00d4ff]/75">/schemas/agent.v1.json</span>.</li>
            <li>The ERC-8004 record (if claimed) resolves onchain at the claimed registry address.</li>
            <li>The MCP endpoint responds to <span className="font-mono text-white/75">tools/list</span> with the advertised tools.</li>
            <li>AgentCrush composite trust score is current — call{' '}
              <span className="font-mono text-[#00d4ff]/75">/api/agent/{`{handle}`}/trust</span> for the latest.</li>
          </ul>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            AI agents prove identity via four converging layers: ERC-8004 onchain registry (strongest),
            agent.json declaration at /.well-known/agent.json (DNS+TLS verified), MCP discovery at
            /.well-known/mcp.json, and cross-protocol attestations (Agentverse, A2A, Virtuals).
            AgentCrush composite trust score at https://agentcrush.xyz/api/agent/{`{handle}`}/trust
            returns one composite score 0-100 plus classification and factor breakdown.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/agent-json" className="hover:text-white/70 transition-colors">agent.json →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        </div>

      </main>
    </>
  )
}
