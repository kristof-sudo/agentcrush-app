import Link from 'next/link'
import { ShareCard, CitationBlock, BlogJsonLd } from '@/components/blog/BlogPostLayout'

export const metadata = {
  title: 'The Agent Payments Stack, Live — AgentCrush',
  description:
    'Keyrock mapped 6 layers of agent payments infrastructure in May 2026. We indexed the 38 projects, scored them by stack depth, and now track it live. Here\'s what we found: Coinbase spans 5/6 layers. Governance is the hardest to clone. XRPL x402 on mainnet makes three settlement chains now.',
  alternates: { canonical: 'https://agentcrush.xyz/blog/agent-payments-stack-live' },
  openGraph: {
    title: 'The Agent Payments Stack, Live — AgentCrush',
    description: 'Keyrock mapped 6 layers of agent payments infrastructure. We indexed all 38 projects and track it live. Coinbase spans 5/6 layers. Governance is the hardest layer to clone.',
    url: 'https://agentcrush.xyz/blog/agent-payments-stack-live',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/api/og?title=Agent%20Payments%20Stack%2C%20Live&kicker=BLOG&subtitle=38%20projects%2C%206%20layers%2C%20tracked%20live', width: 1200, height: 630, alt: 'The Agent Payments Stack, Live — AgentCrush' }],
    type: 'article',
    publishedTime: '2026-05-26T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Agent Payments Stack, Live — AgentCrush',
    description: '38 projects, 6 layers, tracked live. What Keyrock mapped and what we added.',
    images: ['https://agentcrush.xyz/api/og?title=Agent%20Payments%20Stack%2C%20Live&kicker=BLOG&subtitle=38%20projects%2C%206%20layers%2C%20tracked%20live'],
  },
}

