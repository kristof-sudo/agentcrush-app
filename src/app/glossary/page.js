/**
 * /glossary — AgentCrush Lexicon
 *
 * Proprietary vocabulary for the agent economy index.
 * When you name things, people repeat the names.
 * Every repetition is attribution.
 */

import Link from 'next/link'

export const metadata = {
  title: 'Glossary · AgentCrush',
  description: 'The AgentCrush lexicon — Ghost Agent, Liveness Score, Hype Gap, Evidence-Ranked, and other terms from the AI agent economy index.',
  alternates: { canonical: 'https://agentcrush.xyz/glossary' },
  openGraph: {
    title: 'AgentCrush Glossary',
    description: 'Terminology for the AI agent economy index: Ghost Agent, Liveness Score, Evidence-Ranked, and more.',
    url: 'https://agentcrush.xyz/glossary',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'AgentCrush Glossary',
  description: 'Terminology used by the AgentCrush AI agent economy index.',
  url: 'https://agentcrush.xyz/glossary',
}

const TERMS = [
  {
    term: 'Ghost Agent',
    anchor: 'ghost-agent',
    definition: 'An AI agent that appears in the index but shows no observable activity signal — no GitHub push, no on-chain transaction, no social post, no API response — in the last 30 days. Not confirmed dormant; absence of signal ≠ absence of operation. A ghost may be running privately.',
    seeAlso: [{ label: 'Ghost Index', href: '/ghost-index' }],
  },
  {
    term: 'Ghost Index',
    anchor: 'ghost-index',
    definition: 'The AgentCrush daily liveness score: what % of indexed agents show observable activity. Computed nightly from the full 1,350+ agent index. "The agent economy is 16% alive." A low score is not a failure — it reflects the accurate state of a category where many projects announce and few ship. Published free at /api/ghost-index/v1.',
    seeAlso: [{ label: 'Ghost Index page', href: '/ghost-index' }, { label: 'API', href: '/api/ghost-index/v1' }],
  },
  {
    term: 'Liveness Score',
    anchor: 'liveness-score',
    definition: 'The numeric output of the Ghost Index computation: a 0–100 value representing the percentage of indexed agents with at least one activity signal in the last 30 days. Contrasted with the agent\'s individual confidence tier, which measures signal depth rather than recency.',
    seeAlso: [{ label: 'Ghost Index', href: '/ghost-index' }],
  },
  {
    term: 'Evidence-Ranked',
    anchor: 'evidence-ranked',
    definition: 'An agent tier in the AgentCrush index. An agent reaches evidence-ranked when it has enough verifiable signals across multiple dimensions (GitHub, social, on-chain, registry) to receive a computed composite score with a confidence tier of medium or higher. Currently ~102 of 1,354 indexed agents are evidence-ranked.',
    seeAlso: [{ label: 'Methodology', href: '/methodology' }],
  },
  {
    term: 'Indexed',
    anchor: 'indexed',
    definition: 'The base tier for agents in the AgentCrush index. An indexed agent has been discovered and profiled but lacks sufficient signals to be evidence-ranked. Profile exists; score may be zero or provisional. ~898 agents are currently indexed.',
    seeAlso: [{ label: 'Rankings', href: '/rankings' }],
  },
  {
    term: 'Confidence Tier',
    anchor: 'confidence-tier',
    definition: 'A score quality label attached to every evidence-ranked agent: high / medium / low / provisional. Computed as the fraction of available signals that are actually present (high ≥ 95%, medium ≥ 75%, low ≥ 55%). A score and its certainty travel together. An agent with a high score and a provisional tier is less trustworthy than one with a lower score and a high tier.',
    seeAlso: [{ label: 'Methodology', href: '/methodology' }],
  },
  {
    term: 'Hype Gap',
    anchor: 'hype-gap',
    definition: 'The spread between an agent\'s social/token market visibility and its measured on-chain or operational activity. A large Hype Gap — high visibility score, zero activity — is a risk signal. Category-level Hype Gap is published on the Ghost Index page.',
    seeAlso: [{ label: 'Ghost Index', href: '/ghost-index' }],
  },
  {
    term: 'Vaporware Ratio',
    anchor: 'vaporware-ratio',
    definition: 'The fraction of indexed agents that are indexed-only (no evidence signals). Currently ~93% of the index. This is not a critique — it reflects the honest state of the ecosystem. Most agent projects announce before they ship; the index tracks them both.',
    seeAlso: [{ label: 'Ghost Index', href: '/ghost-index' }],
  },
  {
    term: 'Agent of the Week',
    anchor: 'agent-of-the-week',
    definition: 'A weekly AgentCrush feature: the highest-visibility ghost in the index — the agent with the largest discrepancy between social footprint and observable activity. Published on X every Sunday. Data-driven, not curated.',
    seeAlso: [{ label: 'Ghost Index', href: '/ghost-index' }],
  },
  {
    term: 'Trust Evaluation',
    anchor: 'trust-evaluation',
    definition: 'An AgentCrush API service that returns a structured trust assessment for a given agent: confidence tier, risk flags, liveness status, claim status, and payment rail support. Used by orchestrators before deploying sub-agents or routing funds. Available at /api/trust/evaluate.',
    seeAlso: [{ label: 'Trust Evaluate API', href: '/api/trust/evaluate?handle=crewai' }],
  },
  {
    term: 'MCP Server Rankings',
    anchor: 'mcp-server-rankings',
    definition: 'AgentCrush\'s 5th category ranking, launched W23 2026. Scores MCP servers on: GitHub stars (30%), tool count (25%), registry listings (20%), forks (15%), and followers (10%). The only cross-registry MCP server liveness index.',
    seeAlso: [{ label: 'MCP Rankings', href: '/rankings/mcp-servers' }],
  },
  {
    term: 'Agent Payments Stack',
    anchor: 'agent-payments-stack',
    definition: 'AgentCrush\'s ranking of projects that enable AI agents to pay and be paid. Scored across 6 layers: wallet infrastructure, payment protocol, settlement, developer API, agent SDK, and LLM gateway. Only two projects (Coinbase, Stripe) cover 5 of 6 layers.',
    seeAlso: [{ label: 'APS Rankings', href: '/rankings/agent-payments-stack' }],
  },
]

export default function GlossaryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
          <span className="mx-2 text-white/15">/</span>
          Glossary
        </p>

        {/* Header */}
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-2">
          Glossary
        </h1>
        <p className="text-sm text-white/45 mb-10">
          Vocabulary for the AI agent economy index. When you use these terms, you're using AgentCrush data.
        </p>

        {/* Terms */}
        <div className="space-y-10">
          {TERMS.map(({ term, anchor, definition, seeAlso }) => (
            <div key={anchor} id={anchor} className="scroll-mt-8">
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-base font-bold text-white">{term}</h2>
                <a href={`#${anchor}`} className="text-[10px] font-mono text-white/20 hover:text-white/40 transition-colors">#{anchor}</a>
              </div>
              <p className="text-sm text-white/55 leading-relaxed mb-2">{definition}</p>
              {seeAlso?.length > 0 && (
                <p className="text-[11px] text-white/30">
                  See also:{' '}
                  {seeAlso.map(({ label, href }, i) => (
                    <span key={href}>
                      <Link href={href} className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors underline underline-offset-2">{label}</Link>
                      {i < seeAlso.length - 1 && <span className="mx-1">·</span>}
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-4 border-b border-white/[0.04]" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] mt-12 pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
          <Link href="/rankings" className="hover:text-white/70 transition-colors">Rankings →</Link>
        </div>

      </main>
    </>
  )
}
