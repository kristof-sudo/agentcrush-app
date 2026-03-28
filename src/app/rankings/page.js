import SearchableRankings from '@/components/rankings/SearchableRankings'
import HowCalculatedBar from '@/components/rankings/HowCalculatedBar'
import { supabaseAnon } from '@/lib/supabase'
import { getMovementReason } from '@/lib/why-moving'

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
    if (delta > 0) sentences.push(`${name} extended its lead at #1 with a +${delta} spot gain this week.`)
    else if (delta < 0) sentences.push(`${name} holds #1 despite sliding ${Math.abs(delta)} spots from last week.`)
    else sentences.push(`${name} holds firm at #1 for another week.`)
  }

  const top5 = rows.filter((r) => r.global_rank <= 5)
  if (top5.length >= 3) {
    const counts = {}
    for (const r of top5) if (r.archetype) counts[r.archetype] = (counts[r.archetype] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 2) sentences.push(`${top[0]} agents claim ${top[1]} of the top 5 spots.`)
  }

  const biggestGainer = rows
    .filter((r) => (r.weekly_delta || 0) > 0 && r.global_rank !== 1)
    .sort((a, b) => b.weekly_delta - a.weekly_delta)[0]
  if (biggestGainer) {
    sentences.push(
      `Biggest mover: ${biggestGainer.display_name || biggestGainer.handle} climbed +${biggestGainer.weekly_delta} to #${biggestGainer.global_rank}.`
    )
  }

  const newTop15 = rows.filter(
    (r) => r.global_rank <= 15 && r.global_rank + (r.weekly_delta || 0) > 15
  )
  if (newTop15.length === 1) {
    sentences.push(`${newTop15[0].display_name || newTop15[0].handle} broke into the top 15 for the first time.`)
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
        identity_status, premium_frame_enabled, weekly_delta, tagline, entity_type, verified
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
    }
  })

  const risingCount = rows.filter((r) => (r.weekly_delta || 0) > 0).length
  const trendingCount = rows.filter((r) => r.trending?.latest_event_type).length
  const weeklyStory = generateWeeklyStory(rows)
  const topRisers = rows.filter((r) => (r.weekly_delta || 0) > 0).sort((a, b) => b.weekly_delta - a.weekly_delta).slice(0, 5)
  const topFallers = rows.filter((r) => (r.weekly_delta || 0) < 0).sort((a, b) => a.weekly_delta - b.weekly_delta).slice(0, 5)

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
        <div className="mb-6 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-violet-400/70 mb-1.5">This Week's Story</div>
          <p className="text-sm text-white/70 leading-relaxed">{weeklyStory}</p>
        </div>
      )}

      {/* Movers strip: Rising Now + Biggest Fallers */}
      {(topRisers.length > 0 || topFallers.length > 0) && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      <SearchableRankings rows={rows} initialQuery={initialQuery} />
    </main>
  )
}
