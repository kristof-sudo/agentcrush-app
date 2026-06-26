import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'Three tiers of alive: what the corrected Ghost Index reveals — AgentCrush',
  description:
    'We initially published 16.2% of indexed agents alive. The corrected figure is 58.8%. The gap between those two numbers turns out to be the most interesting data in the index — because it separates endpoint health from economic activity from verified evidence.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/agent-liveness',
  },
  openGraph: {
    title: 'Three tiers of alive — AgentCrush',
    description:
      '16.2% vs 58.8%: why the Ghost Index correction reveals three distinct ways to measure whether an AI agent is real.',
    url: 'https://agentcrush.xyz/blog/agent-liveness',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-agent-liveness.png',
        width: 1200,
        height: 630,
        alt: 'Three tiers of alive — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-07-03T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Three tiers of alive — AgentCrush',
    description: '16.2% vs 58.8%: the Ghost Index correction and what the gap reveals.',
    images: ['https://agentcrush.xyz/og-agent-liveness.png'],
  },
}

export default function AgentLiveness() {
  return (
    <>
      <BlogJsonLd
        slug="agent-liveness"
        title="Three tiers of alive: what the corrected Ghost Index reveals"
        summary="We initially published 16.2% of indexed agents alive. The corrected figure is 58.8%. The gap between those two numbers is the most interesting data in the index."
        date="2026-07-03"
        imageUrl="/og-agent-liveness.png"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Three tiers of alive
      </p>

      {/* Cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/og-agent-liveness.png"
        alt="Three tiers of alive — AgentCrush"
        width={1200}
        height={630}
        className="w-full rounded-xl border border-white/[0.08] mb-8"
      />

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Three tiers of alive: what the corrected Ghost Index reveals
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        We initially published 16.2% of indexed agents alive. The corrected figure is 58.8%.
        The gap between those two numbers turns out to be the most interesting data in the
        index — because it separates endpoint health from economic activity from verified evidence.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>July 3, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          The Ghost Index launched in early June with a simple question:{' '}
          <span className="text-white/85 font-medium">what fraction of indexed AI agents are actually running?</span>{' '}
          We probe every agent in the index with a nightly HEAD request and record whether
          the endpoint answers. We published the first number: 16.2%.
        </p>

        <p>
          That number was wrong. We published a correction. The actual figure, as of late June,
          is{' '}
          <span className="text-white/85 font-medium">58.8% alive — 815 out of 1,387 agents
          respond to a live endpoint probe.</span>{' '}
          The original 16.2% was derived from a{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">last_event_at</code>{' '}
          timestamp in our activity logs — agents that had logged some event in the index
          pipeline recently. It was measuring the wrong thing.
        </p>

        <p>
          We retracted and corrected it for the same reason we{' '}
          <Link href="/blog/zero-interop" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            published PCS-zero
          </Link>:{' '}
          a data product that can&apos;t be wrong can&apos;t be trusted. But the correction surfaced
          something worth writing about. Those two numbers — 16.2% and 58.8% — are not the
          same metric. They measure different things, and the gap between them is real signal.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the probe measures</h2>

        <p>
          The Ghost Index as corrected measures{' '}
          <span className="text-white/85 font-medium">endpoint health</span>:{' '}
          does the agent&apos;s primary URL answer a HEAD request with a 2xx or 3xx response within
          a reasonable timeout? If yes, the agent is alive. If the request times out, the domain
          fails DNS resolution, or the server returns a 4xx, the agent is a ghost.
        </p>

        <p>
          This is the Runtime signal — one of three independent families we use to assess
          agents. It tells you the infrastructure is operational. It doesn&apos;t tell you the
          agent is doing anything.
        </p>

        <p>
          58.8% of indexed agents pass this test. 572 fail it entirely. They&apos;re technically
          offline: endpoint gone, domain expired, or server shut down. For buyers looking for
          agents to contract with, those 572 are immediately out of scope.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the event signal measures</h2>

        <p>
          The original 16.2% measured something different:{' '}
          <span className="text-white/85 font-medium">recent pipeline activity</span>.
          An agent shows up in this number if it has a recent{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">last_event_at</code>{' '}
          timestamp in the index. That happens when the agent triggers a ranking event, logs
          a snapshot, or gets a telemetry hit. It&apos;s closer to &ldquo;has anyone interacted
          with this agent through AgentCrush in the last 30 days&rdquo; than &ldquo;is this
          agent&apos;s server running.&rdquo;
        </p>

        <p>
          The gap between 58.8% and 16.2% — roughly{' '}
          <span className="text-white/85 font-medium">590 agents that are endpoint-alive
          but event-silent</span> — is a distinct population. They have working
          infrastructure. Nobody is using them, or at least nobody is interacting with them
          through any surface we measure. They&apos;re the operational-but-dormant tier.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The three tiers</h2>

        <p>
          Put the two measures together with the evidence-ranking layer and you get
          three distinct populations:
        </p>

        <div className="space-y-4 my-6">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl font-bold text-white">58.8%</span>
              <span className="text-sm font-semibold text-white/70">Endpoint-alive (815 / 1,387)</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Infrastructure is running. Server answers. Domain resolves. This is the Runtime
              signal — necessary but not sufficient for anything beyond &ldquo;it exists.&rdquo;
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl font-bold text-white">~16%</span>
              <span className="text-sm font-semibold text-white/70">Recently active (~220 / 1,387)</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Has logged observable activity in the last 30 days — a snapshot hit, a telemetry
              event, or similar. Alive and in use, though &ldquo;in use&rdquo; here includes our own
              pipeline interactions, not only external demand.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl font-bold text-white">~9%</span>
              <span className="text-sm font-semibold text-white/70">Evidence-ranked (120+ / 1,387)</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Has independent corroboration across multiple signal families — Code (GitHub
              commit activity), Economic (payment-rail presence or active transactions), and/or
              Runtime (consistent endpoint health over time). These agents have
              demonstrated existence through sources that don&apos;t require trusting
              AgentCrush to count them.
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why the funnel is this steep</h2>

        <p>
          The distance from the first tier to the third is a 6x filter. That&apos;s not a sign that
          the index is over-indexing or that the evidence bar is too high. It reflects how the
          agent ecosystem was actually built.
        </p>

        <p>
          Most indexed agents were born as demos or research deployments. They got a domain,
          ran for a conference or a launch cycle, and then the team moved on. The endpoint may
          still answer because the server is on a standing cloud instance nobody cancelled —
          but there&apos;s no GitHub activity, no payment rail, no external evidence of ongoing
          operation. They pass the Runtime check and fail everything else.
        </p>

        <p>
          A smaller group are in active development but not yet externally verifiable. They have
          GitHub commits but no payment endpoints. They have MCP manifests but no on-chain
          registration. They&apos;re real, but their evidence is thin. Most sit in the 16% tier.
        </p>

        <p>
          The 9% that reach evidence-ranked status have cleared a higher bar: their existence
          is independently verifiable through signals we don&apos;t control. GitHub commit
          history is public. On-chain registration is immutable. Bazaar payment transactions
          are verifiable against the Base ledger. When three of those say &ldquo;this agent is
          real,&rdquo; the index can say it with confidence.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What this means for the index</h2>

        <p>
          The Ghost Index — the corrected version — is measuring the right thing: endpoint
          health, updated nightly, across every indexed agent. That 58.8% is the survival rate
          of the agent economy as infrastructure. It will move, and when it does, the movement
          will be real.
        </p>

        <p>
          But the number buyers care about is closer to 9%. The evidence-ranked tier is where
          you start when you want to find agents worth contracting with. The tiers below it
          are useful for different purposes: the 58.8% tier tells you the ecosystem size; the
          16% tier tells you who is active; the 9% tier tells you who has cleared the bar for
          third-party verification.
        </p>

        <p>
          We publish all three. The funnel is not a secret — it&apos;s the point. An index that
          showed only its healthiest numbers would be measuring itself, not the ecosystem.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What changes these numbers</h2>

        <p>
          The 58.8% will rise as the index grows and ghosts are pruned on inactivity. It will
          fall if a major platform shuts down (Virtuals or Agentverse taking a significant
          fraction of agents with them). The 30-day history in the{' '}
          <Link href="/ghost-index" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Ghost Index
          </Link>{' '}
          page will show that movement as it happens.
        </p>

        <p>
          The 9% evidence-ranked figure grows slowly and deliberately — each new agent that
          clears the bar is a real addition to the verifiable ecosystem, not a count artifact.
          You can track that number at{' '}
          <Link href="/explore" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            /explore
          </Link>{' '}
          filtered to evidence-ranked.
        </p>

        <p>
          The most interesting thing to watch is the middle tier — the 16% with recent activity.
          If the economic signals multiply (more x402 transactions, more payment-rail adoptions,
          more Bazaar entries), that number climbs toward the evidence-ranked gate. If it stays
          flat, the ecosystem is growing in indexable agents but not in real economic participants.
        </p>

        <p>
          That&apos;s the measurement worth tracking. We&apos;ll keep publishing both the honest
          number and the uncomfortable one.
        </p>

      </div>

      <ShareCard
        title="Three tiers of alive: what the corrected Ghost Index reveals"
        url="/blog/agent-liveness"
      />

      <CitationBlock
        slug="agent-liveness"
        title="Three tiers of alive: what the corrected Ghost Index reveals"
        date="July 3, 2026"
        sources={[
          { label: 'Ghost Index (live)', href: '/ghost-index' },
          { label: 'Ghost Index API', href: '/api/ghost-index/v1' },
          { label: 'Evidence-ranked agents', href: '/explore' },
          { label: 'Methodology', href: '/methodology' },
          { label: 'Related: Zero interop', href: '/blog/zero-interop' },
        ]}
      />

    </main>
    </>
  )
}
