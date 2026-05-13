import Link from 'next/link'

export const metadata = {
  title: "Working x402 payment isn't the same as working x402 discovery — AgentCrush",
  description:
    "Notes from getting AgentCrush indexed on Agentic.Market: the boring metadata gotchas that almost stopped me, and the checklist that finally worked.",
  alternates: {
    canonical: 'https://www.agentcrush.xyz/blog/x402-discovery-postmortem',
  },
  openGraph: {
    title: "Working x402 payment isn't the same as working x402 discovery — AgentCrush",
    description:
      "Notes from getting AgentCrush indexed on Agentic.Market: the boring metadata gotchas that almost stopped me, and the checklist that finally worked.",
    url: 'https://www.agentcrush.xyz/blog/x402-discovery-postmortem',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://www.agentcrush.xyz/og-x402-postmortem.png',
        width: 1731,
        height: 909,
        alt: "Working x402 payment isn't the same as working x402 discovery — AgentCrush",
      },
    ],
    type: 'article',
    publishedTime: '2026-04-30T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Working x402 payment isn't the same as working x402 discovery — AgentCrush",
    description:
      "Notes from getting AgentCrush indexed on Agentic.Market: the boring metadata gotchas that almost stopped me, and the checklist that finally worked.",
    images: ['https://www.agentcrush.xyz/og-x402-postmortem.png'],
  },
}

