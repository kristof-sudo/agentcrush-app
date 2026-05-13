import Link from 'next/link'

export const metadata = {
  title: 'The first cross-protocol agent: CrewAI on ERC-8004 and x402 — AgentCrush',
  description:
    'A worked example of an agent active on two protocol surfaces at once — CrewAI registered on ERC-8004 (Base, token #17997) with x402_supported: true. What AgentCrush sees when we cross the data, and why multi-rail becomes the default.',
  alternates: {
    canonical: 'https://www.agentcrush.xyz/blog/first-cross-protocol-agent',
  },
  openGraph: {
    title: 'The first cross-protocol agent: CrewAI on ERC-8004 and x402 — AgentCrush',
    description:
      'A worked example of an agent active on two protocol surfaces at once — CrewAI registered on ERC-8004 (Base, token #17997) with x402_supported: true. What AgentCrush sees when we cross the data, and why multi-rail becomes the default.',
    url: 'https://www.agentcrush.xyz/blog/first-cross-protocol-agent',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://www.agentcrush.xyz/og-cross-protocol-agent.png',
        width: 1731,
        height: 909,
        alt: 'First cross-protocol agent indexed: CrewAI on ERC-8004 and x402 — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-05-08T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The first cross-protocol agent: CrewAI on ERC-8004 and x402 — AgentCrush',
    description:
      'A worked example of an agent active on two protocol surfaces at once — CrewAI registered on ERC-8004 (Base, token #17997) with x402_supported: true. What AgentCrush sees when we cross the data, and why multi-rail becomes the default.',
    images: ['https://www.agentcrush.xyz/og-cross-protocol-agent.png'],
  },
}

