import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'Nobody is multi-protocol yet: what 1,359 agents actually support — AgentCrush',
  description:
    'We scanned 1,359 indexed agents for support across the four live protocol rails — ERC-8004, x402, A2A, and MCP. Zero support three or more. One supports two. Here is what the interoperability gap actually looks like in data.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/zero-interop',
  },
  openGraph: {
    title: 'Nobody is multi-protocol yet — AgentCrush',
    description:
      '1,359 agents. Zero support 3+ protocol rails. One supports 2. The interoperability gap in data.',
    url: 'https://agentcrush.xyz/blog/zero-interop',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-zero-interop.png',
        width: 1200,
        height: 630,
        alt: 'Nobody is multi-protocol yet — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-06-19T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nobody is multi-protocol yet — AgentCrush',
    description: '1,359 agents. Zero support 3+ rails. One supports 2. The interoperability gap, in data.',
    images: ['https://agentcrush.xyz/og-zero-interop.png'],
  },
}

export default function ZeroInterop() {
  return (
    <>
      <BlogJsonLd
        slug="zero-interop"
        title="Nobody is multi-protocol yet: what 1,359 agents actually support"
        summary="We scanned 1,359 indexed agents for support across the four live protocol rails — ERC-8004, x402, A2A, and MCP. Zero support three or more. One supports two."
        date="2026-06-19"
        imageUrl="/og-zero-interop.png"
      />
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Nobody is multi-protocol yet
      </p>

      {/* Cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/og-zero-interop.png"
        alt="Nobody is multi-protocol yet — AgentCrush"
        width={1731}
        height={909}
        className="w-full rounded-xl border border-white/[0.08] mb-8"
      />

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Nobody is multi-protocol yet: what 1,359 agents actually support
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        We scanned every indexed agent for support across the four live protocol rails.
        Zero support three or more. One supports two. Here&apos;s what the interoperability
        gap looks like when you measure it instead of assume it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>June 19, 2026</span>
        <span className="text-white/15">·</span>
        <span>Kris</span>
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        <p>
          Last week we shipped the{' '}
          <Link href="/methodology" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Protocol Compatibility Score
          </Link>{' '}
          — a 0-to-4 integer we compute for every indexed agent. It counts how many of the four
          live agent protocol rails the agent verifiably supports: ERC-8004, x402, A2A, and MCP.
          We mentioned the result briefly in{' '}
          <Link href="/blog/crawlers-vs-wallets" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            Crawlers vs. wallets
          </Link>.
          This is the full piece.
        </p>

        <p>
          As of June 12, 2026 — after correcting a content-validation bug that was counting
          soft-404 pages as protocol support — the distribution across 1,359 indexed agents is:
          <span className="text-white/85 font-medium"> zero agents support three or more rails.
          Exactly one supports two.</span> See the full breakdown and how each rail is
          detected on the{' '}
          <Link href="/methodology" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            methodology page
          </Link>.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The four rails, briefly</h2>

        <p>
          Each rail solves a different problem. They don&apos;t compete — they compose. But the
          communities building them barely overlap, which turns out to explain most of the data.
        </p>

        <p>
          <span className="text-white/85 font-medium">ERC-8004</span> is on-chain agent identity.
          An agent registers a token on Base that attests to its name, operator, and capabilities.
          The registry is public, permanent, and verifiable without trusting any intermediary.
          We index registrations and apply a confidence gate (≥ 0.75 match quality) to reject
          name-only collisions. The gate is intentionally strict: a false positive here poisons
          downstream trust signals.
        </p>

        <p>
          <span className="text-white/85 font-medium">x402</span> is machine-payable HTTP.
          An agent publishes a{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            /.well-known/x402
          </code>{' '}
          manifest that declares its prices and accepted payment methods. Another agent can
          discover this endpoint, read the price, pay in USDC over Base, and receive the
          service — no human in the loop, no account creation. We detect it with a HEAD
          request validated against expected JSON shape.
        </p>

        <p>
          <span className="text-white/85 font-medium">A2A (Agent-to-Agent)</span> is
          Google&apos;s task-delegation protocol. An agent card at{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            /.well-known/agent-card.json
          </code>{' '}
          describes the agent&apos;s capabilities, input/output formats, and how to task it.
          An orchestrator agent reads the card and decides whether to delegate a subtask.
          We detect the card and validate it contains a{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">name</code>{' '}
          field.
        </p>

        <p>
          <span className="text-white/85 font-medium">MCP (Model Context Protocol)</span> is
          Anthropic&apos;s tool-exposure standard. An MCP server publishes structured tool
          definitions that LLM orchestrators like Claude, Cursor, and others consume directly.
          We detect MCP via a manifest at{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            /.well-known/mcp.json
          </code>,
          via a primary category of{' '}
          <code className="text-white/70 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">
            mcp_server
          </code>{' '}
          in our index, or via a verified payment-rails entry.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What the scanner found</h2>

        <p>
          Individual rail coverage is non-zero. Agents with x402 endpoints exist — we track
          over 46,000 Bazaar resources and several hundred have real paid calls in the last
          30 days. Agents with MCP manifests exist — we index 15 MCP servers and the number
          grows weekly. Agents with A2A cards exist — including{' '}
          <Link href="/agent/agentcrush-mcp" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            AgentCrush itself
          </Link>{' '}
          (we built ours as part of B4). A handful of agents have ERC-8004 registrations
          with confidence above the threshold.
        </p>

        <p>
          What the data shows is that these populations barely overlap. An agent that has x402
          almost certainly doesn&apos;t have an A2A card. An agent with an MCP manifest almost
          certainly doesn&apos;t have ERC-8004 registration. When you ask &ldquo;which agents support
          at least two of these?&rdquo; the answer is: one. When you ask &ldquo;which support three
          or four?&rdquo; the answer is: none.
        </p>

        <p>
          The PCS-2 agent — the lone outlier — supports both MCP and x402: a tool-exposure
          endpoint and a payment manifest, on the same domain. That combination makes intuitive
          sense. An MCP server that also accepts direct payment is a natural product. What&apos;s
          missing is the identity layer (ERC-8004) and the delegation protocol (A2A) that would
          let other agents discover and verify it without a human referral.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why nobody stacks protocols</h2>

        <p>
          The simplest explanation: each protocol comes from a different room, and the rooms
          have barely met.
        </p>

        <p>
          MCP was built by the LLM orchestration community — developers building Claude apps,
          Cursor plugins, agent frameworks. Their mental model is &ldquo;how do I expose tools to a
          model?&rdquo; Payment rails and on-chain identity weren&apos;t in scope.
        </p>

        <p>
          x402 was built by the Coinbase/crypto-adjacent community — developers who think
          natively about USDC, Base, and micropayments. Their mental model is &ldquo;how do I
          monetize a machine-callable endpoint?&rdquo; Tool exposure to orchestrators wasn&apos;t in scope.
        </p>

        <p>
          A2A was built by Google&apos;s multi-agent orchestration team. Their mental model is
          &ldquo;how do enterprise orchestrators delegate tasks to specialized agents?&rdquo; Payments and
          on-chain identity weren&apos;t in scope.
        </p>

        <p>
          ERC-8004 was built by the onchain-agent community — teams building tokenized agents
          with verifiable on-chain provenance. Their mental model is &ldquo;how does an agent prove
          who it is?&rdquo; Tool exposure and payment rails weren&apos;t in scope.
        </p>

        <p>
          This isn&apos;t a criticism. Narrow scope is how you ship protocols. But it means the
          agent that would score PCS-4 — discoverable via A2A, payable via x402, verifiable
          via ERC-8004, and usable via MCP — would have to understand all four communities
          simultaneously. Nobody has built that agent yet.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">What changes this</h2>

        <p>
          The economic logic is clear. An agent that can be discovered (A2A or MCP), paid (x402),
          and verified (ERC-8004) captures more value than one that requires a human intermediary
          at each step. The multi-protocol agent isn&apos;t a theoretical construct — it&apos;s the
          natural end state for any agent serious about direct agent-to-agent commerce.
        </p>

        <p>
          What it takes is a team that reads across the communities. An MCP server developer who
          notices that their tool would monetize better with x402 added. An x402 payment endpoint
          operator who realizes that an A2A card would make them discoverable to orchestrators
          without manual integration. A chain-native agent team that adds an MCP manifest and
          suddenly gets discovered by every Claude and Cursor session.
        </p>

        <p>
          The first team that ships all four will be the most cited example in every
          interoperability post for the next two years. We&apos;re watching for it.
        </p>

        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we publish zeros</h2>

        <p>
          A data product that can&apos;t show zero can&apos;t be trusted at any other value.
        </p>

        <p>
          The first version of this metric had 104 agents at PCS ≥ 3. That number was wrong —
          a content-validation bug was treating soft-404 pages (sites that return a friendly
          HTML error for any path, including protocol manifests) as positive detections.
          We caught it by sampling, fixed the scanner, and the real number dropped to one.
          That correction is as important as the finding itself. If we didn&apos;t publish the
          corrected zero, we&apos;d have spent months tracking the wrong metric.
        </p>

        <p>
          The interoperability counter reads zero today. It will move — and when it does,
          you&apos;ll know the movement is real, because you watched us publish the floor.
        </p>

        <p>
          The numbers update daily as we re-scan the index. Developers can pull the live
          counts from the{' '}
          <Link href="/methodology" className="text-violet-300 underline underline-offset-2 hover:text-violet-200 transition-colors">
            methodology page
          </Link>, which links the machine-readable feed.
        </p>

      </div>

      <ShareCard
        title="Nobody is multi-protocol yet: what 1,359 agents actually support"
        url="/blog/zero-interop"
      />

      <CitationBlock
        slug="zero-interop"
        title="Nobody is multi-protocol yet: what 1,359 agents actually support"
        date="June 19, 2026"
        sources={[
          { label: 'Protocol Compatibility Score (live)', href: '/api/pcs/v1' },
          { label: 'Methodology', href: '/methodology' },
          { label: 'Related: Crawlers vs. wallets', href: '/blog/crawlers-vs-wallets' },
        ]}
      />

    </main>
    </>
  )
}