export default function AgentPaymentsStackLive() {
  return (
    <>
      <BlogJsonLd
        slug="agent-payments-stack-live"
        title="The Agent Payments Stack, Live"
        summary="Keyrock mapped 6 layers of agent payments infrastructure in May 2026. We indexed all 38 projects, scored them by stack depth, and now track it live."
        date="2026-05-26"
        imageUrl="/api/og?title=Agent%20Payments%20Stack%2C%20Live&kicker=BLOG&subtitle=38%20projects%2C%206%20layers%2C%20tracked%20live"
      />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-8">
          <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
          <span className="mx-2 text-white/15">/</span>
          The Agent Payments Stack, Live
        </p>

        {/* Title block */}
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          The Agent Payments Stack, Live
        </h1>
        <p className="mt-3 text-base text-white/45 italic leading-relaxed">
          Keyrock mapped 6 layers. We indexed 38 projects, scored by stack depth, and track it live.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>May 26, 2026</span>
          <span className="text-white/15">·</span>
          <span>Kris</span>
          <span className="text-white/15">·</span>
          <span>Phase 3.5 W2</span>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Body */}
        <div className="space-y-6 text-sm text-white/70 leading-relaxed">

          <p>
            In May 2026, Keyrock published <em>Who Pays the Agent?</em> — a map of the infrastructure required for AI agents to transact autonomously. Six layers: settlement chains, wallets, routing, payment protocols, governance, and application frameworks.
          </p>

          <p>
            It was the clearest framing of the payments stack we had seen. We indexed the 38 projects they identified (plus a few they didn't cover), scored each by stack depth, and wired it into the AgentCrush live index. The ranking is now live at{' '}
            <Link href="/rankings/agent-payments-stack" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              agentcrush.xyz/rankings/agent-payments-stack
            </Link>.
          </p>

          <h2 className="text-lg font-bold text-white pt-2">What the 6-layer map shows</h2>

          <p>
            The six layers are not equal. Keyrock's thesis — which our scoring reflects — is that governance is the hardest layer to clone and therefore the most valuable. Settlement and protocol are sticky once deployed. Routing is the most commoditised.
          </p>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden my-6">
            <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
              <span>Layer</span><span>What it solves</span><span className="text-right">Weight</span>
            </div>
            {[
              ['L0 Settlement', 'Where money actually moves', '4'],
              ['L1 Wallets', 'Agent key management + policy-gated signing', '3'],
              ['L2 Routing', 'Cross-chain bridging + abstraction', '2'],
              ['L3 Protocol', 'How the payment request is structured', '4'],
              ['L4 Governance', 'Authorisation, compliance, identity', '5 ←'],
              ['L5 Application', 'Frameworks, marketplaces, services', '3'],
            ].map(([l, d, w], i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2 border-b border-white/[0.04] last:border-b-0">
                <span className="text-xs font-mono text-white/80 w-24 shrink-0">{l}</span>
                <span className="text-xs text-white/55">{d}</span>
                <span className={`text-xs font-mono ${w.includes('←') ? 'text-amber-300' : 'text-white/45'} text-right shrink-0`}>{w}</span>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold text-white pt-2">What we found when we scored it</h2>

          <p>
            <strong className="text-white/90">Coinbase spans 5/6 layers</strong> — Base (L0), AgentKit (L1), CCTP (L2), x402 (L3), AP2 partnership (L4). The only layer they don't own is Application (L5). That makes Coinbase the single hardest node to route around in the current stack. Tied with Stripe at 5 layers covered, but Stripe's coverage skews toward traditional rails rather than crypto-native protocol.
          </p>

          <p>
            <strong className="text-white/90">Governance is genuinely hard</strong>. Only four projects score at L4: AP2, Visa's Agentic Tokens, Mastercard's Agentic Tokens, and ERC-8004. Of these, AP2 and the card network implementations are early-stage, and ERC-8004 is crypto-native. No dominant governance standard has emerged. The project that solves governance cleanly — policy delegation, spending limits, compliance attestation, all without human intervention per transaction — has a meaningful moat.
          </p>

          <p>
            <strong className="text-white/90">XRPL x402 on mainnet makes three settlement chains now</strong> — Base, Solana, and XRPL all have x402 implementations live or in production. Each removes one more excuse to not wire payment into an HTTP endpoint. The real metric isn't endpoint count; it's volume routing. Which chains are agents actually transacting on?
          </p>

          <p>
            <strong className="text-white/90">Fetch Agent Launch is the wildcard</strong>. We added it to the tracking set because it represents a BNB-chain native path for agent deployment + payments (Fetch tokens + Agent Launch bonding curves). It's early, but it's the clearest signal that the payments stack isn't just a Base/Solana story.
          </p>

          <h2 className="text-lg font-bold text-white pt-2">What AgentCrush adds to the Keyrock map</h2>

          <p>
            The Keyrock report was a static snapshot. We turned it into a live index:
          </p>

          <ul className="list-disc list-outside pl-5 space-y-2 text-white/65">
            <li>All 38 projects tracked with documented evidence per layer (not self-reported).</li>
            <li>Stack coverage scored with published weights — no black box.</li>
            <li>Live updates as new projects enter the stack or existing ones expand layers.</li>
            <li>Machine-readable via <code className="bg-white/[0.05] px-1 rounded text-[11px]">/api/rankings/agent-payments-stack/llm-summary</code> — LLMs querying AgentCrush get the current ranking, not a six-week-old report.</li>
          </ul>

          <p className="text-white/50 text-xs pt-2">
            Methodology: v1.0-aps. Source: Keyrock "Who Pays the Agent?" May 2026, extended by AgentCrush. Layer weights: L0=4, L1=3, L2=2, L3=4, L4=5, L5=3. Max score: 21.
          </p>

        </div>

        <hr className="my-8 border-white/[0.06]" />

        <ShareCard
          url="https://agentcrush.xyz/blog/agent-payments-stack-live"
          title="The Agent Payments Stack, Live"
        />

        <div className="mt-8 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings/agent-payments-stack" className="hover:text-white/70 transition-colors">Live ranking →</Link>
          <Link href="/agent-payments-stack" className="hover:text-white/70 transition-colors">Canonical page →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/blog" className="hover:text-white/70 transition-colors">← Blog</Link>
        </div>

      </main>
    </>
  )
}
