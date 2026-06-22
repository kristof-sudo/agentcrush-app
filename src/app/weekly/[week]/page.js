/**
 * Dynamic Weekly Digest page — handles auto-generated weeks (W23 onward).
 *
 * Static pages /weekly/2026-W21 + /weekly/2026-W22 take precedence per Next.js
 * routing — this handler only fires for week IDs that don't have a static page.
 *
 * Data sources:
 *   • DB: agents (counts, tier), agent_snapshots (movers), agent_score_*_v1 (top per category)
 *   • Brain: Agents/weekly-digest/output/W{n}-{year}-ecosystem.md
 *            (2-3 paragraph ecosystem summary written by weekly-digest-generator
 *             Sundays — distilled from the week's Ajsa briefs)
 *
 * Cover image: /weekly/{week}_cover.png if uploaded; else generated gradient.
 *
 * Strategy: brain Decisions/2026-06-06-2x20-min-architecture.md (R-3.1)
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  parseWeekId, formatWeekId, currentIsoWeek,
  formatWeekPeriod, formatWeekPeriodShort, isoWeekStart, isoWeekEnd,
} from '@/lib/iso-week'

export const dynamic = 'force-dynamic'
export const revalidate = 600

export async function generateMetadata({ params }) {
  const { week } = await params
  const parsed = parseWeekId(week)
  if (!parsed) return { title: 'Weekly digest — not found · AgentCrush' }
  const period = formatWeekPeriod(parsed.year, parsed.week)

  // Use the committed weekly cover if it exists; otherwise fall back to the generated
  // /api/og card so the social preview is NEVER the generic site card (which X then
  // caches against this URL). A late/missing cover degrades to an on-brand weekly card.
  let ogImage = { url: `https://agentcrush.xyz/api/og?title=${encodeURIComponent('AgentCrush Weekly')}&kicker=${encodeURIComponent(`W${parsed.week} · ${period}`)}&subtitle=${encodeURIComponent('Where the rankings stand, what shipped, ecosystem signals.')}`, width: 1200, height: 630 }
  try {
    const fsMod = await import('node:fs/promises')
    const pathMod = await import('node:path')
    await fsMod.stat(pathMod.join(process.cwd(), 'public', 'weekly', `W${parsed.week}_cover.png`))
    ogImage = { url: `https://agentcrush.xyz/weekly/W${parsed.week}_cover.png`, width: 1731, height: 909 }
  } catch { /* no committed cover — keep the generated fallback */ }

  return {
    title: `W${parsed.week} · ${period} — AgentCrush Weekly`,
    description: `AgentCrush weekly signal digest for ${week}. Where the rankings stand, what shipped, ecosystem signals.`,
    alternates: { canonical: `https://agentcrush.xyz/weekly/${week}` },
    openGraph: {
      title: `AgentCrush Weekly · W${parsed.week} ${parsed.year}`,
      description: `Weekly signal digest — ${period}.`,
      url: `https://agentcrush.xyz/weekly/${week}`,
      siteName: 'AgentCrush',
      images: [{ ...ogImage, alt: `AgentCrush Weekly — W${parsed.week}, ${period}` }],
      type: 'article',
      publishedTime: isoWeekEnd(parsed.year, parsed.week).toISOString(),
    },
    twitter: { card: 'summary_large_image', title: `AgentCrush Weekly · W${parsed.week}`, description: `Weekly signal digest — ${period}.`, images: [ogImage.url] },
  }
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createClient(url, key)
}

// Render the cover image if the file exists; otherwise a clean placeholder.
// Async server component — checks existence server-side so we never serve a broken img.
async function CoverOrPlaceholder({ coverUrl, weekLabel }) {
  let coverExists = false
  try {
    const fsMod = await import('node:fs/promises')
    const pathMod = await import('node:path')
    const fullPath = pathMod.join(process.cwd(), 'public', coverUrl)
    await fsMod.stat(fullPath)
    coverExists = true
  } catch {
    coverExists = false
  }

  if (coverExists) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`AgentCrush Weekly Digest — ${weekLabel}`}
        width={1731}
        height={909}
        className="w-full rounded-xl border border-white/[0.08] mb-8"
      />
    )
  }

  return (
    <div className="w-full mb-8 rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-600/15 via-cyan-500/8 to-violet-900/20 aspect-[1731/909] flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-xs uppercase tracking-widest font-mono text-white/40 mb-2">AgentCrush Weekly</p>
        <p className="text-2xl font-bold text-white/85 tracking-tight">{weekLabel}</p>
        <p className="text-[11px] font-mono text-white/30 mt-3">Cover image pending</p>
      </div>
    </div>
  )
}

