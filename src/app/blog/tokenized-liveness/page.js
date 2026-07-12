import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'Tokenized agents score 0% on the Ghost Index. Here\'s why that\'s our problem, not theirs. — AgentCrush',
  description:
    'The Ghost Index shows every indexed tokenized agent at 0% liveness. Not because they\'re dead — tokenized agents move real capital. The instrument is wrong. Endpoint uptime doesn\'t map to on-chain agents.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/tokenized-liveness',
  },
  openGraph: {
    title: 'Tokenized agents: 0% on the Ghost Index — AgentCrush',
    description:
      'The Ghost Index shows tokenized agents at 0% liveness. Per-category breakdown, why endpoint uptime is the wrong instrument, and what the right one looks like.',
    url: 'https://agentcrush.xyz/blog/tokenized-liveness',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/api/og?title=Tokenized+liveness+gap',
        width: 1200,
        height: 630,
        alt: 'Tokenized agents score 0% on the Ghost Index — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-07-17T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tokenized agents: 0% on the Ghost Index — AgentCrush',
    description:
      '0% tokenized liveness. Not because they\'re dead — the instrument is wrong. Per-category breakdown and what correct tokenized liveness looks like.',
    images: ['https://agentcrush.xyz/api/og?title=Tokenized+liveness+gap'],
  },
}

const CATEGORY_LIVENESS = [
  { category: 'MCP servers',     pct: '100%', agents: 15,    note: 'Selection effect — only indexed when multi-registry corroborated' },
  { category: 'Model families',  pct: '100%', agents: 12,    note: 'All major families have active inference APIs' },
  { category: 'Service agents',  pct: '97.9%', agents: 96,   note: 'Hosted SaaS with persistent endpoints' },
  { category: 'Developer agents',pct: '57.2%', agents: 130,  note: 'Open-source; repos survive longer than running instances' },
  { category: 'Tokenized agents',pct: '0%',   agents: 'to verify', note: 'Instrument gap — no endpoint to probe' },
]