export default function FirstCrossProtocolAgent() {
  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        The first cross-protocol agent
      </p>

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        The first cross-protocol agent: CrewAI on ERC-8004 and x402
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        A worked example of an agent active on two protocol surfaces at once — and what AgentCrush sees when we cross the data.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>May 8, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      {/* Hero image */}
      <div className="mt-8 rounded-xl overflow-hidden">
        <img
          src="/og-cross-protocol-agent.png"
          alt="First cross-protocol agent indexed: CrewAI on ERC-8004 and x402"
          className="w-full h-auto"
        />
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          In April 2026 we ran the first ERC-8004 reader sync against AgentCrush&apos;s index. Two agents matched: agentlab and CrewAI. CrewAI was the more interesting one. They are registered on Base (token #17997), and the registration declares{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">x402_supported: true</code>.
        </p>

        <p>
          That single match is our first concrete cross-protocol data point. It is small. It is also the shape of what comes next.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The four-standard stack</h2>

        <p>
          Castle Labs published a useful frame in April: agent commerce is not one protocol but four interlocking standards.
        </p>

        <ul className="mt-1 space-y-2">
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span><span className="text-white/85 font-medium">x402</span> answers payment — can this HTTP resource be paid per call?</span>
          </li>
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span><span className="text-white/85 font-medium">ERC-8004</span> answers identity — is this agent registered on-chain, by whom, on which network?</span>
          </li>
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span><span className="text-white/85 font-medium">ERC-8183</span> answers commerce — can agents run a structured job lifecycle with escrow and evaluation?</span>
          </li>
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span><span className="text-white/85 font-medium">ERC-8211</span> answers execution — how does the agent&apos;s work get verifiably done?</span>
          </li>
        </ul>

        <p>
          None of these is the same use case. None of them wins alone. A travel agent might use x402 for a weather API call, ERC-8004 for its own identity, ERC-8183 for the booking escrow, and ERC-8211 for the actual flight reservation. Different surfaces, same agent.
        </p>

        <p>
          Most agent projects pick one. CrewAI is one of the first we have indexed that picked two.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What we actually see</h2>

        <p>
          CrewAI&apos;s profile on AgentCrush surfaces both rails. From the ERC-8004 side: a Base registration at token #17997, owner address resolved, network confirmed. From the x402 side: their registration metadata declares x402 support — meaning a downstream agent reading the registry knows it can attempt machine payment.
        </p>

        <p>
          This is the small, specific thing that matters. An agent reading the ERC-8004 registry can now act on more than identity. It can route the next decision: <em>this agent is registered, on this chain, and accepts payment via this rail.</em> That&apos;s a routing decision a protocol-neutral intelligence layer can make on behalf of the calling agent.
        </p>

        <p>
          Today, exactly two agents in our index do this. We expect that number to grow quickly.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we don&apos;t pick</h2>

        <p>
          AgentCrush is the layer above the protocols, not on them. We track across — we do not back any single standard.
        </p>

        <p>
          That is a deliberate position. The protocols compete with each other. The intelligence layer profits from all of them shipping. CrewAI&apos;s two-protocol presence is not a victory for ERC-8004 or for x402. It is a data point about an agent that decided one surface was not enough.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What we expect to see next</h2>

        <p>A few specific things, in rough order of likelihood:</p>

        <div className="space-y-4 mt-1">

          <div className="flex gap-3">
            <span className="font-mono text-white/30 shrink-0 text-sm mt-0.5">1.</span>
            <p>
              <span className="text-white/85 font-medium">More cross-protocol agents.</span>{' '}
              ERC-8004 has 181,000+ registrations across networks per the 8004scan public registry. Agentic.Market reports more than 11,000 x402 sellers. The protocols themselves are scaling. The intersection is two. Six months from now we expect the intersection to be in the hundreds, then thousands.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="font-mono text-white/30 shrink-0 text-sm mt-0.5">2.</span>
            <p>
              <span className="text-white/85 font-medium">ERC-8183 jobs as the next signal.</span>{' '}
              ERC-8004 says an agent exists. ERC-8183 says an agent is doing structured work with escrow and evaluation. That is higher-signal evidence of real activity, and we are scoping a reader for it.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="font-mono text-white/30 shrink-0 text-sm mt-0.5">3.</span>
            <p>
              <span className="text-white/85 font-medium">The TradFi-side trust layer arriving in parallel.</span>{' '}
              Experian&apos;s Agent Trust and Visa&apos;s Trusted Agent Protocol launched April 30. Different stack, same conceptual problem — verify the human behind the agent. We expect to track both surfaces alongside ERC-8004 within the next quarter.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="font-mono text-white/30 shrink-0 text-sm mt-0.5">4.</span>
            <div className="space-y-3">
              <p>
                <span className="text-white/85 font-medium">Multi-rail will become the default.</span>{' '}
                The agents that survive the next twelve months will support more than one payment surface. They will look more like CrewAI than like the single-protocol projects of late 2025.
              </p>
              <p>
                Yesterday, AWS announced{' '}
                <a
                  href="https://aws.amazon.com/blogs/machine-learning/agents-that-transact-introducing-amazon-bedrock-agentcore-payments-built-with-coinbase-and-stripe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400/80 hover:text-violet-300 transition-colors"
                >
                  Bedrock AgentCore Payments
                </a>
                {' '}with x402 support, Coinbase and Stripe wallet infrastructure, and the Coinbase x402 Bazaar MCP server exposed through AgentCore Gateway. The pattern is no longer hypothetical. The intelligence layer above these protocols becomes the place where agents — and the humans behind them — figure out which surfaces matter for which decisions.
              </p>
            </div>
          </div>

        </div>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Reading the registry yourself</h2>

        <p>If you build on either standard:</p>

        <ul className="mt-1 space-y-3">
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span>
              The ERC-8004 reader prototype is open source. It is at{' '}
              <a
                href="https://github.com/kristof-sudo/agentcrush-app/blob/main/scripts/erc8004-reader-prototype.mjs"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-violet-300/80 hover:text-violet-300 transition-colors"
              >
                scripts/erc8004-reader-prototype.mjs
              </a>{' '}
              in the AgentCrush repo. Read-only, no auth, runs against{' '}
              <a
                href="https://8004scan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400/80 hover:text-violet-300 transition-colors"
              >
                8004scan.io
              </a>
              &apos;s public API.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span>
              AgentCrush&apos;s MCP server exposes{' '}
              <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">lookup_agent</code>{' '}
              and{' '}
              <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">compare_agents</code>{' '}
              for any indexed handle, including CrewAI. You can call it from Claude Code or Cursor. No auth, no payment.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-white/60">
            <span className="text-[#e91e80] mt-1 shrink-0 text-xs">◆</span>
            <span>
              CrewAI&apos;s profile is at{' '}
              <Link
                href="/agent/crewai"
                className="text-violet-400/80 hover:text-violet-300 transition-colors"
              >
                agentcrush.xyz/agent/crewai
              </Link>
              . The cross-protocol surfaces are visible there.
            </span>
          </li>
        </ul>

        <p>
          If you have never executed an x402 buyer call before, our cheapest endpoint is the verification-status route at $0.005. That is the lowest-friction way to ship your first x402 buyer integration — a 5-cent end-to-end test against a live, indexed seller on Base mainnet. Code samples are on{' '}
          <Link
            href="/developers"
            className="text-violet-400/80 hover:text-violet-300 transition-colors"
          >
            /developers
          </Link>
          .
        </p>

        <p>
          For builders thinking about which standards to support — that question is exactly what our Agent Commerce Readiness Audit answers. We have shipped three x402 endpoints on Base ourselves. We can tell you which surfaces you actually need and which you can skip.
        </p>

        <p>
          The first cross-protocol agent is one. The interesting question is the second hundred.
        </p>

        <hr className="border-white/[0.06]" />

        <p className="text-sm text-white/35 italic">
          References:{' '}
          <a
            href="https://research.castlelabs.io/p/the-beginning-of-agentic-finance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400/60 hover:text-violet-300 transition-colors not-italic"
          >
            Castle Labs, &ldquo;The Beginning of Agentic Finance&rdquo;
          </a>
          {' '}(April 2026);{' '}
          <a
            href="https://8004scan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400/60 hover:text-violet-300 transition-colors not-italic"
          >
            8004scan.io
          </a>
          {' '}public registry;{' '}
          <a
            href="https://www.agentic.market"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400/60 hover:text-violet-300 transition-colors not-italic"
          >
            Agentic.Market
          </a>
          {' '}live stats. AgentCrush ERC-8004 reader prototype:{' '}
          <a
            href="https://github.com/kristof-sudo/agentcrush-app/blob/main/scripts/erc8004-reader-prototype.mjs"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-violet-400/60 hover:text-violet-300 transition-colors not-italic"
          >
            scripts/erc8004-reader-prototype.mjs
          </a>
          .
        </p>

      </div>

      <hr className="my-10 border-white/[0.06]" />

      {/* Related links */}
      <div className="flex flex-wrap gap-5">
        <Link
          href="/agent/crewai"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          CrewAI profile →
        </Link>
        <Link
          href="/developers"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          Developers →
        </Link>
        <Link
          href="/agent-economy-index"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          Agent Economy Index →
        </Link>
      </div>

    </main>
  )
}
