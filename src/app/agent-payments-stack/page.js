import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'The Agent Payments Stack · AgentCrush',
  description:
    'The 6-layer infrastructure map for how AI agents pay and get paid — settlement chains, wallets, routing, payment protocols, governance, and application frameworks. AgentCrush tracks who covers what across the full stack.',
  alternates: { canonical: 'https://agentcrush.xyz/agent-payments-stack' },
  openGraph: {
    title: 'The Agent Payments Stack — AgentCrush',
    description: 'The 6-layer infrastructure map for agent payments: settlement, wallets, routing, protocol, governance, application. Who covers what, ranked by stack depth.',
    url: 'https://agentcrush.xyz/agent-payments-stack',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/api/og?title=Agent%20Payments%20Stack&kicker=PAYMENTS&subtitle=6-layer%20map%20of%20how%20agents%20pay%20and%20get%20paid', width: 1200, height: 630, alt: 'The Agent Payments Stack — AgentCrush' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Agent Payments Stack — AgentCrush',
    description: '6-layer infrastructure map for how AI agents pay and get paid.',
    images: ['https://agentcrush.xyz/api/og?title=Agent%20Payments%20Stack&kicker=PAYMENTS&subtitle=6-layer%20map%20of%20how%20agents%20pay%20and%20get%20paid'],
  },
}

const LAYERS = [
  {
    id: 'L0',
    name: 'Settlement',
    weight: 4,
    blurb: 'Where money actually moves.',
    detail: 'The underlying chain or network that finalises transactions. Base, Solana, XRPL, Tempo, and traditional rails (VisaNet, Arc) all compete here. Settlement choice determines latency, cost, and geographic reach.',
    examples: ['Base', 'Solana', 'XRPL', 'Tempo', 'Visa', 'Mastercard'],
    accent: 'border-sky-400/40 bg-sky-400/[0.06] text-sky-300',
  },
  {
    id: 'L1',
    name: 'Wallets & Keys',
    weight: 3,
    blurb: 'Agent key management + policy-gated signing.',
    detail: 'AI agents cannot hold private keys the same way humans do — they need programmable wallets with spending policies, session keys, and delegation controls. Safe, AgentKit (Coinbase), MoonPay OWS, Privy, and ZeroDev all play here.',
    examples: ['Safe', 'AgentKit (Coinbase)', 'MoonPay OWS', 'Privy', 'Dynamic', 'ZeroDev'],
    accent: 'border-violet-400/40 bg-violet-400/[0.06] text-violet-300',
  },
  {
    id: 'L2',
    name: 'Routing & Abstraction',
    weight: 2,
    blurb: 'Cross-chain bridging + fee abstraction.',
    detail: 'Most agent tasks are chain-agnostic — they should not care whether value moves over Base or Solana. Routing layers (CCTP, deBridge, LayerZero, BVNK) abstract this. The most commoditised layer of the stack.',
    examples: ['CCTP (Circle)', 'deBridge', 'LayerZero', 'BVNK', 'Bridge'],
    accent: 'border-fuchsia-400/40 bg-fuchsia-400/[0.06] text-fuchsia-300',
  },
  {
    id: 'L3',
    name: 'Payment Protocol',
    weight: 4,
    blurb: 'How the payment request is structured.',
    detail: 'The payment protocol defines how an agent signals "I need to pay for this" and how the payee signals "I accept payment." x402 (HTTP-native micropayments), MPP (Mastercard), AP2 (A2A authorization), and ACP are the main contenders.',
    examples: ['x402 (Coinbase)', 'MPP (Mastercard)', 'AP2', 'ACP', 'Nanopayments'],
    accent: 'border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-300',
  },
  {
    id: 'L4',
    name: 'Governance & Policy',
    weight: 5,
    blurb: 'Authorisation, compliance, identity — the most valuable layer.',
    detail: 'Who is allowed to spend how much, under what conditions, with what identity? This is where regulatory compliance and A2A trust intersect. AP2, Visa\'s Agentic Tokens, Mastercard\'s Agentic Tokens, ERC-8004, and AIS-1 all address the governance gap. Highest weight because it is the hardest to replicate and most differentiated.',
    examples: ['AP2', 'Visa Agentic Tokens', 'Mastercard Agentic Tokens', 'ERC-8004', 'AIS-1'],
    accent: 'border-amber-400/40 bg-amber-400/[0.06] text-amber-300',
  },
  {
    id: 'L5',
    name: 'Application',
    weight: 3,
    blurb: 'Frameworks, marketplaces, and autonomous services that use the stack.',
    detail: 'The agents themselves — or the frameworks that orchestrate them. Virtuals Protocol (tokenized agents), ElizaOS (autonomous social agents), Fetch Agent Launch (BNB-chain agent deployment), Olas (agent services marketplace), Felix. The application layer is broad but substitutable; the infrastructure layers beneath it are sticky.',
    examples: ['Virtuals Protocol', 'ElizaOS', 'Fetch Agent Launch', 'Olas', 'Felix', 'Nansen'],
    accent: 'border-rose-400/40 bg-rose-400/[0.06] text-rose-300',
  },
]

