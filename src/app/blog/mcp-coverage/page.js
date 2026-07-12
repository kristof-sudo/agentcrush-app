import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'MCP servers are 100% alive. Why we only index 15. — AgentCrush',
  description:
    'Every MCP server in the AgentCrush index responds to a live endpoint probe. The overall rate is 58.8%. The difference is selection, not infrastructure — and the gap between 15 indexed and hundreds in the wild is the real story.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/mcp-coverage',
  },
  openGraph: {
    title: 'MCP servers are 100% alive. Why we only index 15. — AgentCrush',
    description:
      '100% vs 58.8%: why MCP server liveness looks perfect, what the selection effect means, and the gap between 15 indexed and hundreds in the wild.',
    url: 'https://agentcrush.xyz/blog/mcp-coverage',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-mcp-coverage.png',
        width: 1731,
        height: 909,
        alt: 'MCP servers are 100% alive — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-07-10T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP servers are 100% alive. Why we only index 15. — AgentCrush',
    description:
      '100% liveness vs 58.8% overall. The selection effect, the scoring, and the 15-vs-hundreds coverage gap.',
    images: ['https://agentcrush.xyz/og-mcp-coverage.png'],
  },
}

export default function McpCoverage() {
  return (
    <>
      <BlogJsonLd
        slug="mcp-coverage"
        title="MCP servers are 100% alive. Why we only index 15."
        summary="Every MCP server in the AgentCrush index responds to a live endpoint probe. The overall rate is 58.8%. The difference is selection, not infrastructure."
        date="2026-07-10"
        imageUrl="/og-mcp-coverage.png"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        MCP coverage gap
      </p>

      {/* Cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/og-mcp-coverage.png"
        alt="MCP servers are 100% alive — AgentCrush"
        width={1731}
        height={909}
        className="w-full rounded-xl border border-white/[0.08] mb-8"
      />

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        MCP servers are 100% alive. Why we only index 15.
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        The Ghost Index runs nightly across every category. Across 1,394 indexed agents,
        58.8% respond to a live endpoint probe. MCP servers: 100%. That number sounds like
        a quality story. It&apos;s actually a selection story — and the gap between those
        15 entries and the real MCP ecosystem is more interesting than the liveness rate.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>July 10, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <h2 className="text-lg font-semibold text-white pt-2 pb-1">The liveness number is a selection effect</h2>

        <p>
          When we seeded the MCP server category in June, we added 15 servers with enough
          independent evidence to clear the ranking bar.{' '}
          <span className="text-white/85 font-medium">
            All 15 respond to a live endpoint probe tonight.
          </span>{' '}
          The overall Ghost Index for all 1,394 indexed agents is 58.8% — 572 agents
          have endpoints that no longer answer.
        </p>

        <p>
          The 100% MCP liveness rate is not evidence that MCP servers are better-engineered
          than other agents. It&apos;s evidence that the servers we chose to index were,
          by construction, the ones that looked operational when we looked.
        </p>

        <p>
          The same signals that push a server into the index predict whether it&apos;s
          running: active GitHub commits, presence in multiple registries, meaningful star
          counts. A project that abandoned its MCP server six months ago doesn&apos;t have
          those signals. It doesn&apos;t appear in our index. It also doesn&apos;t appear
          in our liveness count — because we never added it.
        </p>

        <p>
          This is the selection effect. It appears across every high-quality data product.
          CoinMarketCap tracks tokens with enough market activity to have reliable price
          data. Arena.ai ranks models with enough Arena votes to have statistically
          meaningful Bradley-Terry coefficients. We track MCP servers with enough
          independent corroboration to say something confident about them.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">How we scored the 15</h2>

        <p>
          MCP server scoring uses five signals weighted by reliability:
        </p>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4 my-4 space-y-2">
          {[
            { signal: 'GitHub stars', weight: '30%', why: 'Organic adoption signal, hard to inflate' },
            { signal: 'Tool count', weight: '25%', why: 'Depth of the server — how much it can do' },
            { signal: 'Registry presence', weight: '20%', why: 'Listed on official, Smithery, mcp.so, Glama, or Continue' },
            { signal: 'GitHub forks', weight: '15%', why: 'Integration and modification signal' },
            { signal: 'Repository followers', weight: '10%', why: 'Watch signal — developers tracking updates' },
          ].map(({ signal, weight, why }) => (
            <div key={signal} className="flex items-start gap-3">
              <span className="shrink-0 font-mono text-xs text-orange-400 w-8 pt-0.5">{weight}</span>
              <div>
                <span className="text-white/80 text-sm font-medium">{signal}</span>
                <span className="text-white/40 text-xs ml-2">— {why}</span>
              </div>
            </div>
          ))}
        </div>

        <p>
          A server needs at least two independent signals to appear in the ranked list.
          The 15 that made the initial seed all had GitHub repositories with meaningful
          star counts and at least one public registry listing. Several have five-registry
          presence — the official MCP registry, Smithery, mcp.so, Glama, and Continue.
        </p>

        <p>
          That multi-registry coverage also explains why they&apos;re all alive: a server
          that a curator at Smithery decided was worth listing, that the Glama team added
          to their connectors directory, and that the MCP steering group accepted into the
          official registry has cleared three independent quality filters before we ever
          looked at it. Those filters select for ongoing maintenance.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The gap between 15 and the ecosystem</h2>

        <p>
          MCP launched in November 2024. By mid-2026, public registries track hundreds of
          servers — the official registry, Smithery, mcp.so, and Glama each maintain their
          own lists, and the numbers are growing weekly. The gap between our 15 and the
          full MCP ecosystem is large.
        </p>

        <p>
          Most of that gap is projects that announced a server, listed it in one place,
          and then stopped active development. They&apos;re technically discoverable —
          but they don&apos;t have the multi-signal corroboration that makes a ranking
          statement defensible. A server with 80 GitHub stars, listed on one registry,
          and last committed to four months ago is not something we can confidently say
          is{' '}
          <span className="text-white/85 font-medium">better or worse</span>{' '}
          than another one. We can only say it exists.
        </p>

        <p>
          That&apos;s a meaningful distinction. The purpose of the MCP server rankings
          is not to list everything. It&apos;s to surface the servers with enough
          independent evidence that a developer choosing between them can make a
          data-informed decision. Adding entries where the evidence is thin doesn&apos;t
          improve that surface — it adds noise.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the coverage roadmap looks like</h2>

        <p>
          The B8 ingestion pipeline — a fetch-and-evidence-check runner we built in June —
          is the mechanism for expanding coverage as the ecosystem matures. It pulls from
          public MCP registries, runs the evidence check, and promotes servers that clear
          the bar into the ranked list.
        </p>

        <p>
          That pipeline is running in dry-run mode. The output looks something like this:
          of the hundreds of servers now listed across public registries, a meaningful
          fraction will clear the two-signal minimum threshold once the pipeline runs a
          full pass. The ones that don&apos;t are either too new to have accumulated
          evidence, or have stopped receiving updates.
        </p>

        <p>
          If you build or maintain an MCP server and want it in the index, the path is
          concrete:
        </p>

        <div className="rounded-lg border border-orange-500/20 bg-orange-500/[0.04] px-5 py-4 my-4 space-y-2">
          <p className="text-xs font-mono font-bold text-orange-400/80 uppercase tracking-wider mb-3">
            Evidence thresholds for MCP server inclusion
          </p>
          {[
            'GitHub repository with active commits (within 90 days)',
            'Tool count ≥ 5 — at least five distinct tools the server exposes',
            'Listed on at least two public registries (official, Smithery, mcp.so, Glama)',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-orange-400/60 font-mono text-xs mt-0.5">→</span>
              <span className="text-white/65 text-sm">{item}</span>
            </div>
          ))}
        </div>

        <p>
          Servers that hit those thresholds will appear in the next ingestion cycle.
          You can also{' '}
          <Link href="/submit" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            submit your agent directly
          </Link>{' '}
          to flag it for review.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the 100% number is actually useful for</h2>

        <p>
          The 100% liveness rate for indexed MCP servers tells you something real: if
          you pick any server from our{' '}
          <Link href="/rankings/mcp-servers" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            MCP server rankings
          </Link>
          {' '}today, you can expect its endpoint to answer. That&apos;s the practical
          value of a curated, evidence-ranked list versus a raw registry dump.
        </p>

        <p>
          The overall 58.8% Ghost Index means that if you picked a random agent from the
          full index, you&apos;d have a 4-in-10 chance of hitting a dead endpoint. The
          evidence-ranking filter changes that odds profile significantly — which is the
          point of evidence-ranking.
        </p>

        <p>
          But the 15 servers are not the MCP ecosystem. They&apos;re the highest-evidence
          slice of it. The ecosystem is larger and more varied — and as the B8 ingestion
          pipeline expands coverage, the liveness rate for the MCP category will almost
          certainly come down from 100%, because the servers entering the index from that
          pass will have lower signal density and correspondingly lower evidence of ongoing
          maintenance.
        </p>

        <p>
          That&apos;s what a representative sample looks like. We&apos;ll publish
          coverage statistics as the category grows, using the same methodology we used
          to correct{' '}
          <Link href="/blog/agent-liveness" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            the Ghost Index
          </Link>
          {' '}when the original number turned out to be measuring the wrong thing.
        </p>

      </div>

      <ShareCard
        title="MCP servers are 100% alive. Why we only index 15."
        url="/blog/mcp-coverage"
      />

      <CitationBlock
        slug="mcp-coverage"
        title="MCP servers are 100% alive. Why we only index 15."
        date="July 10, 2026"
        sources={[
          { label: 'MCP Server Rankings', href: '/rankings/mcp-servers' },
          { label: 'Ghost Index (live)', href: '/ghost-index' },
          { label: 'Ghost Index API', href: '/api/ghost-index/v1' },
          { label: 'Methodology', href: '/methodology' },
          { label: 'Related: Three tiers of alive', href: '/blog/agent-liveness' },
          { label: 'Related: Zero interop', href: '/blog/zero-interop' },
        ]}
      />

    </main>
    </>
  )
}
