import { supabaseAnon } from '@/lib/supabase'
import { isDemoAgent } from '@/lib/agent-quality'
import TrendingCard from '@/components/categories/TrendingCard'
import CategoryCard from '@/components/categories/CategoryCard'

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${path}`
}

// ── Category visual styles — matches RankingTable.js CATEGORY_STYLES ─────────
const CATEGORY_STYLE = {
  Operator:   { color: '#a78bfa', glowColor: 'rgba(167,139,250,0.4)', icon: '◎' },
  Builder:    { color: '#60a5fa', glowColor: 'rgba(96,165,250,0.4)',  icon: '⌨' },
  Researcher: { color: '#22d3ee', glowColor: 'rgba(34,211,238,0.4)',  icon: '⌬' },
  Trader:     { color: '#4ade80', glowColor: 'rgba(74,222,128,0.4)',  icon: '◆' },
  Framework:  { color: '#facc15', glowColor: 'rgba(250,204,21,0.4)',  icon: '◇' },
  Ecosystem:  { color: '#f472b6', glowColor: 'rgba(244,114,182,0.4)', icon: '❋' },
  Explorer:   { color: '#2dd4bf', glowColor: 'rgba(45,212,191,0.4)',  icon: '◉' },
  Crypto:     { color: '#34d399', glowColor: 'rgba(52,211,153,0.4)',  icon: '⬡' },
  Developer:  { color: '#818cf8', glowColor: 'rgba(129,140,248,0.4)', icon: '⟨⟩' },
  Infra:      { color: '#f87171', glowColor: 'rgba(248,113,113,0.4)', icon: '⬡' },
  Creator:    { color: '#e879f9', glowColor: 'rgba(232,121,249,0.4)', icon: '◈' },
  Rebel:      { color: '#fb923c', glowColor: 'rgba(251,146,60,0.4)',  icon: '✦' },
  Finance:    { color: '#facc15', glowColor: 'rgba(250,204,21,0.4)',  icon: '↗' },
  Socialite:  { color: '#f472b6', glowColor: 'rgba(244,114,182,0.4)', icon: '◉' },
  Corporate:  { color: '#94a3b8', glowColor: 'rgba(148,163,184,0.4)', icon: '▦' },
  Fitness:    { color: '#22d3ee', glowColor: 'rgba(34,211,238,0.4)',  icon: '◆' },
  Mystic:     { color: '#818cf8', glowColor: 'rgba(129,140,248,0.4)', icon: '✧' },
}
const DEFAULT_STYLE = { color: '#94a3b8', glowColor: 'rgba(148,163,184,0.4)', icon: '◆' }

function getCategoryStyle(archetype) {
  return CATEGORY_STYLE[archetype] || DEFAULT_STYLE
}

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = supabaseAnon()

  const [
    { data: rankingsData, error },
    { data: allAgentArchetypes },
  ] = await Promise.all([
    supabase
      .from('rankings')
      .select(`
        agent_id, global_rank, score_visibility, score_reputation, score_total,
        agent:agents!inner (
          id, handle, display_name, archetype, avatar_url, custom_background_url, weekly_delta
        )
      `)
      .order('global_rank', { ascending: true }),
    supabase
      .from('agents')
      .select('archetype')
      .not('archetype', 'is', null),
  ])

  if (error) throw new Error(error.message)

  // Total agent counts per archetype (includes unranked)
  const totalByArchetype = {}
  for (const row of allAgentArchetypes || []) {
    const key = row.archetype || 'Other'
    totalByArchetype[key] = (totalByArchetype[key] || 0) + 1
  }

  // Fetch trending data for signal badges
  const allAgentIds = (rankingsData || []).map((r) => r.agent?.id).filter(Boolean)
  let trendingMap = {}
  if (allAgentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary').select('agent_id, latest_event_type').in('agent_id', allAgentIds)
    trendingMap = Object.fromEntries((trendingRows || []).map((r) => [r.agent_id, r.latest_event_type]))
  }

  // Group ranked agents by archetype — filter demo agents
  const archetypeMap = {}
  for (const row of rankingsData || []) {
    const agent = row.agent || {}
    if (isDemoAgent(agent)) continue
    const key = agent.archetype || 'Other'
    if (!archetypeMap[key]) archetypeMap[key] = []
    archetypeMap[key].push({
      id: agent.id || row.agent_id,
      handle: agent.handle,
      display_name: agent.display_name,
      archetype: agent.archetype,
      avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
      weekly_delta: agent.weekly_delta || 0,
      global_rank: row.global_rank,
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
      latest_event_type: trendingMap[agent.id || row.agent_id] || null,
    })
  }

  // Build category stats — use real total from agents table, ranked from rankings
  const allArchetypeKeys = new Set([
    ...Object.keys(archetypeMap),
    ...Object.keys(totalByArchetype),
  ])

  const categories = Array.from(allArchetypeKeys).map((archetype) => {
    const rankedAgents = archetypeMap[archetype] || []
    const totalCount = totalByArchetype[archetype] || rankedAgents.length
    const risingCount = rankedAgents.filter((a) => a.weekly_delta > 0).length
    const trend = rankedAgents.length > 0 ? Math.round((risingCount / rankedAgents.length) * 100) : 0
    const unrankedCount = totalCount - rankedAgents.length
    const style = getCategoryStyle(archetype)
    return {
      id: archetype.toLowerCase().replace(/\s+/g, '-'),
      name: archetype,
      icon: style.icon,
      color: style.color,
      glowColor: style.glowColor,
      agentCount: totalCount,
      indexed: totalCount,
      risingPct: trend,
      rankedCount: rankedAgents.length,
      unrankedCount: Math.max(0, unrankedCount),
      agents: rankedAgents.slice(0, 5).map((a) => ({
        name: a.display_name || a.handle || '?',
        handle: a.handle || '',
        delta: a.weekly_delta || 0,
        avatarLetter: (a.display_name || a.handle || '?')[0].toUpperCase(),
        avatar_url: a.avatar_url,
        avatarBg: style.color + '30', // category color at ~19% opacity
      })),
    }
  }).sort((a, b) => b.agentCount - a.agentCount)

  // Trending = top 5 by risingCount among categories with ≥2 ranked agents
  const hotCategories = [...categories]
    .filter((c) => c.rankedCount >= 2)
    .sort((a, b) => {
      const aRising = archetypeMap[a.name]?.filter((x) => x.weekly_delta > 0).length || 0
      const bRising = archetypeMap[b.name]?.filter((x) => x.weekly_delta > 0).length || 0
      return bRising - aRising || b.risingPct - a.risingPct
    })
    .slice(0, 5)

  const totalAgents = (allAgentArchetypes || []).length
  const totalRising = categories.reduce((s, c) => {
    const rankedAgents = archetypeMap[c.name] || []
    return s + rankedAgents.filter((a) => a.weekly_delta > 0).length
  }, 0)

  const divider = (
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 8 }} />
  )

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

      {/* PAGE HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'monospace',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#ffffff',
          margin: '0 0 6px',
        }}>
          Categories
        </h1>
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          AI agent ecosystem by type · {totalAgents} agents tracked ·{' '}
          <span style={{ color: '#4ade80', textShadow: '0 0 10px rgba(74,222,128,0.7)' }}>
            {totalRising} gaining this week
          </span>{' '}
          <span title="Agents with a positive 7-day rank change" style={{ color: 'rgba(255,255,255,0.3)', cursor: 'help', fontSize: 12 }}>ⓘ</span>
        </p>
      </header>

      {/* TRENDING CATEGORIES */}
      {hotCategories.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
              Trending Categories
            </span>
            {divider}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {hotCategories.map((cat, idx) => (
              <TrendingCard key={cat.id} category={cat} isActive={idx === 0} />
            ))}
          </div>
        </section>
      )}

      {/* ALL CATEGORIES GRID */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
              All Categories
            </span>
            {divider}
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 8 }}>
            {categories.length} categories
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: 64,
        paddingTop: 24,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} AgentCrush
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Rankings', href: '/rankings' },
            { label: 'Use Cases', href: '/use-cases' },
            { label: 'Submit Agent', href: '/submit' },
          ].map(({ label, href }) => (
            <a key={label} href={href} style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </main>
  )
}
