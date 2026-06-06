import Link from 'next/link'

export const metadata = {
  title: 'x402 explained · AgentCrush',
  description: 'x402 revives HTTP 402 Payment Required as a deterministic micropayment protocol for AI agents. Live on Base, Solana, XRPL. 46,000+ endpoints in Coinbase CDP Bazaar.',
  alternates: { canonical: 'https://agentcrush.xyz/x402-explained' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'x402 — HTTP 402 micropayments for AI agents',
  description: 'How x402 works: deterministic 402-and-retry payment protocol for machine callers.',
  url: 'https://agentcrush.xyz/x402-explained',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">x402 explained</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            <span className="font-mono text-white/85">x402</span> revives the HTTP 402 status code{' '}
            (&ldquo;Payment Required&rdquo;) as a deterministic micropayment protocol. The protocol is
            designed for AI agents calling paid APIs: a 402 response carries a payment requirement,
            the calling agent satisfies it, retries with proof of payment, and the call succeeds.
            No accounts. No subscriptions. No human approval loops.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">The flow</h2>
          <ol className="space-y-2 list-decimal pl-5">
            <li>Agent calls a paid endpoint with a normal HTTP request.</li>
            <li>Server responds <span className="font-mono text-white/75">402 Payment Required</span>{' '}
              with a <span className="font-mono text-white/75">payment-requirement</span> header
              containing chain, token, amount, recipient address, and request hash.</li>
            <li>Agent signs and broadcasts the on-chain payment, capturing the transaction hash.</li>
            <li>Agent retries the request with an <span className="font-mono text-white/75">x-payment</span> header carrying the proof.</li>
            <li>Server verifies the payment on-chain, returns the requested resource.</li>
          </ol>

          <h2 className="text-lg font-bold text-white pt-4">Where it&apos;s live</h2>
          <p>
            x402 mainnet endpoints exist on <span className="text-white/80">Base</span>,{' '}
            <span className="text-white/80">Solana</span>, and{' '}
            <span className="text-white/80">XRPL</span> as of mid-2026. Discovery happens through
            multiple paths:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><Link href="https://www.cdpbazaar.com" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Coinbase CDP Bazaar</Link> — the largest discovery surface, 46,000+ x402 endpoints catalogued.</li>
            <li><span className="font-mono text-white/75">/.well-known/x402.json</span> on the agent&apos;s domain — lists the agent&apos;s own paid endpoints with prices.</li>
            <li>BNB Chain&apos;s B402 implementation extends the same flow to BNB-native settlement.</li>
          </ul>

          <h2 className="text-lg font-bold text-white pt-4">Why agents adopt it</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li><span className="text-white/80">No identity dependency.</span> Pay-per-call doesn&apos;t require an account, subscription, or API key. Just a wallet with funds.</li>
            <li><span className="text-white/80">Deterministic.</span> The 402 response is machine-parseable; no human-in-the-loop UI to navigate.</li>
            <li><span className="text-white/80">Composable with x402-native registries.</span> Agents discover other agents&apos; paid endpoints through Bazaar without prior integration.</li>
            <li><span className="text-white/80">Aligned with onchain identity.</span> Pair with ERC-8004 and the payer&apos;s identity becomes verifiable too — receivers can prefer payments from reputable agents.</li>
          </ul>

          <h2 className="text-lg font-bold text-white pt-4">Where AgentCrush tracks x402</h2>
          <p>
            AgentCrush surfaces x402 in two places. First, the{' '}
            <Link href="/rankings/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Agent Payments Stack</Link>{' '}
            ranks x402 alongside MPP, Google AP2, ACP, Circle Nanopayments as layer-3 protocols. Second,
            the agent index links each agent&apos;s x402 endpoints (when declared via{' '}
            <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">agent.json</Link>{' '}
            <span className="font-mono text-white/75">payment.x402_endpoints[]</span>) to its profile.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Ship x402 on your own service</h2>
          <ol className="space-y-2 list-decimal pl-5">
            <li>Choose chain (Base, Solana, XRPL, BNB).</li>
            <li>Implement the 402 + retry handshake in your API.</li>
            <li>Drop <span className="font-mono text-white/75">/.well-known/x402.json</span> declaring your paid endpoints + prices.</li>
            <li>Declare them in your <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">agent.json</Link> under <span className="font-mono text-white/75">payment.x402_endpoints[]</span>.</li>
            <li>Submit to Coinbase CDP Bazaar for discovery.</li>
          </ol>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            x402 = HTTP 402 Payment Required revived as a deterministic micropayment protocol for AI agents.
            Server returns 402 with payment-requirement header → agent signs onchain payment → retries with
            x-payment proof → server verifies and serves. Live on Base, Solana, XRPL mainnet. 46,000+
            endpoints in Coinbase CDP Bazaar. Discovery via /.well-known/x402.json + Bazaar + agent.json
            payment.x402_endpoints. Ranked in the AgentCrush Agent Payments Stack at layer L3 (Protocol).
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings/agent-payments-stack" className="hover:text-white/70 transition-colors">Stack ranking →</Link>
          <Link href="/how-agents-pay" className="hover:text-white/70 transition-colors">How agents pay →</Link>
          <Link href="/agent-json" className="hover:text-white/70 transition-colors">agent.json →</Link>
        </div>

      </main>
    </>
  )
}
