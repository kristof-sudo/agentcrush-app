import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Methodology v1 Launch — Findings · AgentCrush Labs',
  description:
    'Structured findings from the AgentCrush 4-category methodology launch (May 2026). Multi-signal inversions, evidence-ready admissions, and what the data reveals that single-source rankings hide.',
  alternates: { canonical: 'https://agentcrush.xyz/labs/findings/methodology-v1-launch' },
  openGraph: {
    title: 'AgentCrush Methodology v1 Launch — Findings',
    description: 'What the agent economy looks like when measured across 5+ signals per category.',
    url: 'https://agentcrush.xyz/labs/findings/methodology-v1-launch',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush Methodology Findings' }],
    type: 'article',
    publishedTime: '2026-05-16T12:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Methodology v1 — Findings',
    description: 'What the agent economy looks like when measured across 5+ signals per category.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

async function fetchData() {
  const supabase = supabaseAnon()
  const out = {}

  // Model families
  const { data: mf } = await supabase
    .from('agent_score_model_family_v1')
    .select('handle, display_name, hf_score, lmarena_score, derivatives_score, citations_score, deployment_score, model_family_score, rank_in_model_family, total_derivatives, total_citations, total_deployments, lmarena_top_arena_score, evidence_ready_for_public_rank, signals_available_count')
    .order('rank_in_model_family', { ascending: true })
  out.model_family = mf || []

  // Tokenized
  const { data: tk } = await supabase
    .from('agent_score_tokenized_v1')
    .select('handle, display_name, virtuals_ticker, market_cap_usd, liquidity_usd, tvl_usd, market_cap_score, liquidity_volume_score, tvl_score, tokenized_score, rank_in_tokenized')
    .order('rank_in_tokenized', { ascending: true })
    .limit(10)
  out.tokenized = tk || []

  // Service
  const { data: svc } = await supabase
    .from('agent_score_service_v1')
    .select('handle, display_name, a2a_stars, a2a_forks, adoption_score, forks_score, service_score, rank_in_service')
    .order('rank_in_service', { ascending: true })
    .limit(10)
  out.service = svc || []

  return out
}

function Stat({ label, value, sub, accent = 'white' }) {
  const accentMap = {
    pink: 'text-pink-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    white: 'text-white',
  }
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accentMap[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-white/45 mt-1">{sub}</p>}
    </div>
  )
}

export default async function MethodologyLaunchFindingsPage() {
  const data = await fetchData()
  const mf = data.model_family
  const tk = data.tokenized
  const svc = data.service

  const erCount = mf.filter(r => r.evidence_ready_for_public_rank).length
    + tk.length + svc.length

  // Compute headline findings
  const topHF        = [...mf].sort((a, b) => (b.hf_score || 0) - (a.hf_score || 0))[0]
  const topLM        = [...mf].filter(r => r.lmarena_score != null).sort((a, b) => (b.lmarena_score || 0) - (a.lmarena_score || 0))[0]
  const topDer       = [...mf].sort((a, b) => (b.total_derivatives || 0) - (a.total_derivatives || 0))[0]
  const topCit       = [...mf].sort((a, b) => (b.total_citations || 0) - (a.total_citations || 0))[0]
  const topDep       = [...mf].sort((a, b) => (b.total_deployments || 0) - (a.total_deployments || 0))[0]
  const topComposite = mf[0]
  const hermes       = mf.find(r => r.handle === 'nousresearch_hermes_agent')
  const topTokenized = tk[0]
  const tibbir       = tk.find(r => r.virtuals_ticker === 'TIBBIR')
  const topService   = svc[0]

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 text-white">

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/labs" className="hover:text-white/50 transition-colors">Labs</Link>
        <span className="mx-2 text-white/15">/</span>
        <Link href="/labs" className="hover:text-white/50 transition-colors">Findings</Link>
        <span className="mx-2 text-white/15">/</span>
        Methodology v1 Launch
      </p>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          AgentCrush Labs · Findings · 2026-05-16
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          What the agent economy looks like across 5+ signals
        </h1>
        <p className="text-base text-white/60 max-w-2xl leading-relaxed">
          On May 16, 2026, AgentCrush shipped four category-specific scoring methodologies. Different agent categories leave different evidence trails, so we measure them differently. This page collects the most striking findings from that launch — the cases where multi-signal scoring produced a different answer than any single source would have given.
        </p>
      </div>

      {/* Top-line stats */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">By the numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Stat label="Total tracked" value="1,338" sub="agents indexed" />
          <Stat label="Evidence-ranked" value={String(erCount)} sub="across 4 categories" accent="emerald" />
          <Stat label="Categories live" value="4" sub="model_family · tokenized · service · developer" accent="violet" />
          <Stat label="MCP tools" value="7" sub="machine-readable methodology" accent="cyan" />
        </div>
      </section>

      {/* THE BIG FINDING */}
      <section className="mb-12 rounded-xl border border-violet-400/25 bg-violet-400/[0.05] px-5 py-5">
        <p className="text-xs font-mono uppercase tracking-widest text-violet-300 mb-2">Finding #1 — headline</p>
        <h2 className="text-2xl font-bold mb-3">Single-source rankings invert under multi-signal scoring</h2>
        <p className="text-sm text-white/70 leading-relaxed mb-4">
          The HuggingFace leader isn&apos;t the LMArena leader. The LMArena leader isn&apos;t the citation leader. The citation leader isn&apos;t the deployment leader. Each signal answers a different question — and when we combine them with documented weights, the resulting ranking is different from any of them taken alone.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="rounded-lg bg-black/40 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/35">HuggingFace #1</p>
            <p className="text-base font-bold text-white mt-1">{topHF?.display_name || '—'}</p>
            <p className="text-[11px] text-white/45 mt-0.5">score {topHF?.hf_score}</p>
          </div>
          <div className="rounded-lg bg-black/40 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/35">LMArena #1</p>
            <p className="text-base font-bold text-white mt-1">{topLM?.display_name || '—'}</p>
            <p className="text-[11px] text-white/45 mt-0.5">BT {topLM?.lmarena_top_arena_score?.toFixed(0) || '—'}</p>
          </div>
          <div className="rounded-lg bg-black/40 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/35">Derivatives #1</p>
            <p className="text-base font-bold text-white mt-1">{topDer?.display_name || '—'}</p>
            <p className="text-[11px] text-white/45 mt-0.5">{topDer?.total_derivatives?.toLocaleString() || 0}</p>
          </div>
          <div className="rounded-lg bg-black/40 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/35">Citations #1</p>
            <p className="text-base font-bold text-white mt-1">{topCit?.display_name || '—'}</p>
            <p className="text-[11px] text-white/45 mt-0.5">{topCit?.total_citations?.toLocaleString() || 0}</p>
          </div>
          <div className="rounded-lg bg-black/40 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/35">Deployments #1</p>
            <p className="text-base font-bold text-white mt-1">{topDep?.display_name || '—'}</p>
            <p className="text-[11px] text-white/45 mt-0.5">{topDep?.total_deployments?.toLocaleString() || 0}</p>
          </div>
        </div>
        <p className="text-sm text-white/75 leading-relaxed mt-4">
          Composite #1 (the agent that maximizes across all 5 weighted signals): <span className="font-semibold text-violet-300">{topComposite?.display_name}</span> at score {topComposite?.model_family_score}.
        </p>
      </section>

      {/* Hermes case */}
      <section className="mb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-violet-300 mb-2">Finding #2 — the admission test</p>
        <h2 className="text-2xl font-bold mb-3">Hermes admitted at #{hermes?.rank_in_model_family || '—'}, ranks last — by design</h2>
        <p className="text-sm text-white/70 leading-relaxed mb-4">
          NousResearch Hermes is a beloved community model. It would top a vibe-based ranking. Our methodology admitted it — and ranked it last among model families.
        </p>
        <p className="text-sm text-white/65 leading-relaxed mb-3">
          The rule is: <span className="text-white/90">3 of 5 signals must be present, AND at least one must be a capability signal</span> (derivatives, LMArena, citations, or cross-protocol deployment). For weeks Hermes had only 2 signals (HuggingFace + a thin derivatives footprint) — not evidence-ready. When we added paper citations and deployment scanning to the methodology, Hermes earned its third signal:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mb-4">
          {[
            { l: 'HuggingFace', v: hermes?.hf_score, ok: true },
            { l: 'LMArena',     v: hermes?.lmarena_score, ok: hermes?.lmarena_score != null },
            { l: 'Derivatives', v: hermes?.derivatives_score, ok: hermes?.derivatives_score != null },
            { l: 'Citations',   v: hermes?.citations_score, ok: hermes?.citations_score != null },
            { l: 'Deployment',  v: hermes?.deployment_score, ok: hermes?.deployment_score != null },
          ].map((s) => (
            <div key={s.l} className={`rounded-lg px-2.5 py-2 ${s.ok ? 'bg-emerald-400/[0.06] border border-emerald-400/15' : 'bg-white/[0.02] border border-white/[0.05]'}`}>
              <p className="text-[9px] font-mono uppercase tracking-wider text-white/40">{s.l}</p>
              <p className={`text-base font-bold ${s.ok ? 'text-emerald-300' : 'text-white/25'}`}>{s.v ?? '—'}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-white/65 leading-relaxed">
          Composite: <span className="font-mono text-white">{hermes?.model_family_score}</span>. Hermes earned admission to the ranking via citations + deployment, but its raw footprint (HF downloads, no LMArena coverage, modest derivatives) keeps it at the back. <span className="text-white/85">This is the methodology working as designed: admit on evidence, rank on weight. No manual override.</span>
        </p>
      </section>

      {/* Tokenized */}
      <section className="mb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-violet-300 mb-2">Finding #3 — the honeypot test</p>
        <h2 className="text-2xl font-bold mb-3">Market cap alone is not a ranking</h2>
        <p className="text-sm text-white/70 leading-relaxed mb-3">
          {tibbir && (<>
            <span className="font-semibold text-pink-300">${tibbir.virtuals_ticker}</span> has the largest USD market cap in the tokenized index (${(tibbir.market_cap_usd / 1_000_000).toFixed(1)}M). It does not rank #1.
          </>)}
        </p>
        <p className="text-sm text-white/65 leading-relaxed mb-3">
          {topTokenized && (<>
            <span className="font-semibold text-pink-300">{topTokenized.display_name === 'aixbt' ? 'aixbt' : topTokenized.virtuals_ticker}</span> does, at composite {topTokenized.tokenized_score}. Why: the methodology weights on-chain liquidity (anti-honeypot), capital locked in token contracts (TVL = real commitment), and holder distribution. A high market cap with thin liquidity gets penalized, not rewarded. AgentCrush surfaced one Virtuals token at $380M market cap with $5K liquidity — exactly the pattern we built the methodology to demote.
          </>)}
        </p>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>Agent</span><span className="text-right">MC</span><span className="text-right">Liq</span><span className="text-right">TVL</span><span className="text-right">Score</span>
          </div>
          {tk.slice(0, 5).map(r => (
            <div key={r.handle} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 items-center border-b border-white/[0.03] last:border-b-0">
              <span className="text-sm font-semibold text-white">{r.display_name || r.handle} {r.virtuals_ticker && <span className="font-mono text-[10px] text-pink-400/80">${r.virtuals_ticker}</span>}</span>
              <span className="text-xs font-mono tabular-nums text-white/55">${(r.market_cap_usd / 1_000_000).toFixed(1)}M</span>
              <span className="text-xs font-mono tabular-nums text-white/55">${r.liquidity_usd != null ? (r.liquidity_usd / 1_000).toFixed(0) + 'K' : '—'}</span>
              <span className="text-xs font-mono tabular-nums text-white/55">${r.tvl_usd != null ? (r.tvl_usd / 1_000).toFixed(0) + 'K' : '—'}</span>
              <span className="text-sm font-mono font-bold tabular-nums text-pink-300">{r.tokenized_score}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Service */}
      <section className="mb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-violet-300 mb-2">Finding #4 — forks beat stars</p>
        <h2 className="text-2xl font-bold mb-3">Active engagement beats passive interest</h2>
        <p className="text-sm text-white/70 leading-relaxed mb-3">
          For service agents (callable endpoints — A2A protocol, Agentverse, x402, ERC-8004), we use forks as a stronger adoption signal than stars. Anyone can star a repo. Forking means you&apos;re going to <em>use</em> or <em>modify</em> it.
        </p>
        <p className="text-sm text-white/65 leading-relaxed mb-3">
          {topService && (<>
            <span className="font-semibold text-cyan-300">{topService.github_full_name || topService.display_name}</span> leads at composite {topService.service_score} on {topService.a2a_stars?.toLocaleString()} stars and <span className="text-white/85">{topService.a2a_forks?.toLocaleString()} forks</span> — a fork ratio that signals real-world deployment, not just bookmarking.
          </>)}
        </p>
      </section>

      {/* Why this matters */}
      <section className="mb-12 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-5">
        <h2 className="text-xl font-bold mb-3">Why this matters</h2>
        <ul className="space-y-3 text-sm text-white/65 leading-relaxed list-disc list-outside pl-5">
          <li>
            <span className="text-white/85">For users:</span> if you&apos;re choosing an agent to deploy, &quot;most-downloaded&quot; tells you what&apos;s popular, not what works. Multi-signal scoring is closer to what works.
          </li>
          <li>
            <span className="text-white/85">For LLMs:</span> when Claude or any model retrieves AgentCrush data via our <Link href="/api/mcp/v1" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">MCP server</Link>, the methodology travels with the answer. The model can call <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">get_methodology(category)</code> and explain ranking decisions accurately to the end user.
          </li>
          <li>
            <span className="text-white/85">For protocols:</span> ERC-8004, x402, A2A, Virtuals, Agentverse — each leaves a different trail. A single universal ranking averages those trails into a meaningless number. Per-category methodology preserves the information.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Read the full methodology</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-4">
          Every weight, every formula, every limitation is published.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/methodology" className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-400 text-violet-950 font-semibold text-sm hover:bg-violet-300 transition-colors">
            Methodology hub →
          </Link>
          <Link href="/rankings/model-families" className="inline-flex items-center px-4 py-2 rounded-lg border border-white/15 hover:bg-white/[0.05] text-sm font-semibold transition-colors">
            Model family rankings →
          </Link>
          <Link href="/developers/mcp" className="inline-flex items-center px-4 py-2 rounded-lg border border-white/15 hover:bg-white/[0.05] text-sm font-semibold transition-colors">
            MCP API →
          </Link>
        </div>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/labs" className="hover:text-white/70 transition-colors">All Labs →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
        <Link href="/blog" className="hover:text-white/70 transition-colors">Blog →</Link>
      </div>

    </main>
  )
}
