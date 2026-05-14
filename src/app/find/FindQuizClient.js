'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── Questions ────────────────────────────────────────────────────────────────
// Each question's selected answer becomes a filter applied to the index query.
// Multiple selections per question are allowed where it makes sense (e.g. "either").

const QUESTIONS = [
  {
    id: 'archetype',
    title: 'What do you need an agent for?',
    subtitle: 'Pick the closest. Doesn\'t have to be exact.',
    choices: [
      { value: 'Builder',    label: 'Write code',           desc: 'Cursor, Devin, Claude Code, Aider' },
      { value: 'Researcher', label: 'Research & synthesize', desc: 'Perplexity, Elicit, NotebookLM' },
      { value: 'Operator',   label: 'Run workflows',         desc: 'LangChain, CrewAI, AutoGen' },
      { value: 'Trader',     label: 'Trade markets / crypto', desc: 'aixbt, Zerebro, Griffain' },
      { value: 'Creator',    label: 'Make media / content',   desc: 'Suno, ElevenLabs, Runway' },
    ],
  },
  {
    id: 'maturity',
    title: 'How established does it need to be?',
    subtitle: 'There\'s a spectrum from "battle-tested" to "frontier experiment".',
    choices: [
      { value: 'evidence_ranked', label: 'Battle-tested',  desc: 'Evidence-ranked only — high signal coverage' },
      { value: 'any',             label: 'Some momentum is fine', desc: 'Indexed agents with growing signals' },
      { value: 'frontier',        label: 'Cutting-edge is OK',    desc: 'Open to newer or experimental projects' },
    ],
  },
  {
    id: 'payments',
    title: 'Do you need machine-to-machine payments?',
    subtitle: 'Some agents accept x402 micropayments. Most don\'t — yet.',
    choices: [
      { value: 'x402_required', label: 'Yes — paid endpoints',  desc: 'Filter to agents with x402 / machine-payment surfaces' },
      { value: 'x402_optional', label: 'Nice to have',           desc: 'No filter — just show me good agents' },
      { value: 'x402_no',       label: 'No — just trial it',     desc: 'Free or open-source preferred' },
    ],
  },
  {
    id: 'openness',
    title: 'Does it need to be open source?',
    subtitle: 'GitHub-public vs. hosted SaaS.',
    choices: [
      { value: 'oss_required', label: 'Required',     desc: 'Must have a public GitHub repo' },
      { value: 'oss_preferred', label: 'Preferred',   desc: 'Open source bonus, but not required' },
      { value: 'oss_dontcare',  label: 'Don\'t care', desc: 'Show me the best fit regardless' },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function FindQuizClient() {
  const [step, setStep] = useState(0) // 0..QUESTIONS.length-1, then QUESTIONS.length = results
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [animDirection, setAnimDirection] = useState('forward') // for slide direction

  const isResults = step >= QUESTIONS.length
  const progress = isResults ? 100 : Math.round((step / QUESTIONS.length) * 100)

  function answerAndNext(qid, value) {
    const next = { ...answers, [qid]: value }
    setAnswers(next)
    setAnimDirection('forward')
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1)
    } else {
      runQuery(next)
    }
  }

  function back() {
    if (step === 0) return
    setAnimDirection('back')
    setStep(step - 1)
  }

  async function runQuery(finalAnswers) {
    setLoading(true)
    setError(null)
    setStep(QUESTIONS.length)
    try {
      // Build the agents query against rankings.
      // We pull the join: agents + rankings (for score/rank) + filters.
      let query = supabase
        .from('agents')
        .select(`
          id, handle, display_name, archetype, avatar_url, tagline,
          tier, github_url, website_url,
          bot_fetch_friendliness,
          rankings (global_rank, score_total)
        `)

      // Archetype filter
      if (finalAnswers.archetype) {
        query = query.eq('archetype', finalAnswers.archetype)
      }

      // Maturity filter
      if (finalAnswers.maturity === 'evidence_ranked') {
        query = query.eq('tier', 'evidence_ranked')
      }
      // 'any' or 'frontier' → no tier filter

      // OSS filter
      if (finalAnswers.openness === 'oss_required') {
        query = query.not('github_url', 'is', null)
      }

      // x402 filter — must have machine-discoverability surface (only ~14% of agents do)
      if (finalAnswers.payments === 'x402_required') {
        query = query.eq('bot_fetch_friendliness->>has_well_known_x402', 'true')
      }

      // Order: prefer evidence-ranked, then by score
      query = query.order('tier', { ascending: true }).limit(50)

      const { data, error: dbError } = await query
      if (dbError) throw new Error(dbError.message)

      // Sort: evidence_ranked first, then by ranking score desc
      const sorted = (data || [])
        .map((a) => ({
          ...a,
          _rank: a.rankings?.[0]?.global_rank ?? Number.MAX_SAFE_INTEGER,
          _score: a.rankings?.[0]?.score_total ?? 0,
          _evidence: a.tier === 'evidence_ranked' ? 1 : 0,
        }))
        .sort((a, b) => {
          if (a._evidence !== b._evidence) return b._evidence - a._evidence
          return a._rank - b._rank
        })

      setResults(sorted.slice(0, 5))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function restart() {
    setStep(0)
    setAnswers({})
    setResults(null)
    setError(null)
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 md:px-6 py-12">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        <span className="mx-2 text-white/15">/</span>
        Find your agent
      </p>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          {isResults ? 'Your matches' : `${step + 1} of ${QUESTIONS.length}`}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          {isResults ? 'Here\'s what fits' : 'Find your agent'}
        </h1>
      </div>

      {/* Progress bar */}
      {!isResults && (
        <div className="mb-8 h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Question card */}
      {!isResults && (
        <div
          key={step}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-6 md:px-7 md:py-8"
          style={{
            animation: `${animDirection === 'forward' ? 'slideInRight' : 'slideInLeft'} .35s cubic-bezier(.2,.8,.4,1) both`,
          }}
        >
          <h2 className="text-lg font-semibold text-white leading-tight mb-1">
            {QUESTIONS[step].title}
          </h2>
          <p className="text-sm text-white/40 mb-5">
            {QUESTIONS[step].subtitle}
          </p>

          <div className="space-y-2.5">
            {QUESTIONS[step].choices.map((c) => (
              <button
                key={c.value}
                onClick={() => answerAndNext(QUESTIONS[step].id, c.value)}
                className="block w-full text-left rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 hover:border-emerald-400/40 hover:bg-emerald-400/[0.04] transition-colors group"
              >
                <div className="text-sm font-semibold text-white/85 group-hover:text-white">
                  {c.label}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {c.desc}
                </div>
              </button>
            ))}
          </div>

          {step > 0 && (
            <button
              onClick={back}
              className="mt-5 text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
            >
              ← back
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {isResults && (
        <div>
          {loading && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
              <p className="text-sm text-white/60">Querying the index…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/[0.05] px-5 py-5">
              <p className="text-sm text-red-300 mb-2">Something went wrong</p>
              <p className="text-xs text-white/50 mb-3">{error}</p>
              <button onClick={restart} className="text-xs font-mono text-white/60 hover:text-white border border-white/[0.1] rounded px-3 py-1.5">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && results && results.length === 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-6">
              <p className="text-sm text-white/70 mb-2">No agents match those filters yet.</p>
              <p className="text-xs text-white/45 mb-4">
                Either we don&apos;t have enough indexed agents for that combination, or your filters are very specific. Try widening one.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={restart} className="text-xs font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-400/30 rounded px-3 py-1.5">
                  Start over
                </button>
                <Link href="/rankings" className="text-xs font-mono text-white/50 hover:text-white border border-white/[0.1] rounded px-3 py-1.5">
                  Browse all →
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && results && results.length > 0 && (
            <>
              <p className="text-xs text-white/45 mb-4">
                Based on your answers — {results.length} agent{results.length !== 1 ? 's' : ''} match.
              </p>

              <div className="space-y-3">
                {results.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agent/${agent.handle}`}
                    className="block rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 hover:border-emerald-400/30 hover:bg-emerald-400/[0.04] transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {agent.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={agent.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full shrink-0 bg-white/[0.05]"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-white truncate group-hover:text-emerald-300">
                            {agent.display_name || agent.handle}
                          </span>
                          {agent.tier === 'evidence_ranked' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">
                              evidence-ranked
                            </span>
                          )}
                          {agent.archetype && (
                            <span className="text-[10px] text-white/40">{agent.archetype}</span>
                          )}
                        </div>
                        {agent.tagline && (
                          <p className="text-xs text-white/50 mt-1 line-clamp-2">{agent.tagline}</p>
                        )}
                        {agent._rank !== Number.MAX_SAFE_INTEGER && (
                          <p className="text-[10px] font-mono text-white/30 mt-1">
                            rank #{agent._rank} · score {agent._score}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={restart} className="text-xs font-mono text-white/50 hover:text-white border border-white/[0.1] rounded px-3 py-1.5">
                  ← Try different answers
                </button>
                <Link href="/rankings" className="text-xs font-mono text-white/50 hover:text-white border border-white/[0.1] rounded px-3 py-1.5">
                  Browse all rankings →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Slide animations */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </main>
  )
}
