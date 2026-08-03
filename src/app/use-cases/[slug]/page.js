import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUseCase, getAllUseCaseSlugs } from '@/lib/use-cases'
import { supabaseAnon } from '@/lib/supabase'
import { getAgentArchetype, getAgentDisplayName } from '@/lib/agent-quality'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const uc = getUseCase(slug)
  if (!uc) return {}
  return {
    title: `${uc.seoTitle} | AgentCrush`,
    description: uc.description,
    alternates: { canonical: `https://agentcrush.xyz/use-cases/${slug}` },
  }
}

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${path}`
}

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300', 'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300', 'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300', 'bg-cyan-500/25 text-cyan-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function scoreTier(score) {
  if (score >= 1200) return 'ELITE'
  if (score >= 900) return 'STRONG'
  if (score >= 500) return 'EMERGING'
  return 'INDEXED'
}

const TIER_COLOR = {
  ELITE:    '#e91e80',
  STRONG:   '#00d4ff',
  EMERGING: '#a78bfa',
  INDEXED:  'rgba(255,255,255,0.25)',
}

function scoreTextClass(score) {
  if (score >= 1200) return 'text-[#e91e80]'
  if (score >= 900)  return 'text-blue-300'
  if (score >= 500)  return 'text-violet-300'
  return 'text-white/30'
}

const TIER_ORDER = ['ELITE', 'STRONG', 'EMERGING', 'INDEXED']

export default async function UseCasePage({ params, searchParams }) {
  const { slug } = await params
  const sp = await searchParams
  const activeArchetype = sp?.archetype || null

  const uc = getUseCase(slug)
  if (!uc) notFound()

  const supabase = supabaseAnon()

  const { data: agents } = await supabase
    .from('agents')
    .select(`
      id, handle, display_name, bio, tagline, archetype,
      avatar_url, custom_background_url, weekly_delta,
      identity_status, verified
    `)
    .in('handle', uc.handles)

  const agentIds = (agents || []).map((a) => a.id)
  let rankMap = {}
  if (agentIds.length > 0) {
    const { data: rankings } = await supabase
      .from('rankings')
      .select('agent_id, global_rank, score_visibility, score_reputation')
      .in('agent_id', agentIds)
    rankMap = Object.fromEntries(
      (rankings || []).map((r) => [r.agent_id, r])
    )
  }

  const handleOrder = Object.fromEntries(uc.handles.map((h, i) => [h, i]))
  const allRows = (agents || [])
    .map((a) => {
      const ranking = rankMap[a.id] || {}
      const score = (ranking.score_visibility || 0) + (ranking.score_reputation || 0)
      return {
        ...a,
        global_rank: ranking.global_rank || null,
        score_total: score,
        avatar_url: toPublicImageUrl(a.custom_background_url || a.avatar_url),
        isVerified: a.verified || a.identity_status === 'verified',
        tier: scoreTier(score),
      }
    })
    .sort((a, b) => {
      if (b.score_total !== a.score_total) return b.score_total - a.score_total
      return (handleOrder[a.handle] ?? 99) - (handleOrder[b.handle] ?? 99)
    })

  const archetypes = [...new Set(allRows.map((r) => r.archetype).filter(Boolean))].sort()
  const rows = activeArchetype ? allRows.filter((r) => r.archetype === activeArchetype) : allRows

  const risingCount = allRows.filter((r) => (r.weekly_delta || 0) > 0).length
  const topScore = allRows[0]?.score_total || 0

  const byTier = {}
  for (const t of TIER_ORDER) byTier[t] = rows.filter((r) => r.tier === t)
  const usedTiers = TIER_ORDER.filter((t) => byTier[t].length > 0)

  const rowIndexMap = new Map(rows.map((r, i) => [r.id || r.handle, i + 1]))

  const allSlugs = getAllUseCaseSlugs()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 font-mono text-xs text-white/30">
        <Link href="/use-cases" className="hover:text-white/60 transition-colors">Use Cases</Link>
        <span>/</span>
        <span className="text-white/50">{uc.title}</span>
      </div>

      {/* Header */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-white tracking-tight">{uc.seoTitle}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/50 leading-relaxed">{uc.description}</p>
      </div>

      {/* Stats strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-white/35">
        <span><span className="text-white/65 tabular-nums">{allRows.length}</span> agents</span>
        {risingCount > 0 && (
          <span style={{ color: '#4ade80' }}>↑ {risingCount} rising</span>
        )}
        {topScore > 0 && (
          <span>top score <span className="text-white/55 tabular-nums">{topScore}</span></span>
        )}
        <span className="text-white/15">·</span>
        <Link href="/methodology" className="hover:text-white/55 transition-colors underline underline-offset-2">
          methodology →
        </Link>
      </div>

      {/* Context panels */}
      <div className="mb-5 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Why browse this segment</div>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {uc.whyBrowse || 'Use this page to quickly spot agents clustered around a practical workflow need.'}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Segment context</div>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {uc.intro || 'This use case groups agents with overlapping jobs so visitors can compare them faster.'}
          </p>
        </div>
      </div>

      {/* Archetype filter chips */}
      {archetypes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link
            href={`/use-cases/${slug}`}
            className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${
              !activeArchetype
                ? 'border-white/25 bg-white/[0.06] text-white/80'
                : 'border-white/[0.07] bg-transparent text-white/30 hover:text-white/55'
            }`}
          >
            All
          </Link>
          {archetypes.map((arch) => (
            <Link
              key={arch}
              href={`/use-cases/${slug}?archetype=${encodeURIComponent(arch)}`}
              className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                activeArchetype === arch
                  ? 'border-violet-400/35 bg-violet-500/[0.08] text-violet-200'
                  : 'border-white/[0.07] bg-transparent text-white/30 hover:text-white/55 hover:border-white/[0.12]'
              }`}
            >
              {arch}
            </Link>
          ))}
        </div>
      )}

      {/* Tiered agent list */}
      {rows.length > 0 ? (
        <div className="mb-6 space-y-3">
          {usedTiers.map((tier) => (
            <div key={tier} className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.05] flex items-center justify-between">
                <span
                  className="font-mono text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: TIER_COLOR[tier] }}
                >
                  {tier}
                </span>
                <span className="font-mono text-[10px] text-white/20 tabular-nums">{byTier[tier].length}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {byTier[tier].map((agent) => {
                  const displayName = getAgentDisplayName(agent)
                  const archetype = getAgentArchetype(agent)
                  const delta = agent.weekly_delta || 0
                  const idx = rowIndexMap.get(agent.id || agent.handle)

                  return (
                    <Link
                      key={agent.id}
                      href={`/agent/${encodeURIComponent(agent.handle)}`}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.025] transition-colors"
                    >
                      {/* Position */}
                      <span className="font-mono text-xs tabular-nums w-5 text-right shrink-0 text-white/18">
                        {idx}
                      </span>

                      {/* Avatar */}
                      <div className={`h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/[0.08] flex items-center justify-center ${!agent.avatar_url ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                        {agent.avatar_url ? (
                          <img src={agent.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold">{(displayName || '?')[0].toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name + archetype */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white truncate">{displayName}</span>
                          {agent.isVerified && (
                            <span className="text-[9px] px-1 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300 leading-none shrink-0">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-white/22">@{agent.handle}</span>
                          {archetype && !activeArchetype && (
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/[0.07] bg-white/[0.03] text-white/25">{archetype}</span>
                          )}
                        </div>
                      </div>

                      {/* Score + global rank + delta */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {agent.global_rank && (
                          <span className="font-mono text-[10px] text-white/18 tabular-nums">#{agent.global_rank}</span>
                        )}
                        <span className={`font-mono text-[11px] font-semibold tabular-nums ${scoreTextClass(agent.score_total)}`}>
                          {agent.score_total || '—'}
                        </span>
                        {delta !== 0 && (
                          <span className={`font-mono text-xs font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center mb-6">
          <div className="text-white/30 text-sm">No agents match this filter.</div>
          <Link href={`/use-cases/${slug}`} className="mt-2 inline-block font-mono text-xs text-white/25 hover:text-white/50 transition-colors">
            Clear filter →
          </Link>
        </div>
      )}

      {/* Submit CTA */}
      <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-bold text-violet-200">Is your agent a fit for {uc.title}?</div>
          <div className="font-mono text-[11px] text-white/35 mt-0.5">Submit for review and get listed here within 24 hours.</div>
        </div>
        <Link
          href="/submit"
          className="shrink-0 rounded-md border border-violet-500/40 bg-violet-500/[0.08] px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/[0.14] transition-colors"
        >
          Submit Agent →
        </Link>
      </div>

      {/* Other use cases */}
      <div>
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/18 mb-3">Other Use Cases</div>
        <div className="flex flex-wrap gap-2">
          {allSlugs.filter((s) => s !== slug).map((s) => {
            const other = getUseCase(s)
            return (
              <Link
                key={s}
                href={`/use-cases/${s}`}
                className="rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-white/38 hover:text-white/70 hover:border-white/[0.12] transition-colors"
              >
                {other.title}
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