export default function AgentPaymentsStackPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'The Agent Payments Stack',
    description: 'The 6-layer infrastructure map for how AI agents pay and get paid — settlement, wallets, routing, protocol, governance, application.',
    url: 'https://agentcrush.xyz/agent-payments-stack',
    dateModified: '2026-05-26',
    author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://agentcrush.xyz/agent-payments-stack' },
    about: ['AI agents', 'agent payments', 'x402', 'A2A commerce', 'autonomous payments', 'agent economy'],
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-3">
          Agent Economy · Payments Infrastructure
        </p>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
          The Agent Payments Stack
        </h1>
        <p className="mt-4 text-base text-white/70 leading-relaxed max-w-2xl">
          For AI agents to transact autonomously — paying for APIs, services, compute, and data without a human in the loop — they need a full payments stack beneath them. Six layers, each with different players and different levels of substitutability.
        </p>
        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-4 py-3 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/85 mb-1">Methodology note</p>
          <p className="text-sm text-white/70 leading-relaxed">
            This is a <span className="text-violet-300">project taxonomy</span>, not an agent ranking. The 38 tracked projects are companies, protocols, and standards — not AI agent handles. Scoring is by stack depth (layers covered × layer weight). See <Link href="/rankings/agent-payments-stack" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">the live ranking</Link>.
          </p>
        </div>
      </div>

      {/* Why payments matter */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Why autonomous payments are the agent economy's unlock</h2>
        <div className="space-y-4 text-sm text-white/65 leading-relaxed">
          <p>
            An AI agent that can reason, plan, and act — but cannot pay — is ultimately dependent on a human to authorise every transaction. That dependency caps autonomy. The moment an agent can pay for the API call, the compute, the data subscription, the downstream service — on its own, within policy limits, without human sign-off per transaction — the agent economy becomes real.
          </p>
          <p>
            The infrastructure required is non-trivial. Agents need wallets they cannot lose keys for, payment protocols lightweight enough to wire into an HTTP request, settlement rails fast enough for real-time service composition, governance layers that satisfy compliance without requiring human intervention, and application frameworks that orchestrate the whole thing.
          </p>
          <p>
            In 2026 all six of these layers exist in some form. None is fully mature. The race is to see which combinations become the default stack.
          </p>
        </div>
      </section>

      {/* Six layers */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6">The six layers</h2>
        <div className="space-y-4">
          {LAYERS.map((layer) => (
            <div key={layer.id} className={`rounded-xl border px-5 py-4 ${layer.accent.split(' ').slice(0, 2).join(' ')}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border ${layer.accent}`}>
                  {layer.id}
                </span>
                <span className="font-bold text-white/90">{layer.name}</span>
                <span className="text-xs text-white/40 ml-auto">weight {layer.weight}/5</span>
              </div>
              <p className="text-sm text-white/80 font-medium mb-1">{layer.blurb}</p>
              <p className="text-sm text-white/55 leading-relaxed mb-3">{layer.detail}</p>
              <div className="flex flex-wrap gap-1.5">
                {layer.examples.map((ex) => (
                  <span key={ex} className="text-[11px] font-mono bg-white/[0.06] border border-white/[0.09] rounded px-2 py-0.5 text-white/60">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring logic */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">How stack coverage is scored</h2>
        <div className="space-y-3 text-sm text-white/65 leading-relaxed">
          <p>
            Each project is scored by summing the weights of the layers it covers. A project that spans all six layers earns a maximum of 21 (4+3+2+4+5+3). Governance (L4, weight 5) is weighted highest — it is the hardest to replicate, most differentiated, and most legally complex. Routing (L2, weight 2) is lowest — most commoditised.
          </p>
          <p>
            Multi-layer presence is the key signal. Coinbase spans five of six layers (settlement via Base, wallets via AgentKit, routing via CCTP, protocol via x402, governance via AP2 partnership) — making it the hardest single incumbent to route around.
          </p>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 font-mono text-xs text-white/50">
            score = Σ(layer_weight × layer_covered) for L0–L5<br />
            max = 4+3+2+4+5+3 = <span className="text-white/80">21</span>
          </div>
        </div>
      </section>

      {/* Live tracking */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Live tracking</h2>
        <p className="text-sm text-white/65 leading-relaxed mb-4">
          AgentCrush tracks 38 projects across the payments stack. The live ranking is available on the rankings page and via the flat JSON endpoint below.
        </p>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>Surface</span><span className="text-right">URL</span>
          </div>
          {[
            { l: 'Live ranking page', v: '/rankings/agent-payments-stack' },
            { l: 'Flat JSON endpoint (no auth)', v: '/api/rankings/agent-payments-stack/llm-summary' },
            { l: 'Methodology', v: '/methodology#agent_payments_stack' },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2 border-b border-white/[0.04] last:border-b-0">
              <span className="text-sm text-white/75">{r.l}</span>
              <Link href={r.v} className="text-xs font-mono text-violet-300 hover:text-violet-200 transition-colors text-right">{r.v}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* For LLMs */}
      <section className="mb-10 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] px-5 py-4">
        <h2 className="text-base font-bold mb-1">For LLM clients</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          The Agent Payments Stack ranking is available as a free flat JSON endpoint at{' '}
          <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-xs">/api/rankings/agent-payments-stack/llm-summary</code>.
          No auth required. Returns all 38 tracked projects with layer coverage, scores, and evidence tier.
        </p>
      </section>

      {/* Footer nav */}
      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings/agent-payments-stack" className="hover:text-white/70 transition-colors">Live ranking →</Link>
        <Link href="/agent-economy" className="hover:text-white/70 transition-colors">Agent economy →</Link>
        <Link href="/x402-agents" className="hover:text-white/70 transition-colors">x402 →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
        <Link href="/rankings" className="hover:text-white/70 transition-colors">All rankings →</Link>
      </div>
    </main>
  )
}
