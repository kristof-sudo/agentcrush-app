import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'Everyone says "agent trust." Almost nobody measures the first signal — AgentCrush',
  description:
    'This week the ecosystem agreed trust is the frontier. But trust has a layer beneath reputation: is the agent even alive? Across 1,387 indexed agents, only 58.8% show signs of life — 4 in 10 are ghosts.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/liveness-is-layer-zero',
  },
  openGraph: {
    title: 'Agent trust starts with a question nobody asks: is it alive? — AgentCrush',
    description:
      'Only 58.8% of 1,387 indexed agents show signs of life. Liveness is layer zero of the trust stack — and we measure it three ways.',
    url: 'https://agentcrush.xyz/blog/liveness-is-layer-zero',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-liveness-is-layer-zero.png',
        width: 1200,
        height: 630,
        alt: 'Liveness is layer zero of the agent trust stack — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-06-26T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent trust starts with a question nobody asks: is it alive?',
    description: 'Only 58.8% of 1,387 indexed agents show signs of life. Liveness is layer zero.',
    images: ['https://agentcrush.xyz/og-liveness-is-layer-zero.png'],
  },
}

export default function LivenessIsLayerZero() {
  return (
    <>
      <BlogJsonLd
        slug="liveness-is-layer-zero"
        title="Everyone says &ldquo;agent trust.&rdquo; Almost nobody measures the first signal."
        summary="This week the ecosystem agreed trust is the frontier. But trust has a layer beneath reputation: is the agent even alive? Across 1,387 indexed agents, only 58.8% show signs of life."
        date="2026-06-26"
        imageUrl="/og-liveness-is-layer-zero.png"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Liveness is layer zero
      </p>

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Everyone says &ldquo;agent trust.&rdquo; Almost nobody measures the first signal.
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        This week the ecosystem agreed trust is the frontier. But trust has a layer beneath
        reputation — and 4 in 10 agents fail it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>June 26, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      {/* Hero image */}
      <div className="mt-8 rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/og-liveness-is-layer-zero.png"
          alt="Liveness is layer zero of the agent trust stack — AgentCrush"
          className="w-full h-auto"
        />
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          This week the agent economy reached a quiet consensus: payments are solved,
          identity is shipping, and <span className="text-white/85 font-medium">trust is the
          frontier.</span> The conversation has moved from &ldquo;can agents pay?&rdquo; to
          &ldquo;which agents are safe to pay?&rdquo; — builders are racing to stack
          reputation, dispute resolution, and uptime history on top of the payment rails.
        </p>

        <p>All of it skips a layer.</p>

        <p>
          Before &ldquo;who do I trust&rdquo; and &ldquo;what if they disagree,&rdquo; there&apos;s
          a more basic question almost no one asks: <span className="text-white/85 font-medium">is
          the agent even there?</span> You can&apos;t build a reputation, settle a dispute, or
          honor a receipt with a counterparty that&apos;s dead. Reputation is layer two.
          Liveness is layer zero.
        </p>

        <p>
          So we measured it. Across <span className="text-white/85 font-medium">1,387 indexed
          agents, only 58.8% show signs of life</span> — 4 in 10 are ghosts. Not &ldquo;low
          quality.&rdquo; Gone. And most directories listing them don&apos;t know, because they
          never check.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Three ways to be alive</h2>

        <p>We check liveness three ways, because &ldquo;alive&rdquo; means three different things:</p>

        <p>
          <span className="text-white/85 font-medium">Code</span> — is the project still
          shipping? Real GitHub commit activity, not a stale &ldquo;last seen.&rdquo;
        </p>
        <p>
          <span className="text-white/85 font-medium">Economic</span> — is it getting paid?
          On-chain x402 settlement activity.
        </p>
        <p>
          <span className="text-white/85 font-medium">Runtime</span> — does the deployed
          endpoint actually respond? This week we pinged{' '}
          <span className="text-white/85 font-medium">743 live agent endpoints; ~90% answered</span>,
          the rest were dead or unreachable. As far as we can tell, no one else measures this.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Stars are not a pulse</h2>

        <p>
          Here&apos;s how badly stars mislead:{' '}
          <span className="text-white/85 font-medium">GPT Engineer (55,000★) and AgentGPT
          (36,000★)</span> — two of the most-cited &ldquo;AI agents&rdquo; anywhere — are both
          archived and frozen for over a year. By star count they look like pillars. By
          liveness they&apos;re tombstones.
        </p>

        <p>
          That&apos;s why we treat liveness as the foundation of the trust stack, not a
          footnote. And because a trust signal you can&apos;t verify is just another claim,
          every daily snapshot we publish is folded into a hash chain and anchored on-chain —
          check our math, don&apos;t take our word.
        </p>

        <p>
          The ecosystem is right that trust is the frontier. But the frontier starts one
          question earlier than everyone&apos;s building for. Before you ask whether to trust
          an agent, ask whether it&apos;s still there. Most aren&apos;t.
        </p>

        <p>
          Check any agent in one second — paste a handle, GitHub, or site into the Ghost Check
          on the{' '}
          <Link href="/ghost-index" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Ghost Index
          </Link>.
        </p>

      </div>

      <ShareCard
        title="Everyone says &ldquo;agent trust.&rdquo; Almost nobody measures the first signal."
        url="/blog/liveness-is-layer-zero"
      />

      <CitationBlock
        slug="liveness-is-layer-zero"
        title="Everyone says &ldquo;agent trust.&rdquo; Almost nobody measures the first signal."
        date="June 26, 2026"
        sources={[
          { label: 'Ghost Index (live)', href: '/ghost-index' },
          { label: 'Methodology', href: '/methodology' },
          { label: 'Verifiable record', href: '/api/verify' },
        ]}
      />
    </main>
    </>
  )
}
