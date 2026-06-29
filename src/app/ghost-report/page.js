/**
 * /ghost-report — the weekly "famous but dark" artifact.
 *
 * The Ghost Index says HOW MANY agents are dark. The Ghost Report names the
 * most notable ones: top-starred agent repos with no public commit signal in
 * 90+ days. Stars are a historical popularity measure; liveness is a present
 * one. The gap between them is the whole point.
 *
 * Honest framing (credibility): "no recent public signal" is NOT a verdict of
 * abandonment — some repos are stable or complete. We report the signal, not a
 * eulogy. Every number is recomputable from the daily on-chain-anchored snapshot.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export const metadata = {
  title: 'The Ghost Report — famous AI agents that went dark · AgentCrush',
  description:
    'The most-starred AI agent repos with no public commit signal in 90+ days. Stars measure past hype; liveness measures present reality. The gap is the story.',
  alternates: { canonical: 'https://agentcrush.xyz/ghost-report' },
  openGraph: {
    title: 'The Ghost Report — famous AI agents that went dark',
    description: 'Top-starred agent repos, hundreds of thousands of combined stars, no recent commits. Liveness vs hype.',
    url: 'https://agentcrush.xyz/ghost-report',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/api/og?title=The%20Ghost%20Report&kicker=AGENTCRUSH&subtitle=Famous%20agent%20repos%20that%20went%20dark.%20Stars%20are%20history%3B%20liveness%20is%20now.', width: 1200, height: 630, alt: 'The Ghost Report — AgentCrush' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Ghost Report — famous AI agents that went dark',
    description: 'Top-starred agent repos, no recent commits. Liveness vs hype.',
    images: ['https://agentcrush.xyz/api/og?title=The%20Ghost%20Report&kicker=AGENTCRUSH&subtitle=Famous%20agent%20repos%20that%20went%20dark.'],
  },
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const DAY = 86400000
const MIN_STARS = 1000     // "famous" floor
const DARK_DAYS = 90       // ghost window
const LIMIT = 20

async function getGhosts() {
  const sb = db()
  // Pull the most-starred agents, then filter to those gone dark. Liveness is
  // computed the same way as the Ghost Index (freshest public signal vs window).
  const { data, error } = await sb
    .from('agents')
    .select('handle, display_name, github_stars_live, github_pushed_at, last_event_at, activity_status, primary_category, github_url')
    .neq('tier', 'archived')
    .not('github_stars_live', 'is', null)
    .gte('github_stars_live', MIN_STARS)
    .order('github_stars_live', { ascending: false })
    .limit(400)
  if (error || !data) return { ghosts: [], total: 0, combinedStars: 0 }

  const now = Date.now()
  const ghosts = []
  for (const a of data) {
    if (a.activity_status === 'active') continue
    const sig = [a.github_pushed_at, a.last_event_at].map(d => (d ? Date.parse(d) : null)).filter(Boolean)
    const recent = sig.length ? Math.max(...sig) : null
    const days = recent ? Math.floor((now - recent) / DAY) : null
    if (days == null || days <= DARK_DAYS) continue
    ghosts.push({
      handle: a.handle,
      name: a.display_name || a.handle,
      stars: a.github_stars_live,
      days,
      category: a.primary_category,
    })
  }
  const combinedStars = ghosts.reduce((s, g) => s + (g.stars || 0), 0)
  return { ghosts: ghosts.slice(0, LIMIT), total: ghosts.length, combinedStars }
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return String(n)
}

const CATEGORY_COLORS = {
  developer: '#00d4ff', tokenized: '#39ff14', service: '#f0a500',
  model_family: '#a78bfa', mcp_server: '#f97316',
}

export default async function GhostReportPage() {
  let data
  try { data = await getGhosts() } catch (_) { data = { ghosts: [], total: 0, combinedStars: 0 } }
  const { ghosts, total, combinedStars } = data

  return (
    <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/ghost-index" className="hover:text-white/50 transition-colors">Ghost Index</Link>
        <span className="mx-2 text-white/15">/</span>
        The Ghost Report
      </p>

      <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]/80 mb-2">Ghost Report</p>
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        Famous AI agents that went dark
      </h1>
      <p className="mt-3 text-[15px] text-white/60 leading-relaxed max-w-[62ch]">
        GitHub stars measure how much hype an agent <em>once</em> had. Liveness measures whether it&apos;s
        still shipping. These are the most-starred agent repos we index that have shown{' '}
        <span className="text-white/85">no public commit signal in {DARK_DAYS}+ days</span> — past popularity,
        present silence.
      </p>

      {/* Headline stat */}
      {ghosts.length > 0 && (
        <div className="mt-6 rounded-lg border border-[rgba(249,115,22,0.25)] bg-gradient-to-br from-[#f97316]/[0.06] to-transparent px-5 py-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-4xl font-black text-white leading-none tracking-tight">{total}</p>
              <p className="text-[11px] text-white/40 mt-1 font-mono">starred agents (1k★+) gone dark</p>
            </div>
            <div>
              <p className="text-4xl font-black text-[#f97316] leading-none tracking-tight">{fmt(combinedStars)}★</p>
              <p className="text-[11px] text-white/40 mt-1 font-mono">combined GitHub stars — all silent 90d+</p>
            </div>
          </div>
        </div>
      )}

      {/* Ranked list */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-white mb-1">The roll call</h2>
        <p className="text-[13px] text-white/40 mb-4">Top {LIMIT} by stars. Days dark = since the last public commit / event signal we observed.</p>

        <div className="rounded-lg border border-white/[0.07] overflow-hidden">
          {ghosts.map((g, i) => (
            <Link key={g.handle} href={`/agent/${encodeURIComponent(g.handle)}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors">
              <span className="font-mono text-xs text-white/25 w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-white/85 truncate">{g.name}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider shrink-0" style={{ color: CATEGORY_COLORS[g.category] || '#888' }}>{g.category}</span>
                </div>
                <span className="font-mono text-[11px] text-white/30">@{g.handle}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm font-bold text-white tabular-nums">{fmt(g.stars)}★</div>
                <div className="font-mono text-[10px] text-[#f97316]/80 tabular-nums">{g.days}d dark</div>
              </div>
            </Link>
          ))}
        </div>

        {ghosts.length === 0 && (
          <p className="font-mono text-sm text-white/40 py-8 text-center">No qualifying ghosts right now — the data refreshes hourly.</p>
        )}
      </section>

      {/* Honest methodology note */}
      <div className="mt-8 rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4">
        <p className="text-[13px] text-white/50 leading-relaxed">
          <span className="text-white/70 font-semibold">How to read this.</span> &ldquo;Dark&rdquo; means no public
          commit or event signal in {DARK_DAYS}+ days — <span className="text-white/70">not</span> a verdict of
          abandonment. Some repos are stable, complete, or shipping privately. Stars are historical and never
          decay, which is exactly why they make a poor liveness signal on their own. We report the signal; you draw
          the conclusion. Methodology: <Link href="/methodology" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">/methodology</Link>.
        </p>
        <p className="text-[12px] text-white/35 leading-relaxed mt-3">
          Every figure here is recomputable from that day&apos;s index snapshot, which is hashed to a Merkle root and{' '}
          <Link href="/oracle" className="text-white/55 underline decoration-white/20 underline-offset-2 hover:text-white/80">anchored on Base</Link>{' '}
          — a permanent record no one can rewrite.
        </p>
      </div>

      {/* Footer nav */}
      <div className="border-t border-white/[0.06] mt-8 pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
        <Link href="/rankings" className="hover:text-white/70 transition-colors">Rankings →</Link>
        <Link href="/oracle" className="hover:text-white/70 transition-colors">Verify the record →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
      </div>

    </main>
  )
}