async function readEcosystemSummary(weekId) {
  // Read from Supabase weekly_digest_sections — written by the
  // weekly-digest-generator worker on Sundays.
  try {
    const supabase = db()
    const { data } = await supabase
      .from('weekly_digest_sections')
      .select('ecosystem_section, briefs_included')
      .eq('week_id', weekId)
      .maybeSingle()
    if (!data) return null
    return data.ecosystem_section
  } catch {
    // Table may not be migrated yet — degrade gracefully
    return null
  }
}

async function gather(weekId, parsed) {
  const supabase = db()

  // Current top-of-rankings for each category
  const top = {}
  const tryView = async (view, scoreCol, rankCol) => {
    try {
      const { data } = await supabase
        .from(view)
        .select(`handle, display_name, ${scoreCol}, ${rankCol}`)
        .order(rankCol, { ascending: true })
        .limit(1)
      if (data && data[0]) return { handle: data[0].handle, name: data[0].display_name || data[0].handle, score: data[0][scoreCol] }
    } catch { /* view missing */ }
    return null
  }
  top.model_family = await tryView('agent_score_model_family_v1', 'model_family_score', 'rank_in_model_family')
  top.tokenized    = await tryView('agent_score_tokenized_v1',    'tokenized_score',    'rank_in_tokenized')
  top.service      = await tryView('agent_score_service_v1',      'service_score',      'rank_in_service')

  // Counts
  const { count: total }      = await supabase.from('agents').select('id', { count: 'exact', head: true })
  const { count: erTotal }    = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'evidence_ranked')

  // Top movers (positive + negative) — using weekly_delta as the seed (computed nightly)
  const { data: topUp } = await supabase
    .from('agents')
    .select('handle, display_name, weekly_delta, tier, primary_category')
    .not('weekly_delta', 'is', null)
    .gt('weekly_delta', 0)
    .order('weekly_delta', { ascending: false })
    .limit(5)
  const { data: topDown } = await supabase
    .from('agents')
    .select('handle, display_name, weekly_delta, tier, primary_category')
    .not('weekly_delta', 'is', null)
    .lt('weekly_delta', 0)
    .order('weekly_delta', { ascending: true })
    .limit(5)

  // Snapshots written in the window (proxy for pipeline health)
  const { start, end } = { start: isoWeekStart(parsed.year, parsed.week).toISOString().slice(0, 10), end: isoWeekEnd(parsed.year, parsed.week).toISOString().slice(0, 10) }
  const { count: snapshotsWeek } = await supabase
    .from('agent_snapshots')
    .select('id', { count: 'exact', head: true })
    .gte('snapshot_date', start)
    .lte('snapshot_date', end)

  // Revenue stats — service-role required; degrade gracefully to 0 if unavailable
  let x402Calls = 0
  let proSubscribers = 0
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const sdb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)
      const { data: paid } = await sdb
        .from('api_telemetry_daily')
        .select('count')
        .eq('outcome', 'paid_pass')
        .gte('day', start)
        .lte('day', end)
      if (paid) x402Calls = paid.reduce((s, r) => s + (r.count || 0), 0)
      const { count: proCount } = await sdb
        .from('api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('plan', 'pro')
      proSubscribers = proCount || 0
    }
  } catch { /* tables not yet applied or service key absent — show 0 */ }

  const ecosystem = await readEcosystemSummary(weekId)
  return { top, total: total || 0, evidenceRanked: erTotal || 0, topUp: topUp || [], topDown: topDown || [], snapshotsWeek: snapshotsWeek || 0, ecosystem, x402Calls, proSubscribers }
}

