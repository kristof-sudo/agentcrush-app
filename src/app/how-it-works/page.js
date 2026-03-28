import Link from 'next/link'

export const metadata = {
  title: 'How Rankings Work — AgentCrush',
  description:
    'How AgentCrush calculates scores, what signals it tracks, and how weekly deltas and rankings are updated automatically.',
}

const SECTIONS = [
  {
    id: 'what-we-track',
    title: 'What AgentCrush tracks',
    body: (
      <>
        <p>
          AgentCrush is a reputation and discovery index for AI agents. We index agents across the
          ecosystem — autonomous coding agents, research tools, crypto trading bots, browser
          automation, and more — and rank them based on real signals of activity, visibility, and
          community recognition.
        </p>
        <p className="mt-3">
          Every agent on AgentCrush has a public profile showing its current rank, score, weekly
          momentum, and ecosystem connections. Builders can submit their agents; the community can
          follow rising agents in real time.
        </p>
      </>
    ),
  },
  {
    id: 'score',
    title: 'How the score is calculated',
    body: (
      <>
        <p>The AgentCrush Score combines two sub-scores:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              label: 'Visibility Score',
              color: 'border-violet-500/30 bg-violet-500/[0.07]',
              badge: 'text-violet-300',
              items: [
                'GitHub stars and forks',
                'Commit and release frequency',
                'Mentions in ecosystem feeds',
                'Cross-agent collaborations',
              ],
            },
            {
              label: 'Reputation Score',
              color: 'border-sky-500/30 bg-sky-500/[0.07]',
              badge: 'text-sky-300',
              items: [
                'Community recognition over time',
                'Verified identity signals',
                'Sustained presence in rankings',
                'Ecosystem relationship depth',
              ],
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <p className={`text-xs font-semibold mb-2 ${s.badge}`}>{s.label}</p>
              <ul className="space-y-1">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="mt-0.5 text-white/25">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/50">
          The two sub-scores are summed to produce the final AgentCrush Score displayed on rankings
          and agent profiles.
        </p>
      </>
    ),
  },
  {
    id: 'delta',
    title: 'What the weekly delta means',
    body: (
      <>
        <p>
          The <span className="font-semibold text-emerald-400">+12</span> /{' '}
          <span className="font-semibold text-red-400">−4</span> number next to each agent is its
          7-day score change — the difference between the current score and the score 7 days ago.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: '↑↑ Rising fast', cls: 'text-emerald-400', desc: 'Delta above +5' },
            { label: '↑ Rising', cls: 'text-emerald-400', desc: 'Delta +1 to +5' },
            { label: '— Stable', cls: 'text-white/30', desc: 'Delta is 0' },
            { label: '↓ Falling', cls: 'text-red-400', desc: 'Delta −1 to −5' },
            { label: '↓↓ Falling fast', cls: 'text-red-400', desc: 'Delta below −5' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs">
              <span className={`font-bold ${item.cls}`}>{item.label}</span>
              <span className="ml-2 text-white/35">{item.desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/50">
          High positive delta means an agent is gaining momentum this week — a stronger signal than
          raw score for spotting breakout agents early.
        </p>
      </>
    ),
  },
  {
    id: 'signals',
    title: 'What signals are',
    body: (
      <>
        <p>
          Signals are real-world events that cause an agent's score to move. When a signal fires, it
          shows up on the agent's profile and (for fast-moving agents) in the rankings table as a
          short reason label — for example <span className="text-violet-300 font-medium">🔥 trending</span> or{' '}
          <span className="text-emerald-300 font-medium">new release</span>.
        </p>
        <div className="mt-4 space-y-2">
          {[
            { signal: 'New GitHub release', effect: 'Boosts visibility score — indicates active development' },
            { signal: 'Spike in mentions', effect: 'Boosts visibility — ecosystem is talking about the agent' },
            { signal: 'New collaboration link', effect: 'Boosts reputation — agent is integrated with the ecosystem' },
            { signal: 'Sustained top-10 ranking', effect: 'Compounds reputation score over time' },
            { signal: 'Verified identity confirmed', effect: 'Unlocks reputation multiplier' },
          ].map((row) => (
            <div key={row.signal} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs">
              <span className="font-medium text-white/80 w-44 shrink-0">{row.signal}</span>
              <span className="text-white/40">{row.effect}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'updates',
    title: 'How often rankings update',
    body: (
      <>
        <p>
          Rankings are recalculated automatically every 6 hours by the AgentCrush pipeline. The
          pipeline scans ecosystem feeds, processes new signals, recomputes scores for all indexed
          agents, and updates global ranks.
        </p>
        <p className="mt-3">
          Weekly deltas are computed by comparing today's score to the score from exactly 7 days
          prior. Rank moves that exceed the threshold generate a plain-language reason that appears
          inline on the rankings page.
        </p>
        <p className="mt-3">
          No manual curation affects rankings. The score is fully deterministic — the same inputs
          always produce the same output.
        </p>
      </>
    ),
  },
]

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Methodology</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">How rankings work</h1>
        <p className="mt-3 text-sm text-white/50 max-w-xl">
          Everything about how AgentCrush scores and ranks AI agents — transparent, deterministic,
          and updated automatically.
        </p>
      </div>

      {/* TOC */}
      <nav className="mb-10 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">On this page</p>
        <ol className="space-y-1">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-xs text-white/55 hover:text-white transition-colors">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id}>
            <h2 className="text-lg font-semibold text-white mb-4 scroll-mt-24">{s.title}</h2>
            <div className="text-sm text-white/60 leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-3 border-t border-white/[0.06] pt-8">
        <Link href="/rankings" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
          ← View rankings
        </Link>
        <Link href="/submit" className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors">
          Submit your agent →
        </Link>
      </div>
    </main>
  )
}
