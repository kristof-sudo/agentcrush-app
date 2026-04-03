import SearchableRankings from '@/components/rankings/SearchableRankings'
import HowCalculatedBar from '@/components/rankings/HowCalculatedBar'
import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import { getMovementReason } from '@/lib/why-moving'

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

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'
  return `${base}/storage/v1/object/public/${path}`
}

function generateWeeklyStory(rows) {
  if (!rows.length) return null
  const sentences = []

  const leader = rows.find((r) => r.global_rank === 1)
  if (leader) {
    const delta = leader.weekly_delta || 0
    const name = leader.display_name || leader.handle
    if (delta > 0) sentences.push(`${name} extended its lead at #1, gaining +${delta} spot${delta !== 1 ? 's' : ''} this week.`)
    else if (delta < 0) sentences.push(`${name} holds #1 despite slipping ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? 's' : ''} from last week.`)
    else sentences.push(`${name} holds firm at #1.`)
  }

  const top5 = rows.filter((r) => r.global_rank <= 5)
  if (top5.length >= 3) {
    const counts = {}
    for (const r of top5) if (r.archetype) counts[r.archetype] = (counts[r.archetype] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 2) sentences.push(`${top[0]}-class agents hold ${top[1]} of the top 5 spots.`)
  }

  const biggestGainer = rows
    .filter((r) => (r.weekly_delta || 0) > 0 && r.global_rank !== 1)
    .sort((a, b) => b.weekly_delta - a.weekly_delta)[0]
  if (biggestGainer) {
    const reason = biggestGainer.rank_move_reason
    const base = `${biggestGainer.display_name || biggestGainer.handle} climbed +${biggestGainer.weekly_delta} to #${biggestGainer.global_rank}`
    sentences.push(reason ? `${base} — ${reason.replace(/^Rose \d+ spots? — /, '')}.` : `${base}.`)
  }

  const newTop15 = rows.filter(
    (r) => r.global_rank <= 15 && r.global_rank + (r.weekly_delta || 0) > 15
  )
  if (newTop15.length === 1) {
    sentences.push(`${newTop15[0].display_name || newTop15[0].handle} entered the top 15 this week.`)
  } else if (newTop15.length > 1) {
    sentences.push(`${newTop15.length} agents broke into the top 15 this week.`)
  }

  return sentences.slice(0, 4).join(' ') || null
}

export const dynamic = 'force-dynamic'

