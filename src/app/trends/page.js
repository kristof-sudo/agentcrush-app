import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10 min

export const metadata = {
  title: 'Trends — agent ecosystem dashboard · AgentCrush',
  description: 'Time-series visualizations of the agent economy. Indexed agents, evidence-ranked, category mix, top weekly movers — computed from 16K+ daily snapshots.',
  alternates: { canonical: 'https://agentcrush.xyz/trends' },
  openGraph: {
    title: 'AgentCrush · Ecosystem Trends',
    description: 'Daily snapshots of the agent economy. Indexed, ranked, moving.',
    url: 'https://agentcrush.xyz/trends',
    siteName: 'AgentCrush',
    type: 'article',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'AgentCrush Ecosystem Trends',
  description: 'Time-series of indexed agent counts, evidence-ranked counts, category mix, and weekly movers from the AgentCrush index.',
  url: 'https://agentcrush.xyz/trends',
  creator: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  license: 'https://creativecommons.org/licenses/by/4.0/',
  distribution: [
    { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://agentcrush.xyz/api/trends/summary' },
  ],
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createClient(url, key)
}

async function gatherData() {
  const supabase = db()

  // Daily snapshot counts
  const { data: dailyRaw } = await supabase
    .from('agent_snapshots')
    .select('snapshot_date')
    .gte('snapshot_date', new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true })

  const daily = {}
  for (const r of (dailyRaw || [])) {
    daily[r.snapshot_date] = (daily[r.snapshot_date] || 0) + 1
  }

  // Total agents + evidence_ranked breakdown
  const { count: totalAgents } = await supabase.from('agents').select('id', { count: 'exact', head: true })
  const { count: evidenceRanked } = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'evidence_ranked')
  const { count: indexed }       = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'indexed')
  const { count: archived }      = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'archived')

  // Category mix
  const cats = ['model_family', 'tokenized', 'service', 'developer']
  const categoryMix = {}
  for (const c of cats) {
    const { count } = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('primary_category', c)
    categoryMix[c] = count || 0
  }

  // Top weekly movers (positive)
  const { data: topUp } = await supabase
    .from('agents')
    .select('handle, display_name, weekly_delta, tier')
    .not('weekly_delta', 'is', null)
    .order('weekly_delta', { ascending: false })
    .limit(8)

  const { data: topDown } = await supabase
    .from('agents')
    .select('handle, display_name, weekly_delta, tier')
    .not('weekly_delta', 'is', null)
    .order('weekly_delta', { ascending: true })
    .limit(8)

  return {
    daily,
    totals: { total: totalAgents || 0, evidenceRanked: evidenceRanked || 0, indexed: indexed || 0, archived: archived || 0 },
    categoryMix,
    topUp: topUp || [],
    topDown: topDown || [],
  }
}

function sparkline(values, width = 600, height = 60, color = '#a78bfa') {
  if (!values.length) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 4) - 2).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function bar(category, count, max, color) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div key={category} className="grid grid-cols-12 gap-3 items-center text-sm">
      <span className="col-span-3 text-white/65 font-mono text-xs">{category}</span>
      <div className="col-span-7 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="col-span-2 text-right text-white/75 font-mono text-xs">{count.toLocaleString()}</span>
    </div>
  )
}

export default async function TrendsPage() {
  const data = await gatherData()
  const dates = Object.keys(data.daily).sort()
  const counts = dates.map(d => data.daily[d])
  const maxCat = Math.max(...Object.values(data.categoryMix), 1)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Live dashboard</p>
        <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">Ecosystem Trends</h1>
        <p className="mt-3 text-[15px] text-white/55 leading-relaxed max-w-[60ch]">
          Daily snapshots of the agent economy. Where the index is heading, who&apos;s moving, what&apos;s consolidating.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono">
          <a href="/api/trends/summary" className="text-[#00d4ff]/70 hover:text-[#00d4ff] border border-[#00d4ff]/20 rounded px-3 py-1.5">JSON →</a>
          <Link href="/methodology" className="text-violet-400/70 hover:text-violet-300 border border-violet-400/20 rounded px-3 py-1.5">Methodology →</Link>
        </div>

        <hr className="my-10 border-white/[0.06]" />

        {/* Headline numbers */}
        <section className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Agents indexed', value: data.totals.total.toLocaleString() },
            { label: 'Evidence-ranked', value: data.totals.evidenceRanked.toLocaleString() },
            { label: 'Indexed (other)', value: data.totals.indexed.toLocaleString() },
            { label: 'Daily snapshots', value: counts.reduce((a, b) => a + b, 0).toLocaleString() + ' / 30d' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded border border-white/[0.06] px-3 py-2.5">
              <p className="text-lg font-bold font-mono text-white">{value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
            </div>
          ))}
        </section>

        {/* Snapshots over time */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Daily snapshot volume (30d)</h2>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
            {sparkline(counts)}
            <div className="flex justify-between text-[10px] font-mono text-white/30 mt-2">
              <span>{dates[0]}</span>
              <span>{dates[dates.length - 1]}</span>
            </div>
          </div>
          <p className="text-[11px] text-white/30 mt-2 leading-relaxed">
            Target: 1,000 rows / night. Drops indicate fetcher issues. Source:{' '}
            <span className="font-mono">agent_snapshots</span> nightly write at 02:00 UTC.
          </p>
        </section>

        {/* Category mix */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Category mix (current)</h2>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 space-y-2.5">
            {bar('model_family', data.categoryMix.model_family, maxCat, '#a78bfa')}
            {bar('tokenized',    data.categoryMix.tokenized,    maxCat, '#39ff14')}
            {bar('service',      data.categoryMix.service,      maxCat, '#f0a500')}
            {bar('developer',    data.categoryMix.developer,    maxCat, '#00d4ff')}
          </div>
        </section>

        {/* Top movers up */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Top weekly movers — up</h2>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06]">
            {data.topUp.length === 0 && (
              <p className="px-4 py-4 text-sm text-white/40">No movers yet — weekly_delta starts populating from 2026-06-02 onwards.</p>
            )}
            {data.topUp.map(({ handle, display_name, weekly_delta, tier }) => (
              <div key={handle} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <Link href={`/agent/${encodeURIComponent(handle)}`} className="text-white/85 hover:text-[#00d4ff] transition-colors">
                  {display_name || handle}
                </Link>
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{tier?.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-semibold text-[#39ff14]">↑{weekly_delta}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top movers down */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Top weekly movers — down</h2>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.06]">
            {data.topDown.length === 0 && (
              <p className="px-4 py-4 text-sm text-white/40">No movers down this week.</p>
            )}
            {data.topDown.filter(d => d.weekly_delta < 0).map(({ handle, display_name, weekly_delta, tier }) => (
              <div key={handle} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <Link href={`/agent/${encodeURIComponent(handle)}`} className="text-white/85 hover:text-[#00d4ff] transition-colors">
                  {display_name || handle}
                </Link>
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{tier?.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-semibold text-[#ef4444]">↓{Math.abs(weekly_delta)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* For LLMs */}
        <section className="mb-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            Machine-readable: <span className="font-mono">https://agentcrush.xyz/api/trends/summary</span>.
            Returns the same headline numbers + category mix + top-movers list as JSON with full attribution and citation strings.
            Source dataset: <span className="font-mono">agent_snapshots</span> — 1,000 rows/night, nightly run at 02:00 UTC.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/weekly" className="hover:text-white/70 transition-colors">Weekly Digest →</Link>
          <a href="/api/trends/summary" className="hover:text-white/70 transition-colors">JSON →</a>
        </div>

      </main>
    </>
  )
}
