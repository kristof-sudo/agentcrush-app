import Link from 'next/link'

export const metadata = {
  title: 'How agent rankings work · AgentCrush',
  description: 'AgentCrush rankings use per-category multi-signal composite scores. Four category methodologies — model families, tokenized, service, developer — each with documented weights, signals, and confidence tiers.',
  alternates: { canonical: 'https://agentcrush.xyz/how-agent-rankings-work' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'How agent rankings work — methodology explained',
  description: 'Per-category multi-signal composite scoring with confidence tiers and risk flags. Methodology versions evolve in public.',
  url: 'https://agentcrush.xyz/how-agent-rankings-work',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">How agent rankings work</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            AgentCrush ranks AI agents using <span className="text-white/85">per-category multi-signal composite scoring</span>.
            Instead of one universal leaderboard — which would compare model families to tokenized agents
            to dev tools and produce nonsense — there are four independent category indices.
            A score in one category is not comparable to a score in another.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">The four category methodologies</h2>

          <div className="space-y-3 my-4">
            {[
              { cat: 'model_family', name: 'Model Families', ver: 'v1.4-with-deployment', signals: 'HF (30%) + LMArena (25%) + Derivatives (20%) + Citations (15%) + Deployment (10%)', href: '/methodology#model_family' },
              { cat: 'tokenized',    name: 'Tokenized Agents', ver: 'v1.1-tokenized-tvl', signals: 'Market cap (25%) + Liquidity+Volume (20%) + Holders (15%) + Momentum (10%) + TVL (15%) + Social (15%)', href: '/methodology#tokenized' },
              { cat: 'service',      name: 'Service Agents', ver: 'v1.1-service-forks', signals: 'Adoption (25%) + Quality (20%) + Activity (15%) + Protocols (15%) + Forks (15%) + Social (10%)', href: '/methodology#service' },
              { cat: 'developer',    name: 'Developer Agents', ver: 'v2.c-public', signals: 'Dynamic active_weight_total — GitHub + package usage + dependencies + ecosystem + docs + HN + trust signals', href: '/how-we-rank' },
            ].map(({ cat, name, ver, signals, href }) => (
              <div key={cat} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <Link href={href} className="text-[11px] font-mono text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors">{ver} →</Link>
                </div>
                <p className="text-[13px] text-white/55 leading-relaxed">{signals}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold text-white pt-4">Confidence tiers</h2>
          <p>
            Every ranked agent carries a{' '}
            <span className="font-mono text-white/75">confidence_tier</span>:{' '}
            <span className="text-white/80">high</span>,{' '}
            <span className="text-white/80">medium</span>,{' '}
            <span className="text-white/80">low</span>, or{' '}
            <span className="text-white/80">provisional</span>. These reflect the fraction of available
            signals an agent actually covers. A score built on 5 of 5 signals reads differently from
            one built on 3 of 5 — the tier makes that explicit.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Risk flags</h2>
          <p>
            Where applicable, agents carry{' '}
            <span className="font-mono text-white/75">risk_flags</span>:{' '}
            <span className="text-white/80">concentration_risk</span> (tokenized agents with top-10 holder share over 80%) and{' '}
            <span className="text-white/80">dormancy_risk</span> (developer agents with no GitHub push in 90+ days).
            Unified view: <span className="font-mono">agent_risk_flags_v1</span>.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Evidence-ready rule</h2>
          <p>
            Each methodology has an{' '}
            <span className="font-mono text-white/75">evidence_ready_for_public_rank</span> rule —
            typically 3 of N signals plus at least one capability/economic anchor signal. Agents below
            this gate stay <span className="text-white/80">indexed</span> but don&apos;t appear in the public
            ranking. The full agent set is still queryable via the API; the public ranking is just the
            evidence-ready subset.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Methodology evolution</h2>
          <p>
            Methodology versions evolve in public.{' '}
            <Link href="/methodology" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/methodology</Link>{' '}
            carries per-category changelogs. Every API response carries a{' '}
            <span className="font-mono text-white/75">methodology_version</span> field so a score and the rules
            that produced it travel together. No paid placement. No human override that isn&apos;t logged.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Where to verify</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>Per-category methodology JSON: <span className="font-mono text-[#00d4ff]/75">/api/methodology/{`{category}`}/llm-summary</span></li>
            <li>Live rankings JSON: <span className="font-mono text-[#00d4ff]/75">/api/rankings/{`{category}`}/llm-summary</span></li>
            <li>Single agent breakdown: <span className="font-mono text-[#00d4ff]/75">/api/agent/{`{handle}`}/llm-summary</span></li>
            <li>Trust API single-call: <span className="font-mono text-[#00d4ff]/75">/api/agent/{`{handle}`}/trust</span></li>
          </ul>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            AgentCrush uses per-category multi-signal composite scoring with confidence tiers (high/medium/low/provisional)
            and risk flags (concentration_risk, dormancy_risk). Four category methodologies: model_family (v1.4), tokenized (v1.1),
            service (v1.1), developer (v2.c). Scores in different categories are not directly comparable. Every API response
            carries methodology_version so a score and its rules travel together. Methodology page:{' '}
            <span className="font-mono">https://agentcrush.xyz/methodology</span>.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/how-we-rank" className="hover:text-white/70 transition-colors">Developer methodology →</Link>
        </div>

      </main>
    </>
  )
}