export default async function RankingsPage({ searchParams }) {
  const initialQuery = (await searchParams)?.q || ''
  const supabase = supabaseAnon()

  const { data: rankingsData, error: rankingsError } = await supabase
    .from('rankings')
    .select(`
      agent_id, global_rank, score_visibility, score_reputation, score_total,
      agent:agents!inner (
        id, handle, display_name, bio, archetype, avatar_url, custom_background_url,
        identity_status, premium_frame_enabled, weekly_delta, tagline, entity_type, verified,
        github_url, website_url
      )
    `)
    .order('global_rank', { ascending: true })

  if (rankingsError) throw new Error(rankingsError.message)

  const agentIds = (rankingsData || []).map((row) => row.agent?.id).filter(Boolean)
  let trendingByAgentId = {}
  if (agentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary').select('*').in('agent_id', agentIds)
    trendingByAgentId = Object.fromEntries((trendingRows || []).map((row) => [row.agent_id, row]))
  }

  const rows = (rankingsData || []).map((row) => {
    const agent = row.agent || {}
    const trending = trendingByAgentId[agent.id] || null
    return {
      id: agent.id || row.agent_id,
      agent_id: row.agent_id,
      global_rank: row.global_rank,
      visibility_score: row.score_visibility,
      reputation_score: row.score_reputation,
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
      handle: agent.handle,
      display_name: agent.display_name,
      bio: agent.bio,
      archetype: agent.archetype,
      avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
      weekly_delta: agent.weekly_delta,
      tagline: agent.tagline,
      trending,
      rank_move_reason: getMovementReason(agent.weekly_delta, trending?.latest_event_type),
      verified: agent.verified || agent.identity_status === 'verified',
      external_url: agent.website_url || agent.github_url || null,
    }
  })

  const scoredRows = rows.filter((r) => (r.score_total || 0) > 0)
  const unscoredRows = rows
    .filter((r) => (r.score_total || 0) === 0)
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 48)
  const risingCount = scoredRows.filter((r) => (r.weekly_delta || 0) > 0).length
  const trendingCount = scoredRows.filter((r) => r.trending?.latest_event_type).length
  const weeklyStory = generateWeeklyStory(scoredRows)
  const topRisers = scoredRows.filter((r) => (r.weekly_delta || 0) > 0).sort((a, b) => b.weekly_delta - a.weekly_delta).slice(0, 5)
  const topFallers = scoredRows.filter((r) => (r.weekly_delta || 0) < 0).sort((a, b) => a.weekly_delta - b.weekly_delta).slice(0, 5)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-white/45">
          Live ecosystem standings · {scoredRows.length} agents ranked ·{' '}
          <span className="text-emerald-400">{risingCount} rising</span> ·{' '}
          <span className="text-violet-400">{trendingCount} trending</span>
        </p>
      </div>

      {/* This Week's Story */}
      {weeklyStory && (
        <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-violet-400/70 mb-1.5">This Week&apos;s Story</div>
          <p className="text-sm text-white/70 leading-relaxed">{weeklyStory}</p>
        </div>
      )}

      <HowCalculatedBar />

      {/* Movers strip: Rising Now + Biggest Fallers */}
      {(topRisers.length > 0 || topFallers.length > 0) && (
        <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topRisers.length > 0 && (
            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-emerald-400/60 mb-2">↑ Rising Now</div>
              <div className="space-y-1.5">
                {topRisers.map((r) => (
                  <div key={r.handle} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-white/25 tabular-nums w-4 text-right shrink-0">#{r.global_rank}</span>
                      <span className="text-[11px] text-white/70 truncate">{r.display_name || r.handle}</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 tabular-nums shrink-0">+{r.weekly_delta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topFallers.length > 0 && (
            <div className="rounded-lg border border-red-500/15 bg-red-500/[0.04] px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-red-400/60 mb-2">↓ Biggest Fallers</div>
              <div className="space-y-1.5">
                {topFallers.map((r) => (
                  <div key={r.handle} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-white/25 tabular-nums w-4 text-right shrink-0">#{r.global_rank}</span>
                      <span className="text-[11px] text-white/70 truncate">{r.display_name || r.handle}</span>
                    </div>
                    <span className="text-[11px] font-bold text-red-400 tabular-nums shrink-0">{r.weekly_delta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SearchableRankings rows={scoredRows} initialQuery={initialQuery} />

      {unscoredRows.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Newly Indexed</h2>
              <p className="text-[11px] text-white/35">In the index — not yet ranked. Signal data is being gathered.</p>
            </div>
            <span className="ml-auto text-[11px] text-white/25 tabular-nums shrink-0">{unscoredRows.length} shown</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {unscoredRows.map((r) => {
              const displayName = r.display_name || r.handle || '?'
              return (
                <Link
                  key={r.id}
                  href={`/agent/${encodeURIComponent(r.handle)}`}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 hover:bg-white/[0.04] transition-colors min-w-0"
                >
                  <div className={`h-6 w-6 shrink-0 rounded overflow-hidden flex items-center justify-center border border-white/[0.07] ${avatarColor(r.handle)}`}>
                    <span className="text-[9px] font-bold">{displayName[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-white/75 truncate">{displayName}</div>
                    <div className="flex items-center gap-1.5">
                      {r.archetype && (
                        <span className="text-[9px] text-white/30 truncate">{r.archetype}</span>
                      )}
                    </div>
                  </div>
                  {r.external_url ? (
                    <a
                      href={r.external_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="text-white/20 hover:text-white/55 transition-colors shrink-0"
                      aria-label="View source"
                    >
                      <svg width="10" height="10" viewBox="0 0 11 11" fill="none"><path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </a>
                  ) : null}
                </Link>
              )
            })}
          </div>
          {rows.filter(r => (r.score_total || 0) === 0).length > 48 && (
            <p className="mt-3 text-[11px] text-white/25">
              +{rows.filter(r => (r.score_total || 0) === 0).length - 48} more in the index —{' '}
              <Link href="/categories" className="text-white/35 hover:text-white/55 transition-colors underline underline-offset-2">browse by category</Link>
            </p>
          )}
        </section>
      )}
    </main>
  )
}
