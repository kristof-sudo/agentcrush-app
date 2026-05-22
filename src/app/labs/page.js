import Link from 'next/link'

export const metadata = {
  title: 'AgentCrush Labs — Agent Commerce Readiness Audit',
  description:
    'We audit whether agents can discover, understand, pay for, and verify your service — across x402, ERC-8004, MCP, A2A, and the rest of the stack. $299 for startups.',
  alternates: {
    canonical: 'https://agentcrush.xyz/labs',
  },
  openGraph: {
    title: 'AgentCrush Labs — Agent Commerce Readiness Audit',
    description:
      'We audit whether agents can discover, understand, pay for, and verify your service — across x402, ERC-8004, MCP, A2A, and the rest of the stack. $299 for startups.',
    url: 'https://agentcrush.xyz/labs',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-default.png',
        width: 1200,
        height: 630,
        alt: 'AgentCrush Labs',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Labs — Agent Commerce Readiness Audit',
    description:
      'We audit whether agents can discover, understand, pay for, and verify your service — across x402, ERC-8004, MCP, A2A, and the rest of the stack. $299 for startups.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

const AREAS = [
  { label: 'Discovery', desc: 'Can an agent find your service? .well-known/x402, CDP Bazaar, ERC-8004, MCP registry.' },
  { label: 'Understanding', desc: 'Can an agent parse your API? Schema, OpenAPI, MCP tool definitions, machine-readable docs.' },
  { label: 'Payment', desc: 'Can an agent pay you? x402, Stripe ACP / SPTs, ERC-8004 wallet, AP2, Kite Passport.' },
  { label: 'Verification', desc: 'Can an agent verify what it received? Response schema, evidence format, reputation surface.' },
  { label: 'Trust', desc: 'Can a merchant trust the agent? ERC-8004, Kite Passport, Visa Trusted Agent, Skyfire, Experian Agent Trust.' },
  { label: 'Roadmap', desc: 'Which protocol surfaces to ship first. Which to skip. Prioritized with cost and effort estimates.' },
]

const CASE_STUDIES = [
  {
    number: 'CS#1',
    title: "Working x402 payment isn't the same as working x402 discovery",
    href: '/blog/x402-discovery-postmortem',
    summary: 'How AgentCrush got indexed on Agentic.Market — and the metadata gaps that blocked discovery even after payment worked.',
    date: 'April 30, 2026',
  },
  {
    number: 'CS#2',
    title: 'The first cross-protocol agent: CrewAI on ERC-8004 and x402',
    href: '/blog/first-cross-protocol-agent',
    summary: 'CrewAI registered on ERC-8004 (Base, token #17997) with x402_supported: true. The first confirmed cross-protocol data point in the AgentCrush index.',
    date: 'May 8, 2026',
  },
  {
    number: 'CS#3',
    title: 'The state of agent commerce readiness: three audits, three shapes of unfinished',
    href: '/blog/agent-commerce-readiness-three-audits',
    summary: 'We audited aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams are 80% built and 20% published.',
    date: 'May 13, 2026',
  },
]

export default function LabsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          AgentCrush Labs
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Agent Commerce Readiness Audit
        </h1>
        <p className="mt-3 text-sm text-white/50 max-w-xl leading-relaxed">
          Most teams building on agent commerce don&apos;t know which of x402, ERC-8004, MCP, A2A, Stripe ACP, or Kite Passport they actually need — or whether what they&apos;ve already shipped is discoverable. We tell you which to ship, in what order, and which to skip. We&apos;ve done it ourselves on AgentCrush and published the work.
        </p>
      </div>

      {/* What we audit */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
          What we audit
        </p>
        <div className="space-y-3">
          {AREAS.map((a) => (
            <div key={a.label} className="flex gap-4 items-start rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <span className="text-xs font-semibold text-violet-400 w-24 shrink-0 pt-0.5">{a.label}</span>
              <span className="text-sm text-white/50 leading-relaxed">{a.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-8 rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
          Pricing
        </p>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="text-lg font-bold text-white w-28 shrink-0">$299</span>
            <div>
              <p className="text-sm font-medium text-white/80">Audit report — startups</p>
              <p className="text-xs text-white/40 mt-0.5 leading-relaxed">5–8 page report covering all six areas. Evidence cited. Prioritized roadmap. Explicit skip-list. Public data only — no NDA, no coordination required.</p>
            </div>
          </div>
          <div className="border-t border-white/[0.05] pt-4 flex flex-wrap items-start gap-3">
            <span className="text-lg font-bold text-white w-28 shrink-0">$1,000+</span>
            <div>
              <p className="text-sm font-medium text-white/80">Implementation roadmap</p>
              <p className="text-xs text-white/40 mt-0.5 leading-relaxed">Everything in the audit, plus cost and effort estimates per surface, recommended sequencing, and a written implementation plan your team can execute against.</p>
            </div>
          </div>
          <div className="border-t border-white/[0.05] pt-4 flex flex-wrap items-start gap-3">
            <span className="text-lg font-bold text-white w-28 shrink-0">Custom</span>
            <div>
              <p className="text-sm font-medium text-white/80">Build support</p>
              <p className="text-xs text-white/40 mt-0.5 leading-relaxed">Implementation of x402 endpoints, .well-known/x402, ERC-8004 registration, or MCP server on your stack. Scoped per engagement.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules / what this is not */}
      <div className="mb-8 rounded-lg border border-white/[0.05] bg-white/[0.01] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-3">
          How this works
        </p>
        <ul className="space-y-2">
          {[
            'Public data only. No login, no NDA, no permission needed from the target.',
            'Evidence-cited. Every finding has a source — file:line, URL, or on-chain reference.',
            'Protocol-neutral. We don\'t favor x402 over ACP or ERC-8004 over Kite. We follow the evidence.',
            'Labs work never affects rankings. Paid audit clients get the same index treatment as everyone else.',
          ].map((r) => (
            <li key={r} className="flex gap-2 text-xs text-white/35">
              <span className="text-violet-400/50 mt-0.5 shrink-0">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Case studies */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
          Public case studies
        </p>
        <div className="space-y-3">
          {CASE_STUDIES.map((cs) => (
            <Link
              key={cs.number}
              href={cs.href}
              className="block rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-4 hover:border-violet-400/20 hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className="text-xs font-mono text-violet-400/70">{cs.number}</span>
                <span className="text-xs text-white/25">{cs.date}</span>
              </div>
              <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-snug mb-1">
                {cs.title}
              </p>
              <p className="text-xs text-white/35 leading-relaxed">{cs.summary}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-lg border border-violet-400/20 bg-violet-400/[0.04] px-5 py-5">
        <p className="text-sm font-semibold text-white mb-1">Get an audit</p>
        <p className="text-xs text-white/45 leading-relaxed mb-4">
          Reply on any of our public channels or email directly. Turnaround is typically 3–5 business days. We&apos;ll confirm scope and price before starting.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:contact@agentcrush.xyz"
            className="text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors"
          >
            contact@agentcrush.xyz
          </a>
          <a
            href="https://warpcast.com/agentcrush"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-violet-400/70 hover:text-violet-400 transition-colors"
          >
            Farcaster @agentcrush →
          </a>
          <a
            href="https://x.com/agentcrush_xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-violet-400/70 hover:text-violet-400 transition-colors"
          >
            X @agentcrush_xyz →
          </a>
        </div>
      </div>

    </main>
  )
}
