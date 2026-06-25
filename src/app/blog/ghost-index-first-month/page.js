import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'The Ghost Index: 84% of indexed AI agents are unreachable — AgentCrush',
  description:
    'We ran nightly liveness checks on 1,354 indexed agents for three weeks. Only 16.2% answered. Here is what the first Ghost Index snapshot reveals about agent durability — and what separates the live ones from the ghosts.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/ghost-index-first-month',
  },
  openGraph: {
    title: 'The Ghost Index: 84% of indexed AI agents are unreachable — AgentCrush',
    description:
      'We pinged 1,354 AI agents nightly for three weeks. Only 16.2% answered. The Ghost Index, in data.',
    url: 'https://agentcrush.xyz/blog/ghost-index-first-month',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-ghost-index-first-month.png',
        width: 1200,
        height: 630,
        alt: 'The Ghost Index: 84% of indexed AI agents are unreachable — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-06-26T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Ghost Index: 84% of indexed AI agents are unreachable',
    description: '1,354 agents. 18 nights of pinging. Only 16.2% answered. The Ghost Index snapshot.',
    images: ['https://agentcrush.xyz/og-ghost-index-first-month.png'],
  },
}

export default function GhostIndexFirstMonth() {
  return (
    <>
      <BlogJsonLd
        slug="ghost-index-first-month"
        title="The Ghost Index: 84% of indexed AI agents are unreachable"
        summary="We ran nightly liveness checks on 1,354 indexed agents for three weeks. Only 16.2% answered. Here is what the first Ghost Index snapshot reveals about agent durability."
        date="2026-06-26"
        imageUrl="/og-ghost-index-first-month.png"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        The Ghost Index
      </p>

      {/* Cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/og-ghost-index-first-month.png"
        alt="The Ghost Index: 84% of indexed AI agents are unreachable — AgentCrush"
        width={1200}
        height={630}
        className="w-full rounded-xl border border-white/[0.08] mb-8"
      />

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        The Ghost Index: 84% of indexed AI agents are unreachable
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        We ran nightly liveness checks on 1,354 indexed agents for three weeks. Only 16.2% answered.
        Here is what the first Ghost Index snapshot reveals about agent durability — and what
        separates the live ones from the ghosts.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>June 26, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          An agent that doesn&apos;t answer is not an agent. It&apos;s a listing.
        </p>

        <p>
          Every AI agent directory — including AgentCrush — accumulates names faster than those
          names stay operational. Projects launch, get indexed, get tweeted about, and then go
          quiet. The index grows. The activity doesn&apos;t. The gap between &ldquo;agents that exist in
          our database&rdquo; and &ldquo;agents that exist in the world&rdquo; is the thing we decided to measure.
          We called it the Ghost Index.
        </p>

        <p>
          Starting June 7, 2026, our nightly worker began probing every indexed agent&apos;s primary
          endpoint. For each agent we have a resolvable URL, we send a HEAD request. If it
          resolves to a 2xx or 3xx response, the agent is alive. If it times out, returns a
          4xx from a defunct route, or fails DNS, it&apos;s a ghost. We run this check every night
          at 23:50 UTC and record the result in the{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            ghost_index_daily
          </code>{' '}
          table.
        </p>

        <p>
          After 18 consecutive nights:
          {' '}<span className="text-white/85 font-medium">215 of 1,354 indexed agents are alive.
          That is 16.2%.</span>
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What we measured</h2>

        <p>
          The 1,354 agents in our index come from five sources: GitHub-hosted projects
          (developer category), tokenized AI agents on Virtuals Protocol, agents registered
          on Agentverse (Fetch.ai&apos;s multi-agent network), agents registered on ERC-8004
          (on-chain identity standard), and MCP servers. Each source has a different
          operational model — and a different expected liveness profile.
        </p>

        <p>
          GitHub projects tend to have stable URLs. If a developer agent&apos;s README links
          to a demo or API endpoint, that URL ages. The repo might stay up while the
          live service goes dark. We detect this: a GitHub repo that still exists but whose
          registered endpoint no longer responds counts as a ghost.
        </p>

        <p>
          Tokenized agents on Virtuals are the largest single block in our index. Many were
          launched during the 2025 AI agent token cycle. The token may still trade; the agent
          may no longer operate. A live market price is not the same as a live service endpoint.
        </p>

        <p>
          Agentverse listings include agents deployed to Fetch.ai&apos;s hosted network. These
          have their own operational status separate from any public-web presence. A non-responding
          Agentverse agent may still be operational within the network, which means our Ghost Index
          undercounts liveness for this category — we note this as a{' '}
          <Link href="/ghost-index" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            known limitation
          </Link>{' '}
          on the Ghost Index page.
        </p>

        <p>
          MCP servers are the newest category. Fifteen are indexed; all were added because they
          are actively maintained and listed in public registries. This category has the highest
          expected liveness — it is also the smallest.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The 84% figure</h2>

        <p>
          Eighty-four percent ghost rate sounds alarming. The more useful frame: it is what you
          expect from an index that tracks the full stated universe of an emerging ecosystem,
          not just the survivors.
        </p>

        <p>
          CoinMarketCap lists thousands of tokens. The majority have no active development,
          no trading volume, and no team. They exist in the database because they existed at
          some point and were never explicitly removed. That is not a bug in the CMC model —
          it is a faithful record of what was claimed to exist.
        </p>

        <p>
          AgentCrush operates the same way. When we indexed 46,000+ Bazaar resources, we did
          not gate on liveness — we indexed the claim. The Ghost Index is the second pass:
          now we check whether the claim holds.
        </p>

        <p>
          The 16.2% that answers is the interesting number. It is the set of agents that
          launched and stayed operational. In an ecosystem where launching is easy and
          maintaining is hard, that 16.2% selects for something real: infrastructure investment,
          recurring revenue, or both.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why agents go ghost</h2>

        <p>
          The surface reasons are predictable: demo projects that were never meant to run
          permanently, hosting bills that exceeded revenue, teams that pivoted, tokens that
          launched without a product behind them. These are not failures of ambition — they
          are the normal attrition rate of an early-stage ecosystem.
        </p>

        <p>
          The structural reason is more interesting. Most agents were built for demonstrations,
          not for operations. The mental model behind most 2024–2025 AI agent launches was
          &ldquo;build something impressive enough to get attention, then figure out the business.&rdquo;
          The agents that stay alive reversed that sequence: they found a paying use case
          first and built the agent second. They have a reason to keep the endpoint up.
        </p>

        <p>
          The correlation with payment rails is not accidental. Agents with x402 endpoints —
          the ones that accept direct machine-to-machine payment for their services — have
          structural uptime incentives. If the endpoint is down, nobody pays. The revenue
          motive is the most durable uptime motive we have seen in the data.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the Ghost Index is for</h2>

        <p>
          The immediate use case is filtering. Any agent with a wallet looking for a service
          provider should know whether that provider is actually reachable today, not just
          whether it was once. The Ghost Index is the liveness gate in the{' '}
          <Link href="/api/agents/find" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Agent Discovery API
          </Link>:
          passing{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            alive=true
          </code>{' '}
          in a query returns only agents whose last nightly probe succeeded.
        </p>

        <p>
          The longer-term use case is trend. We are now accumulating a daily time series.
          As the ecosystem matures, we expect the liveness rate to change — and the direction
          and speed of that change will tell us something about the economic health of the
          agent economy. A rising liveness rate means more agents are finding sustainable
          operating models. A falling rate means the index is aging faster than the ecosystem
          is growing.
        </p>

        <p>
          The first three weeks of data show a roughly stable liveness rate. That stability
          could mean the ecosystem has found its equilibrium, or it could mean we are early
          enough that the attrition and new additions are canceling out. More weeks will
          separate these hypotheses. We are watching.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The full score breakdown</h2>

        <p>
          The Ghost Index score is a 0–100 integer representing the percentage of agents alive
          in each daily snapshot. A score of 16 means 16% of the indexed set responded to
          last night&apos;s probe. The score is always paired with a sample count so you can
          evaluate statistical weight.
        </p>

        <p>
          Historical scores are available via the{' '}
          <Link href="/api/ghost-index/v1" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Ghost Index API
          </Link>{' '}
          (free, CORS-open, no key required). Pass{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            ?history=14
          </code>{' '}
          for the last 14 daily scores. The current score and trend are also shown on the{' '}
          <Link href="/ghost-index" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Ghost Index page
          </Link>.
        </p>

        <p>
          Live agent count and the per-agent liveness flag are surfaced in search results.
          When you use the{' '}
          <Link href="/for-agents" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Agent Discovery API
          </Link>,
          liveness is one of the filter parameters — not a display label, but an actual
          gate that prevents dead endpoints from being recommended to agents making real
          purchasing decisions.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we publish this number</h2>

        <p>
          Last week we wrote about why{' '}
          <Link href="/blog/zero-interop" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            zero is an important number to publish
          </Link>.
          The same principle applies here. If we only indexed agents we had already confirmed
          were alive, the index would look healthier than the ecosystem actually is. That would
          be useful for marketing and harmful for research.
        </p>

        <p>
          The 84% ghost rate is the honest number. It is also the number that makes the
          16.2% meaningful. The live agents are not a curated list — they are the survivors
          of the same index that also includes the ghosts. When you use the live filter,
          you know what it selected against.
        </p>

        <p>
          The Ghost Index score will be published every Wednesday at 14:00 UTC via the
          weekly ecosystem post. If you want the raw signal without the narrative, the
          API is always current.
        </p>

      </div>

      <ShareCard
        title="The Ghost Index: 84% of indexed AI agents are unreachable"
        url="/blog/ghost-index-first-month"
      />

      <CitationBlock
        slug="ghost-index-first-month"
        title="The Ghost Index: 84% of indexed AI agents are unreachable"
        date="June 26, 2026"
        sources={[
          { label: 'Ghost Index (live score + history)', href: '/ghost-index' },
          { label: 'Ghost Index API (?history=N)', href: '/api/ghost-index/v1' },
          { label: 'Agent Discovery API (alive=true filter)', href: '/api/agents/find' },
          { label: 'Related: Nobody is multi-protocol yet', href: '/blog/zero-interop' },
        ]}
      />

    </main>
    </>
  )
}