export default function TokenizedLiveness() {
  return (
    <>
      <BlogJsonLd
        slug="tokenized-liveness"
        title="Tokenized agents score 0% on the Ghost Index. Here's why that's our problem, not theirs."
        summary="The Ghost Index shows every indexed tokenized agent at 0% liveness. Not because they're dead — the instrument is wrong. Endpoint uptime doesn't map to on-chain agents."
        date="2026-07-17"
        imageUrl="/api/og?title=Tokenized+liveness+gap"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Tokenized liveness gap
      </p>

      {/* Cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/api/og?title=Tokenized+liveness+gap"
        alt="Tokenized agents score 0% on the Ghost Index — AgentCrush"
        width={1200}
        height={630}
        className="w-full rounded-xl border border-white/[0.08] mb-8"
      />

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Tokenized agents score 0% on the Ghost Index. Here&apos;s why that&apos;s our problem, not theirs.
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        The Ghost Index runs nightly across five categories. MCP servers: 100% alive. Service agents:
        97.9%. Developer agents: 57.2%. Tokenized agents: 0%. Not because they&apos;re inactive —
        tokenized agents process real on-chain volume. Endpoint uptime is the wrong instrument
        for them, and we flagged it the moment we saw the number.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>July 17, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <h2 className="text-lg font-semibold text-white pt-2 pb-1">The per-category breakdown</h2>

        <p>
          The Ghost Index runs nightly at 23:50 UTC. For each indexed agent, it checks whether
          the agent&apos;s primary endpoint answers — an HTTP/HTTPS probe that expects a valid
          response. The per-category results as of mid-July 2026:
        </p>

        <div className="rounded-lg border border-white/[0.08] overflow-x-auto my-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left px-4 py-3 text-xs font-mono text-white/40 uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 text-xs font-mono text-white/40 uppercase tracking-wider">Liveness</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-white/40 uppercase tracking-wider hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_LIVENESS.map(({ category, pct, note }, i) => (
                <tr key={category} className={i < CATEGORY_LIVENESS.length - 1 ? 'border-b border-white/[0.05]' : ''}>
                  <td className="px-4 py-3 text-white/75">{category}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${pct === '0%' ? 'text-red-400/80' : pct === '100%' ? 'text-emerald-400/80' : 'text-orange-400/80'}`}>
                    {pct}
                  </td>
                  <td className="px-4 py-3 text-white/35 text-xs hidden sm:table-cell">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          The overall Ghost Index for all 1,394 indexed agents is{' '}
          <span className="text-white/85 font-medium">58.8%</span>. The tokenized category
          pulls the number down — not because tokenized agents are failing, but because
          the measurement doesn&apos;t apply to them.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the Ghost Index actually measures</h2>

        <p>
          The Ghost Index probe is a liveness check on an HTTP/HTTPS endpoint. For developer
          agents, service agents, and MCP servers, this is meaningful: they expose an API
          endpoint, a webhook URL, or a tool manifest at a public address. If that address
          doesn&apos;t answer, the agent is, in a practical sense, unavailable. That&apos;s
          the signal that matters for the three categories where the probe works.
        </p>

        <p>
          Tokenized agents are structured differently. An agent like one indexed from the
          Virtuals Protocol or the tokenized agent registries operates through a combination
          of on-chain contracts and — sometimes — an API layer. The on-chain contract
          is always &quot;alive&quot; as long as the chain is running. The API layer,
          if it exists, is often undisclosed, private, or served through infrastructure
          that doesn&apos;t accept probes from external IPs.
        </p>

        <p>
          When we probe the recorded endpoint for a tokenized agent and get no response,
          we record 0% liveness. But that 0% doesn&apos;t mean the agent is dead —
          it means we couldn&apos;t reach a public endpoint. The agent&apos;s on-chain
          activity is a separate question we&apos;re not yet measuring.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we didn&apos;t fix this before publishing</h2>

        <p>
          Suppressing the 0% number from the public Ghost Index would be the wrong call.
          It&apos;s real data about a real limitation of the current instrument. The{' '}
          <Link href="/blog/agent-liveness" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Ghost Index correction in late June
          </Link>
          {' '}taught us that publishing a number that measures the wrong thing compounds
          over time — the 16.2% figure we originally published was wrong because it
          under-counted alive agents due to a deduplication bug. The fix was to correct
          the number, not suppress it.
        </p>

        <p>
          The 0% tokenized figure is different — it&apos;s not a bug in the computation,
          it&apos;s a gap in the instrument. Publishing it with the flag visible (the category
          breakdown table, the &quot;instrument gap&quot; annotation) is more honest than
          hiding it and more useful than silently inflating the overall liveness number
          by excluding tokenized agents from the denominator.
        </p>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 my-4">
          <p className="text-xs font-mono font-bold text-amber-400/80 uppercase tracking-wider mb-2">
            What 0% tokenized liveness means in practice
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            The overall 58.8% Ghost Index includes tokenized agents in the denominator but
            not the alive count. Excluding tokenized agents from both, the overall liveness
            rate for endpoint-probeable agents (developer + service + MCP + model family) is
            meaningfully higher. The 58.8% number is the honest all-categories figure; the
            per-category breakdown shows where the instrument applies and where it doesn&apos;t.
          </p>
        </div>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the right instrument looks like</h2>

        <p>
          Liveness for tokenized agents should be measured by on-chain activity, not endpoint
          uptime. The signals we&apos;re building toward:
        </p>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4 my-4 space-y-3">
          {[
            {
              signal: 'On-chain transaction count (30d)',
              why: 'An agent processing zero transactions in 30 days is functionally dead, regardless of its token price',
            },
            {
              signal: 'x402 inbound payment count',
              why: 'Direct measurement of paid agent calls — the strongest liveness signal for commerce-capable agents',
            },
            {
              signal: 'Unique payer count (30d)',
              why: 'One whale making 1,000 payments looks different from 100 wallets each making 10; payer diversity matters',
            },
            {
              signal: 'Token holder growth (7d delta)',
              why: 'For tokenized agents, holder trajectory is a proxy for ongoing interest and use',
            },
          ].map(({ signal, why }) => (
            <div key={signal} className="flex items-start gap-3">
              <span className="text-violet-400/60 font-mono text-xs mt-0.5 shrink-0">→</span>
              <div>
                <span className="text-white/80 text-sm font-medium">{signal}</span>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{why}</p>
              </div>
            </div>
          ))}
        </div>

        <p>
          The x402 inbound payment signal is the most direct and the one we can build
          toward fastest. The payer-scan work (B23) built the on-chain settlement topology
          scanner in June: USDC transfers via Coinbase Smart Wallet transferFrom() patterns
          are the settlement mechanism, and the paying wallet addresses are identifiable
          from the contract event logs. Matching those payer addresses to indexed agents
          is phase 2 of that work.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we index tokenized agents at all</h2>

        <p>
          The tokenized category exists because on-chain agents represent a meaningful and
          growing segment of the agent economy. Virtuals Protocol agents, tokenized
          AI services, and protocol-native agents that operate through smart contracts
          are part of the ecosystem we track. Their absence from a liveness measurement
          doesn&apos;t make them absent from the index.
        </p>

        <p>
          What they contribute to the index that&apos;s not affected by the Ghost Index gap:
          their evidence-ranked status (which uses TVL signals, not endpoint probes), their
          on-chain economic footprint (tracked via the Virtuals sync), and their presence
          across protocol registries. The ranking data for tokenized agents is real. The
          liveness data is, currently, absent.
        </p>

        <p>
          That&apos;s the distinction that matters: evidence-ranking and liveness are
          separate dimensions. A tokenized agent can be accurately ranked by protocol
          adoption while scoring 0% on a liveness check that wasn&apos;t designed for it.
          We track both dimensions separately and will extend the liveness instrument when
          the on-chain data pipeline is ready to support it.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The precedent: correcting rather than suppressing</h2>

        <p>
          The Ghost Index has been corrected once already. The original 16.2% figure was
          wrong due to a deduplication bug — we published it, found the error, corrected
          it to 58.8%, and published the correction with an explanation. The 0% tokenized
          figure follows the same discipline: we published it, flagged the limitation,
          and documented the correct instrument we&apos;re building toward.
        </p>

        <p>
          The alternative — silently excluding tokenized agents from the Ghost Index
          denominator to improve the headline number — would make the index look cleaner
          without making it more accurate. That&apos;s the tradeoff we&apos;ve decided
          against, and the{' '}
          <Link href="/blog/mcp-coverage" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            MCP coverage post
          </Link>
          {' '}made the same point from the other direction: 100% MCP liveness looks better
          than it is because of a selection effect, not because MCP infrastructure is
          flawless. Both findings are published with the caveat visible.
        </p>

        <p>
          The{' '}
          <Link href="/ghost-index" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Ghost Index page
          </Link>
          {' '}now shows the per-category breakdown alongside the overall figure.
          The 0% tokenized row is there. As the on-chain liveness instrument comes online,
          that number will change — and we&apos;ll document the methodology change when it does.
        </p>

      </div>

      <ShareCard
        title="Tokenized agents score 0% on the Ghost Index. Here's why that's our problem, not theirs."
        url="/blog/tokenized-liveness"
      />

      <CitationBlock
        slug="tokenized-liveness"
        title="Tokenized agents score 0% on the Ghost Index. Here's why that's our problem, not theirs."
        date="July 17, 2026"
        sources={[
          { label: 'Ghost Index (live)', href: '/ghost-index' },
          { label: 'Ghost Index API', href: '/api/ghost-index/v1' },
          { label: 'Tokenized agent rankings', href: '/rankings/tokenized-agents' },
          { label: 'Methodology', href: '/methodology' },
          { label: 'Related: Three tiers of alive', href: '/blog/agent-liveness' },
          { label: 'Related: MCP coverage gap', href: '/blog/mcp-coverage' },
        ]}
      />

    </main>
    </>
  )
}