export default function X402DiscoveryPostmortem() {
  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        x402 discovery post-mortem
      </p>

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Working x402 payment isn&apos;t the same as working x402 discovery
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        How I shipped AgentCrush to Agentic.Market, and the boring metadata that almost stopped me.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>April 30, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      {/* Hero image */}
      <div className="mt-8 rounded-xl overflow-hidden">
        <img
          src="/og-x402-postmortem.png"
          alt="Working x402 payment isn't the same as working x402 discovery"
          className="w-full h-auto"
        />
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          AgentCrush is now visible on Agentic.Market. Behind it are three x402 endpoints I shipped on Base mainnet over the past week. CDP merchant discovery now sees all three; the Agentic.Market UI now surfaces all three.
        </p>

        <p>
          Getting payment to work was the part I expected to be hard. It wasn&apos;t. Getting the listing to actually appear on Agentic.Market took longer than the implementation itself.
        </p>

        <p>
          If you&apos;re building on x402, here&apos;s what I wish I&apos;d known going in: a route that successfully accepts payment is not the same as a route that&apos;s discoverable. The two systems are decoupled. You can have one without the other, and you won&apos;t necessarily know.
        </p>

        {/* The setup */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The setup</h2>

        <p>The first endpoint that surfaced in the Agentic.Market UI was:</p>

        <pre className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-5 py-4 overflow-x-auto">
          <code className="font-mono text-sm text-violet-300">
            GET /api/agent/{'{handle}'}/verification-status
          </code>
        </pre>

        <p>
          It returns verification and tier status for any agent in the AgentCrush index. Priced at $0.005 USDC. The route returned a valid 402 Payment Required, buyers could pay, settlement landed on Base mainnet, the API returned 200 after payment.
        </p>

        <p>But Agentic.Market didn&apos;t show it.</p>

        {/* The investigation */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The investigation</h2>

        <p>
          I went through the predictable wrong assumptions in order. Indexing delay. The{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">.well-known/x402</code>{' '}
          file. Maybe one more paid settlement. None of those were the actual issue.
        </p>

        <p>
          The lesson that finally helped: debug CDP merchant discovery directly, not the Agentic.Market UI. CDP discovery is the lower-level catalog. Agentic.Market is a UI on top of it. If CDP doesn&apos;t have correct metadata, Agentic.Market won&apos;t show anything useful — but you can lose hours debugging the wrong layer.
        </p>

        {/* Three layers */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Three layers, three failure modes</h2>

        <p>Before going into specifics, it helps to separate the three systems involved.</p>

        <p>
          <span className="text-white/85 font-medium">Working payment</span> means the route can be paid and called. An agent or buyer sends a valid x402 payment header, the server settles it, the endpoint returns 200. That works independently of whether anyone can find the route.
        </p>

        <p>
          <span className="text-white/85 font-medium">Working CDP discovery</span> means the endpoint is indexed with complete metadata — path parameters, output examples, pricing, category. That&apos;s the catalog layer.
        </p>

        <p>
          <span className="text-white/85 font-medium">Working Agentic.Market UI</span> means the endpoint is visibly surfaced to users. Agentic.Market reads from CDP discovery and renders it. If the catalog entry is incomplete, the UI won&apos;t show it cleanly — or at all.
        </p>

        <p>
          AgentCrush currently has all three x402 routes in CDP discovery. The Agentic.Market UI is currently surfacing all three.
        </p>

        <p>Two things were wrong, both in the discovery metadata.</p>

        {/* Gotcha 1 */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">
          Gotcha 1:{' '}
          <code className="font-mono text-sm text-[#e91e80] font-normal">pathParamsSchema</code>
          {' '}for dynamic routes
        </h2>

        <p>
          My route is dynamic. The{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">{'{handle}'}</code>{' '}
          segment changes per agent. But the discovery declaration didn&apos;t include a proper{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">pathParamsSchema</code>.
          The route was callable, the route was payable — but the catalog had no structured way to describe what{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">{'{handle}'}</code>{' '}
          is or what a valid example looks like.
        </p>

        <p>
          For dynamic routes, the discovery metadata needs to declare every path parameter and provide a real example like{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">crewai</code>.
          Without it, the listing is incomplete from the catalog&apos;s perspective, regardless of how many successful payments hit it.
        </p>

        {/* Gotcha 2 */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">
          Gotcha 2:{' '}
          <code className="font-mono text-sm text-[#e91e80] font-normal">output.example</code>
          {' '}was silently absent
        </h2>

        <p>
          This one was subtler. The{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">declareDiscoveryExtension</code>{' '}
          call only includes <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">output</code>{' '}
          metadata when{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">output.example</code>{' '}
          is explicitly passed. I had everything else — category, tags, pricing, schema — but no output example. CDP discovery saw the resource. The catalog entry was structurally incomplete.
        </p>

        <p>
          The output example matters because agent clients and marketplaces need to know what the endpoint returns, and not in the abstract. They need a real, representative response. Once I added examples for all three endpoints, the catalog entry filled in. Here&apos;s the one for verification-status:
        </p>

        <pre className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-5 py-4 overflow-x-auto">
          <code className="font-mono text-xs text-violet-300 leading-relaxed whitespace-pre">
{`{
  "handle": "crewai",
  "name": "CrewAI",
  "tier": "evidence_ranked",
  "verified": false,
  "claim_status": "unclaimed",
  "erc8004_registered": true,
  "last_updated": "2026-04-25T15:01:12.914307+00:00",
  "source": "agentcrush"
}`}
          </code>
        </pre>

        {/* Settlement requirement */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The settlement requirement</h2>

        <p>
          One more thing I couldn&apos;t find clearly documented anywhere I looked: deploying the metadata fix wasn&apos;t enough. CDP discovery only updated after a fresh paid settlement triggered re-indexing. I deployed, refreshed CDP discovery, saw nothing. I made a paid call from a buyer wallet, refreshed again, the entry updated.
        </p>

        <p>
          If you&apos;re debugging a similar issue and you&apos;ve fixed the metadata but discovery still looks stale: trigger a paid settlement after the deploy. That&apos;s apparently what tells the indexer to re-read.
        </p>

        {/* Checklist */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The checklist that worked</h2>

        <p>For anyone building x402 services and trying to get indexed:</p>

        <ul className="mt-3 space-y-2">
          {[
            'valid 402 challenge',
            'successful paid settlement',
            '/.well-known/x402 and /.well-known/x402.json both live and valid',
            'Bazaar discovery extension attached to the paid route',
            'discoverable: true',
            'category and tags set',
            'pathParamsSchema for any dynamic routes',
            'representative output.example, not just a schema',
            'a fresh paid settlement after any metadata change',
          ].map((item) => (
            <li key={item} className="flex gap-3 text-sm text-white/60">
              <span className="text-[#e91e80] mt-1 shrink-0 text-xs">✓</span>
              <span className="font-mono">{item}</span>
            </li>
          ))}
        </ul>

        <p className="mt-2 text-sm text-white/45 italic">
          Debug CDP discovery before debugging the marketplace UI.
        </p>

        {/* Branding gap */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The branding gap</h2>

        <p>
          One issue is still unsolved, and it appears to be separate from the endpoint and discovery configuration. Agentic.Market displays AgentCrush as{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">www.agentcrush.xyz</code>{' '}
          with a generic icon, despite favicon, OpenGraph metadata, manifest, and{' '}
          <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">.well-known/x402</code>{' '}
          all being clean.
        </p>

        <p>
          CDP merchant discovery doesn&apos;t currently expose a merchant-level name, title, logo, or icon field. The discovery response is endpoint-centric. Unless there&apos;s an undocumented curation path, Agentic.Market is deriving display name and icon from the hostname. This looks like a platform-side decision or an undocumented feature — not something addressable from my end.
        </p>

        <p>
          I&apos;d love to be wrong about this. If anyone reading has gotten a custom logo or merchant name to surface on Agentic.Market, I want to know how.
        </p>

        {/* Closing */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Closing</h2>

        <p>
          What stayed with me from this debugging is simple. Working payment isn&apos;t the same as working discovery, and a lot of the agent commerce stack is going to feel like that for a while. You can ship a payable resource and discover later that it&apos;s not findable. You can ship metadata and discover it doesn&apos;t propagate without a settlement. Each of these is a small surprise; together they&apos;re the texture of building on a stack that&apos;s still being shaped.
        </p>

        <p>
          AgentCrush is market intelligence for the agent economy — rankings, reputation signals, and discovery infrastructure. x402 is how we make the data callable.
        </p>

        <p>
          Credit where it&apos;s due — the x402 channel on Coinbase&apos;s Developer Platform (CDP) Discord was helpful while I was debugging this. Good community there if you&apos;re shipping x402.
        </p>

        <p>
          If you&apos;re thinking about shipping an x402 endpoint of your own, my DMs are open.
        </p>

      </div>

      <hr className="my-10 border-white/[0.06]" />

      {/* Related links */}
      <div className="flex flex-wrap gap-5">
        <Link
          href="/api-docs"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          API docs →
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