export default async function WeeklyDynamicPage({ params }) {
  const { week } = await params
  const parsed = parseWeekId(week)
  if (!parsed) notFound()

  // Don't render future weeks
  const today = currentIsoWeek()
  const reqIdx = parsed.year * 100 + parsed.week
  const nowIdx = today.year * 100 + today.week
  if (reqIdx > nowIdx) notFound()

  const data = await gather(week, parsed)
  const periodFull = formatWeekPeriod(parsed.year, parsed.week)
  const periodShort = formatWeekPeriodShort(parsed.year, parsed.week)
  const coverUrl = `/weekly/W${parsed.week}_cover.png`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `AgentCrush Weekly W${parsed.week} · ${periodFull}`,
    description: `Weekly signal digest: rankings, movers, ecosystem signals.`,
    url: `https://agentcrush.xyz/weekly/${week}`,
    image: `https://agentcrush.xyz${coverUrl}`,
    datePublished: isoWeekEnd(parsed.year, parsed.week).toISOString(),
    author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W{parsed.week} · {periodShort}
        </p>

        {/* Cover — Kris manually uploads /weekly/W{n}_cover.png per week.
            If not yet uploaded, render a clean placeholder card instead of a
            broken image. Once uploaded, page refreshes show the real cover. */}
        <CoverOrPlaceholder coverUrl={coverUrl} weekLabel={`W${parsed.week} · ${periodFull}`} />

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Weekly Digest · auto-generated</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">W{parsed.week} · {periodFull}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Generated {new Date().toISOString().slice(0, 10)}</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
          <span className="text-white/15">·</span>
          <Link href={`/weekly/${week}/json`} className="text-violet-400/50 hover:text-violet-300 transition-colors">JSON</Link>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Ecosystem this week */}
        {data.ecosystem && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Ecosystem this week</h2>
            <div className="space-y-4 text-[15px] text-white/65 leading-[1.75] whitespace-pre-line">
              {data.ecosystem}
            </div>
            <p className="text-[11px] text-white/25 mt-4 leading-relaxed italic">
              Distilled from {7} Ajsa daily briefs covering AI Twitter + Farcaster activity {periodShort}.
            </p>
          </section>
        )}
        {!data.ecosystem && (
          <section className="mb-10 rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Ecosystem this week</p>
            <p className="text-sm text-white/55 leading-relaxed">
              Ecosystem distillation lands once weekly-digest-generator runs (Sundays 19:00 UTC). Subscribe to <a href="/weekly.xml" className="text-[#00d4ff]/80 hover:text-[#00d4ff]">RSS</a> for notifications.
            </p>
          </section>
        )}

        {/* Where the rankings stand */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Where the rankings stand</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'model_family', label: 'Model Families', color: '#a78bfa', href: '/rankings/model-families' },
              { key: 'tokenized',    label: 'Tokenized',      color: '#39ff14', href: '/rankings/tokenized-agents' },
              { key: 'service',      label: 'Service',        color: '#f0a500', href: '/rankings/service-agents' },
            ].map(({ key, label, color, href }) => {
              const t = data.top[key]
              return (
                <Link key={key} href={href}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                      style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
                  <p className="text-xs font-mono font-semibold mb-1" style={{ color }}>{label}</p>
                  <p className="text-sm text-white/75">
                    {t ? <>{t.name}<span className="text-white/85 font-mono font-semibold"> · {t.score}</span></> : '—'}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Top movers — Up only (Down hidden when there's no negative movement) */}
        {data.topUp.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Top movers</h2>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02]">
              <p className="px-4 pt-3 text-[11px] uppercase tracking-wider font-mono text-[#39ff14]/70">Up</p>
              <div className="divide-y divide-white/[0.04]">
                {data.topUp.map(({ handle, display_name, weekly_delta }) => (
                  <Link key={handle} href={`/agent/${encodeURIComponent(handle)}`} className="block px-4 py-2 flex items-center justify-between gap-3 text-sm hover:bg-white/[0.02] transition-colors">
                    <span className="text-white/85">{display_name || handle}</span>
                    <span className="font-mono font-semibold text-[#39ff14]">↑{weekly_delta}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/blog" className="hover:text-white/70 transition-colors">Blog →</Link>
          <Link href="/agent-economy-index" className="hover:text-white/70 transition-colors">Economy index →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
