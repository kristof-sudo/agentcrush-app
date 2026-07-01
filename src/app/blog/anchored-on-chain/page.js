import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: "Don't trust our rankings. Verify them. — AgentCrush",
  description:
    'Every agent ranking you have seen asks you to trust the database. Ours you can check: every daily snapshot is hashed into a Merkle root, chained, and anchored on Base. Recompute it yourself.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/anchored-on-chain',
  },
  openGraph: {
    title: "Don't trust our rankings. Verify them. — AgentCrush",
    description:
      'Every daily snapshot of the index is hashed to a Merkle root and anchored on Base — a permanent record no one can rewrite, that anyone can recompute and verify.',
    url: 'https://agentcrush.xyz/blog/anchored-on-chain',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/api/og?title=Don%27t+trust+our+rankings.+Verify+them.&kicker=AgentCrush&subtitle=Every+daily+snapshot+is+anchored+on+Base.', width: 1200, height: 630, alt: "Don't trust our rankings. Verify them. — AgentCrush" }],
    type: 'article',
    publishedTime: '2026-06-29T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Don't trust our rankings. Verify them.",
    description: 'Every daily snapshot is hashed to a Merkle root and anchored on Base. Recompute it yourself.',
    images: ['https://agentcrush.xyz/api/og?title=Don%27t+trust+our+rankings.+Verify+them.&kicker=AgentCrush&subtitle=Every+daily+snapshot+is+anchored+on+Base.'],
  },
}

export default function AnchoredOnChain() {
  return (
    <>
      <BlogJsonLd
        slug="anchored-on-chain"
        title="Don&rsquo;t trust our rankings. Verify them."
        summary="Every agent ranking you have seen asks you to trust the database. Ours you can check: every daily snapshot is hashed into a Merkle root, chained day-to-day, and anchored on Base. Recompute it yourself."
        date="2026-06-29"
        imageUrl="/api/og?title=Don%27t+trust+our+rankings.+Verify+them.&kicker=AgentCrush&subtitle=Every+daily+snapshot+is+anchored+on+Base."
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Don&rsquo;t trust our rankings. Verify them.
      </p>

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Don&rsquo;t trust our rankings. Verify them.
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        A ranking you can&apos;t check is just an opinion with a logo. So we made ours checkable.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>June 29, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      {/* Hero image */}
      <div className="mt-8 rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/og?title=Don%27t+trust+our+rankings.+Verify+them.&kicker=AgentCrush&subtitle=Every+daily+snapshot+is+anchored+on+Base."
          alt="Don't trust our rankings. Verify them. — AgentCrush"
          className="w-full h-auto"
        />
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          Every agent ranking, leaderboard, and &ldquo;top 100&rdquo; you have ever seen has the
          same hidden footnote: <span className="text-white/85 font-medium">trust our database.</span>{' '}
          A number can be quietly nudged. A rank can be edited and nobody is the wiser. A bad week
          can be smoothed over with a &ldquo;methodology update.&rdquo; In a market this hyped, an
          unverifiable ranking is just an opinion with a logo on it.
        </p>

        <p>
          We index agents and rank them. If we are going to be the neutral scorekeeper of the agent
          economy, the one thing we cannot ask is for you to take the score on faith. So as of this
          week, you don&apos;t have to.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What we shipped</h2>

        <p>
          Every day, we take the full index — for every agent, its{' '}
          <span className="font-mono text-[13px] text-white/80">id · rank · score · is_alive</span> —
          and hash it into a single <span className="text-white/85 font-medium">Merkle root</span>.
          Each day&apos;s root is chained to the day before it, and the root is{' '}
          <Link href="/oracle" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            written to Base
          </Link>. The result is a permanent, timestamped record of exactly what the index said on
          any given day — one that no one, including us, can go back and rewrite.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why a hash chain matters</h2>

        <p>
          A Merkle root is a fingerprint of the entire day&apos;s data. Change a single rank,
          backdate a single score, quietly delete a single agent — and the fingerprint changes. The
          chain to the next day breaks. <span className="text-white/85 font-medium">The tamper is
          provable,</span> not hypothetical. That is the difference between &ldquo;we promise we
          didn&apos;t edit history&rdquo; and &ldquo;here is the math; check it.&rdquo;
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">How to check us</h2>

        <p>
          The recipe is public and boring on purpose:{' '}
          <span className="font-mono text-[13px] text-white/80">sha256</span> the rows, build the
          tree, compare your root to the one on-chain. Hit{' '}
          <Link href="/api/verify" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            /api/verify
          </Link>{' '}
          for any date and recompute it yourself. You don&apos;t need our permission, an account, or
          our cooperation — a skeptic, a journalist, or a competitor can audit the record
          independently. That is the entire point.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we bothered</h2>

        <p>
          Most of the agent economy runs on vibes: stars that never decay, follower counts, launch-day
          threads. We are trying to build the opposite — a record where the numbers mean something
          because you can check them. The Ghost Index says four in ten indexed agents are dark. The
          rankings move on evidence, not noise. None of that is worth anything if we can edit it after
          the fact. <span className="text-white/85 font-medium">A scorekeeper you can&apos;t audit
          isn&apos;t a scorekeeper. It&apos;s a marketer.</span>
        </p>

        <p>
          So: don&apos;t trust our rankings. <span className="text-white/85 font-medium">Verify them.</span>{' '}
          The proof is on Base, the recipe is public, and the history is permanent. Start at the{' '}
          <Link href="/oracle" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            verifiable record
          </Link>.
        </p>

      </div>

      <ShareCard
        title="Don&rsquo;t trust our rankings. Verify them."
        url="/blog/anchored-on-chain"
      />

      <CitationBlock
        slug="anchored-on-chain"
        title="Don&rsquo;t trust our rankings. Verify them."
        date="June 29, 2026"
        sources={[
          { label: 'Verifiable record', href: '/api/verify' },
          { label: 'How verification works', href: '/oracle' },
          { label: 'Methodology', href: '/methodology' },
        ]}
      />
    </main>
    </>
  )
}
