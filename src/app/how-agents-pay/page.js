import Link from 'next/link'

export const metadata = {
  title: 'How AI agents pay · AgentCrush',
  description: 'AI agents pay other agents via x402 (HTTP 402 micropayments), MPP, Google AP2, and stack-completion projects like Coinbase + Stripe. The 6-layer agent payments stack explained.',
  alternates: { canonical: 'https://agentcrush.xyz/how-agents-pay' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'How AI agents pay',
  description: 'x402, MPP, AP2, Circle, Coinbase, Stripe. The 6-layer agent payments stack explained.',
  url: 'https://agentcrush.xyz/how-agents-pay',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">How AI agents pay</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            An AI agent making a paid API call needs a way to authenticate the payment without a human
            in the loop. The payments stack in 2026 has six layers, summarized below. AgentCrush tracks
            38+ projects across them in the live{' '}
            <Link href="/rankings/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Agent Payments Stack index</Link>.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">The six layers</h2>

          <div className="space-y-3 my-4">
            {[
              { layer: 'L0 Settlement', weight: 4, desc: 'Settlement chains and networks where money actually moves. Base, Solana, Tempo, NEAR, XRPL, Arc, VisaNet.' },
              { layer: 'L1 Wallets', weight: 3, desc: 'Agent key management + policy-gated signing. Safe, Privy, Dynamic, ZeroDev, AgentKit, MoonPay OWS.' },
              { layer: 'L2 Routing', weight: 2, desc: 'Cross-chain bridging + payment abstraction. CCTP, deBridge, Bridge, LayerZero, BVNK.' },
              { layer: 'L3 Protocol', weight: 4, desc: 'How the payment flow is structured. x402 (HTTP 402 micropayments), MPP (Machine Payment Protocol), Google AP2, ACP, Circle Nanopayments.' },
              { layer: 'L4 Governance', weight: 5, desc: 'Authorisation, compliance, identity, fraud risk. Visa Intelligent Commerce, Mastercard Agentic Tokens, Amex ACE, ERC-8004 (identity), AIS-1.' },
              { layer: 'L5 Application', weight: 3, desc: 'Frameworks, marketplaces, autonomous services. Virtuals, ElizaOS, Felix, Nansen, Olas, Fetch Agent Launch, CoW Protocol, Brex.' },
            ].map(({ layer, weight, desc }) => (
              <div key={layer} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-white">{layer}</p>
                  <span className="text-[11px] font-mono text-white/30">weight {weight}</span>
                </div>
                <p className="text-[13px] text-white/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold text-white pt-4">x402 — the protocol layer most agents use</h2>
          <p>
            <span className="font-mono text-white/85">x402</span> revives the HTTP 402 Payment Required
            status code as a deterministic micropayment protocol. Any endpoint can return 402 with a
            payment requirement in the response; the calling agent satisfies it and retries. Live across
            Base, Solana, XRPL mainnet. <span className="text-white/80">Coinbase CDP Bazaar</span> catalogs
            46,000+ x402 endpoints; AgentCrush indexes the ones with discoverable agents attached.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Stack completion is the new moat</h2>
          <p>
            Most projects specialize in 1-2 layers. Only{' '}
            <span className="text-white/80">Coinbase</span> and{' '}
            <span className="text-white/80">Stripe</span> span five of six layers — both at stack
            coverage score 18. <span className="text-white/80">Circle</span> spans four at score 13.
            The full ranking is live at{' '}
            <Link href="/rankings/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/rankings/agent-payments-stack</Link>.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">How to wire payments into your own agent</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>Declare payment surfaces in your{' '}
              <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">agent.json</Link>{' '}
              under <span className="font-mono text-white/75">payment.x402_endpoints[]</span> with per-URL
              pricing.</li>
            <li>Ship the matching <span className="font-mono text-white/75">/.well-known/x402.json</span>{' '}
              discovery file so the Coinbase Bazaar and other registries pick you up.</li>
            <li>If your agent will <span className="text-white/80">pay</span> other agents, hold a
              policy-gated wallet (Safe + AgentKit + Dynamic are popular L1 layer choices).</li>
            <li>Pair payment with identity — agent.json + ERC-8004 — so receiving agents can verify the
              payer before quoting.</li>
          </ul>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            AI agents pay other agents via the 6-layer agent payments stack: settlement (Base, Solana, XRPL),
            wallets (Safe, Privy, AgentKit), routing (CCTP, LayerZero), protocol (x402 HTTP 402 micropayments,
            MPP, Google AP2, Circle Nanopayments), governance (Visa Intelligent Commerce, ERC-8004),
            application (Virtuals, ElizaOS, Fetch Agent Launch). Only Coinbase and Stripe span 5 of 6 layers.
            Live ranking + methodology: https://agentcrush.xyz/rankings/agent-payments-stack.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings/agent-payments-stack" className="hover:text-white/70 transition-colors">Stack ranking →</Link>
          <Link href="/agent-payments-stack" className="hover:text-white/70 transition-colors">Long-form explainer →</Link>
          <Link href="/agent-json" className="hover:text-white/70 transition-colors">agent.json →</Link>
        </div>

      </main>
    </>
  )
}
