/**
 * /changes — What Changed Today
 *
 * The daily diff of the index: rank movers, new agents, tier promotions,
 * deaths (30-day liveness expired) and resurrections. The CMC-price-ticker
 * equivalent for the agent economy — the reason to come back daily.
 *
 * Data: changes_today_v1 view (7-day window); "today" = last 24h, the rest
 * shown as "earlier this week". RSS at /changes.xml, JSON at /api/changes/v1.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 900

export const metadata = {
  title: 'What Changed Today · AgentCrush',
  description:
    'Daily diff of the AgentCrush index: rank movers, newly indexed agents, tier promotions, agents that went ghost and agents that came back.',
  alternates: {
    canonical: 'https://agentcrush.xyz/changes',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/changes.xml' },
  },
  openGraph: {
    title: 'What Changed Today — AgentCrush',
    description: 'Rank movers, new agents, promotions, deaths and resurrections across the agent economy index.',
    url: 'https://agentcrush.xyz/changes',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const CATEGORY_COLOR = {
  developer: '#00d4ff',
  tokenized: '#39ff14',
  service: '#f0a500',
  model_family: '#a78bfa',
  mcp_server: '#f97316',
}

const SECTIONS = [
  {
    key: 'rank_up',
    title: 'Rank movers — up',
    color: '#39ff14',
    glyph: '▲',
    empty: 'No agent moved up 5+ places.',
  },
  {
    key: 'rank_down',
    title: 'Rank movers — down',
    color: '#f97316',
    glyph: '▼',
    empty: 'No agent moved down 5+ places.',
  },
  {
    key: 'tier_promotion',
    title: 'Promoted to evidence-ranked',
    color: '#e91e80',
    glyph: '★',
    empty: 'No tier promotions.',
  },
  {
    key: 'resurrected',
    title: 'Resurrected',
    color: '#00d4ff',
    glyph: '↻',
    empty: 'No agent came back from ghost status.',
  },
  {
    key: 'died',
    title: 'Went ghost',
    color: '#ffffff',
    glyph: '✝',
    empty: 'No agent crossed the 30-day silence line.',
  },
  {
    key: 'new_agent',
    title: 'Newly indexed',
    color: '#a78bfa',
    glyph: '+',
    empty: 'No new agents indexed.',
  },
]

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function detailLine(row) {
  const d = row.detail || {}
  switch (row.change_type) {
    case 'rank_up':
      return `#${d.rank_from} → #${d.rank_to}`
    case 'rank_down':
      return `#${d.rank_from} → #${d.rank_to}`
    case 'tier_promotion':
      return 'evidence-ranked'
    case 'died':
      return d.last_event_at ? `last signal ${new Date(d.last_event_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'no signal for 30 days'
    case 'resurrected':
      return 'signal after 30+ days quiet'
    case 'new_agent':
      return row.primary_category ? row.primary_category.replace('_', ' ') : 'indexed'
    default:
      return ''
  }
}

function ChangeRow({ row, accent }) {
  const d = row.detail || {}
  const name = row.display_name || row.handle
  const catColor = CATEGORY_COLOR[row.primary_category] || '#ffffff44'
  const isMove = row.change_type === 'rank_up' || row.change_type === 'rank_down'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      {isMove && (
        <span className="font-mono text-xs font-bold tabular-nums w-10 shrink-0" style={{ color: accent }}>
          {row.change_type === 'rank_up' ? `+${d.delta}` : d.delta}
        </span>
      )}
      {!isMove && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />}
      <div className="flex-1 min-w-0">
        <Link
          href={`/agent/${row.handle}`}
          className="font-mono text-sm font-semibold text-white/85 hover:text-white transition-colors truncate block"
        >
          {name}
        </Link>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono text-[10px] text-white/45">{detailLine(row)}</p>
        <p className="font-mono text-[10px] text-white/25 mt-0.5">{timeAgo(row.happened_at)}</p>
      </div>
    </div>
  )
}

function Section({ section, today, earlier }) {
  return (
    <section className="rounded-lg border border-white/[0.07] bg-white/[0.015] px-4 py-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: section.color }}>
          <span className="mr-1.5">{section.glyph}</span>
          {section.title}
        </h2>
        <span className="font-mono text-[10px] text-white/30 tabular-nums">
          {today.length} today{earlier.length > 0 ? ` · ${earlier.length} this week` : ''}
        </span>
      </div>

      {today.length === 0 && earlier.length === 0 && (
        <p className="font-mono text-[11px] text-white/25 py-2">{section.empty}</p>
      )}

      {today.map((row, i) => (
        <ChangeRow key={`t-${row.handle}-${i}`} row={row} accent={section.color} />
      ))}

      {earlier.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer list-none select-none font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors py-1">
            ▸ earlier this week ({earlier.length})
          </summary>
          {earlier.map((row, i) => (
            <ChangeRow key={`e-${row.handle}-${i}`} row={row} accent={section.color} />
          ))}
        </details>
      )}
    </section>
  )
}

export default async function ChangesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  let rows = []
  try {
    const { data } = await supabase
      .from('changes_today_v1')
      .select('change_type, handle, display_name, primary_category, tier, detail, happened_at')
      .order('happened_at', { ascending: false })
      .limit(400)
    rows = data || []
  } catch {
    /* view not applied yet — page renders its empty states */
  }

  const dayAgo = Date.now() - 86400000
  const byType = {}
  for (const s of SECTIONS) byType[s.key] = { today: [], earlier: [] }
  for (const row of rows) {
    const bucket = byType[row.change_type]
    if (!bucket) continue
    if (new Date(row.happened_at).getTime() >= dayAgo) bucket.today.push(row)
    else bucket.earlier.push(row)
  }
  // biggest moves first
  byType.rank_up?.today.sort((a, b) => (b.detail?.delta ?? 0) - (a.detail?.delta ?? 0))
  byType.rank_down?.today.sort((a, b) => (a.detail?.delta ?? 0) - (b.detail?.delta ?? 0))

  const todayTotal = SECTIONS.reduce((n, s) => n + byType[s.key].today.length, 0)

  return (
    <main className="mx-auto max-w-[840px] px-4 md:px-6 py-14">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Daily index diff</p>
        <h1 className="font-mono text-2xl md:text-3xl font-bold text-white mb-2">
          What changed <span style={{ color: '#e91e80' }}>today</span>
        </h1>
        <p className="font-mono text-xs text-white/45 leading-relaxed max-w-xl">
          {todayTotal} change{todayTotal === 1 ? '' : 's'} in the last 24 hours across {`{`}rank moves ≥5 places,
          new agents, tier promotions, deaths, resurrections{`}`}. Recomputed continuously from daily snapshots
          and the event stream.
        </p>
        <div className="flex gap-3 mt-3">
          <a href="/changes.xml" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">RSS</a>
          <a href="/api/changes/v1?days=1" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">JSON API (free)</a>
          <Link href="/ghost-index" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">Ghost Index →</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Section key={s.key} section={s} today={byType[s.key].today} earlier={byType[s.key].earlier} />
        ))}
      </div>

      <footer className="mt-10 border-t border-white/[0.05] pt-4">
        <p className="font-mono text-[10px] text-white/25 leading-relaxed">
          Death = no public signal for 30 days (Ghost Index rule). Resurrection = first signal after 30+ days
          of silence. Rank moves use the global developer-index rank, day over day, noise-gated at 5 places.{' '}
          <Link href="/methodology" className="underline underline-offset-2 hover:text-white/50 transition-colors">Methodology</Link>
        </p>
      </footer>
    </main>
  )
}
