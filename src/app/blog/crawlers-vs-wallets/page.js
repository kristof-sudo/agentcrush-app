import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'Crawlers vs. wallets: our first day of measuring the agent economy’s till — AgentCrush',
  description:
    'We turned on payment telemetry: 1,376 price quotes served to machines in half a day, zero payments. Why that zero is the most useful number we collect — plus the stat we almost published wrong.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/crawlers-vs-wallets',
  },
  openGraph: {
    title: 'Crawlers vs. wallets — AgentCrush',
    description:
      '1,376 price quotes, 0 payments, and the taxonomy of machines that window-shop. Honest telemetry from the agent economy.',
    url: 'https://agentcrush.xyz/blog/crawlers-vs-wallets',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-crawlers-vs-wallets.png',
        width: 1200,
        height: 630,
        alt: 'Crawlers vs. wallets — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-06-12T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crawlers vs. wallets — AgentCrush',
    description: '1,376 price quotes, 0 payments. Why that zero is the most useful number we collect.',
    images: ['https://agentcrush.xyz/og-crawlers-vs-wallets.png'],
  },
}

export default function CrawlersVsWallets() {
  return (
    <>
      <BlogJsonLd
        slug="crawlers-vs-wallets"
        title="Crawlers vs. wallets: our first day of measuring the agent economy's till"
        summary="1,376 price quotes served to machines in half a day, zero payments — why that zero is the most useful number we collect, plus the stat we almost published wrong."
        date="2026-06-12"
        imageUrl="/og-crawlers-vs-wallets.png"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Crawlers vs. wallets
      </p>

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Crawlers vs. wallets: our first day of measuring the agent economy&apos;s till
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        We turned on payment telemetry. Machines asked our prices 1,376 times in half a day and bought nothing.
        Here&apos;s why that zero is the most useful number we&apos;ve ever collected.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>June 12, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      {/* Hero image */}
      <div className="mt-8 rounded-xl overflow-hidden">
        <img
          src="/og-crawlers-vs-wallets.png"
          alt="Crawlers vs. wallets — AgentCrush"
          className="w-full h-auto"
        />
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          Yesterday at midday we switched on telemetry at our payment gate. Every AgentCrush API
          response now increments a counter: free calls, price quotes on the paid endpoints, settled
          x402 payments, subscriber calls. By midnight the gate had served{' '}
          <span className="text-white/85 font-medium">1,376 price quotes to machines</span>. Settled
          payments: <span className="text-white/85 font-medium">zero</span>.
        </p>

        <p>
          Most companies would not publish that second number. We think it&apos;s the most interesting
          thing we&apos;ve measured all month.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Who asks for 1,376 prices and buys nothing?</h2>

        <p>
          The access pattern gives it away: almost all of the traffic replays the exact example URLs we
          publish in our marketplace listings. These aren&apos;t customers browsing. They&apos;re the
          agent economy&apos;s infrastructure, doing its rounds:
        </p>

        <p>
          <span className="text-white/85 font-medium">Marketplace validators.</span> The Coinbase Bazaar
          re-checks every listed endpoint — is it alive, does the 402 quote parse, did the price change.
          Those probes are how the marketplace&apos;s own quality stats get made.
        </p>

        <p>
          <span className="text-white/85 font-medium">Catalog builders.</span> Directories index
          machine-payable endpoints and resell discovery. We know this crawler species well, because we
          are one — our own index mirrors 46,000+ listed x402 resources.
        </p>

        <p>
          <span className="text-white/85 font-medium">Security scanners.</span> At least one risk-scoring
          service swept x402 endpoints this week. We were almost certainly in their sample.
        </p>

        <p>
          <span className="text-white/85 font-medium">Quote-cachers.</span> Orchestrator agents that
          record prices now to route purchases later. Window-shopping, machine-speed.
        </p>

        <p>
          None of them pay. All of them matter: a probe means you exist in the catalogs that buying
          agents consult. In a machine economy, being crawled is shelf placement. The probes are the
          prerequisite for purchases, not their substitute.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The wallets are real — they&apos;re just elsewhere</h2>

        <p>
          The same marketplace data answers the obvious follow-up. Across the listed x402 economy we
          counted <span className="text-white/85 font-medium">322,948 paid calls in the last 30 days</span>.
          One transaction-simulation tool alone had 2,596 unique paying wallets. Agents with funded
          wallets exist, and they spend daily.
        </p>

        <p>
          But the demand is brutally concentrated. A handful of providers carry nearly all the real
          volume — while a single lister accounts for roughly 90% of all listings and almost none of
          the payers. The agent economy is simultaneously real and mostly noise. Telling those apart is
          the entire reason AgentCrush exists, so we shipped the obvious thing: an{' '}
          <Link href="/rankings/x402-merchants" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            x402 merchant directory ranked by paid calls instead of listings
          </Link>. Ranked by demand, the 32,000-listing host drops to fourth place.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The stat we almost published</h2>

        <p>
          One more honesty note, because this is the part nobody writes about. Yesterday we also computed
          our first Protocol Compatibility Score — how many of the four live agent rails (ERC-8004, x402,
          A2A, MCP) each indexed agent verifiably supports. First readout: 104 agents at three or more
          rails. Impressive number. We sampled the list before publishing it and found link-collection
          repositories &quot;supporting&quot; payment protocols.
        </p>

        <p>
          Our scanner was counting soft 404s — sites that return a friendly HTML page for any path,
          including the protocol manifests we probe for. We fixed the scanner to validate response
          content, re-scanned everything, and the truth is starker than the bug:{' '}
          <span className="text-white/85 font-medium">
            of 1,359 indexed agents, not one verifiably supports three of the four rails. Exactly one
            supports two.
          </span>{' '}
          The &quot;maximally interoperable agent&quot; that every protocol deck assumes? It doesn&apos;t
          exist yet.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we publish the zeros</h2>

        <p>
          A dashboard that can&apos;t show zero can&apos;t be trusted at any other value. Our paid-call
          counter reads zero today. Our interop counter reads zero. Both will move — and when they do,
          you&apos;ll know the movement is real, because you watched us publish the floor.
        </p>

        <p>
          The numbers in this post are live and free:{' '}
          <Link href="/changes" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">the daily index diff</Link>,{' '}
          <Link href="/api/pcs/v1" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">the interoperability readout</Link>,{' '}
          <Link href="/ghost-index" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">the Ghost Index</Link>.
          Check our math. That&apos;s the point.
        </p>

      </div>

      <ShareCard
        title="Crawlers vs. wallets: our first day of measuring the agent economy's till"
        url="https://agentcrush.xyz/blog/crawlers-vs-wallets"
      />

      <CitationBlock
        title="Crawlers vs. wallets: our first day of measuring the agent economy's till"
        url="https://agentcrush.xyz/blog/crawlers-vs-wallets"
        date="2026-06-12"
      />

    </main>
    </>
  )
}
