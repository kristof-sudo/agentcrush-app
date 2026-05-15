import Container from '@/components/ui/Container'
import AgentCard from '@/components/agents/AgentCard'
import SectorTabsAndTable from '@/components/home/SectorTabsAndTable'
import AgentIntelBar from '@/components/home/AgentIntelBar'
import HeroSection from '@/components/home/HeroSection'
import IntelTicker from '@/components/home/IntelTicker'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { getSignalTag, getEventIcon, getMovementReason, formatRelativeTime } from '@/lib/why-moving'

// ── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300',
  'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300',
  'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300',
  'bg-cyan-500/25 text-cyan-300',
  'bg-rose-500/25 text-rose-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < handle.length; i++) hash = (hash * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${path}`
}

// Signal type → dot color + label
const SIGNAL_TYPE_STYLE = {
  audience_spike:        { dot: '#e91e80', label: 'Audience Spike' },
  ranking_jump:          { dot: '#39ff14', label: 'Rank Jump' },
  launch_buzz:           { dot: '#00d4ff', label: 'Launch Buzz' },
  new_collab:            { dot: '#f0a500', label: 'New Collab' },
  ecosystem_mention:     { dot: '#a78bfa', label: 'Eco Mention' },
  fresh_activity:        { dot: '#4ade80', label: 'Active' },
  joined:                { dot: '#fb923c', label: 'Just Joined' },
  repo_star_growth:      { dot: '#4ade80', label: 'star growth' },
  repo_release:          { dot: '#e91e80', label: 'new release' },
  timeline_ping:         { dot: '#a78bfa', label: 'Eco Mention' },
  collab_win:            { dot: '#f0a500', label: 'New Collab' },
  daily_boost:           { dot: '#4ade80', label: 'Active' },
  canon_scene:           { dot: '#a78bfa', label: 'Milestone' },
  ecosystem_integration: { dot: '#00d4ff', label: 'Integration' },
  dev_activity:          { dot: '#60a5fa', label: 'dev activity' },
  agent_joined:          { dot: '#fb923c', label: 'Just Joined' },
}

function getSignalStyle(eventType) {
  return SIGNAL_TYPE_STYLE[eventType] || { dot: '#94a3b8', label: 'Activity' }
}

function formatEventSummary(event) {
  const meta = event?.metadata || {}
  const readNum = (...keys) => { for (const k of keys) { const v = Number(meta[k]); if (!isNaN(v) && v > 0) return v } return null }
  const readText = (...keys) => { for (const k of keys) { if (typeof meta[k] === 'string' && meta[k].trim()) return meta[k].trim() } return null }
  const stars = readNum('stars_gained', 'star_gain', 'stars', 'github_stars')
  const mentions = readNum('mention_count', 'mentions', 'post_count', 'x_posts')
  const rankJump = readNum('rank_jump', 'positions_gained', 'rank_delta')
  const releaseName = readText('release_name', 'version', 'tag_name')
  const integrationName = readText('integration_name', 'partner', 'framework', 'platform')
  switch (event?.event_type) {
    case 'repo_star_growth': return stars ? `+${stars} GitHub stars` : 'GitHub stars growing'
    case 'repo_release': return releaseName ? `released ${releaseName}` : 'new release'
    case 'audience_spike': return mentions ? `${mentions} X mentions` : 'audience spike'
    case 'ranking_jump': return rankJump ? `climbed ${rankJump} spots` : 'ranking jump'
    case 'timeline_ping': return mentions ? `${mentions} mentions` : 'ecosystem mention'
    case 'launch_buzz': return mentions ? `${mentions} launch mentions` : 'launch buzz'
    case 'collab_win': return integrationName ? `collab w/ ${integrationName}` : 'new collab'
    case 'daily_boost': return 'fresh activity'
    case 'canon_scene': return 'ecosystem milestone'
    case 'ecosystem_integration': return integrationName ? `integrated ${integrationName}` : 'new integration'
    case 'dev_activity': return 'dev activity'
    default: return 'activity'
  }
}

function dedupeRows(rows = [], limit = 20) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = `${row.handle}|${row.event_type}|${String(row.created_at).slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}

function getIndexedFreshnessMeta(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return null
  const diffHours = (Date.now() - ts) / 3600000
  if (diffHours <= 96) {
    return {
      label: `${formatRelativeTime(value)} · latest`,
      isStale: false,
    }
  }
  return {
    label: `Latest added ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))}`,
    isStale: true,
  }
}

function buildContentFeed(signalRows = [], newAgents = [], maxItems = 24) {
  const feed = [...signalRows]
  const toPublic = (path) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    return base ? `${base}/storage/v1/object/public/${path}` : null
  }
  for (const a of newAgents) {
    if (!a.created_at) continue
    const agentInFeed = feed.some(
      (r) => r.handle === a.handle &&
        Math.abs(new Date(r.created_at) - new Date(a.created_at)) < 3600_000
    )
    if (!agentInFeed) {
      feed.push({
        id: `join-${a.id}`,
        created_at: a.created_at,
        event_type: 'agent_joined',
        event_label: 'joined the index',
        handle: a.handle,
        display_name: a.display_name || a.handle,
        avatar_url: toPublic(a.custom_background_url || a.avatar_url),
        synthetic: true,
      })
    }
  }
  feed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return feed.slice(0, maxItems)
}

async function safeCount(supabase, table, filterFn) {
  try {
    const q = filterFn(supabase.from(table).select('id', { count: 'exact', head: true }))
    const { count, error } = await q
    return error ? 0 : (count || 0)
  } catch {
    return 0
  }
}

// ── Corner accent decoration ───────────────────────────────────────────────
function CornerAccent() {
  return (
    <>
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(233,30,128,0.4)]" />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(233,30,128,0.4)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(233,30,128,0.4)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(233,30,128,0.4)]" />
    </>
  )
}

function FollowEcosystemPanel({ className = '' }) {
  return (
    <section className={className}>
      <div className="relative rounded-lg border border-white/[0.05] bg-[#0a0a14] px-4 py-4 overflow-hidden">
        <CornerAccent />
        <h2 className="font-mono text-sm font-bold text-white">Follow the ecosystem</h2>
        <p className="font-mono mt-1 max-w-xl text-[11px] text-white/35">
          Track the AI agent ecosystem — rank moves, new launches, and signal intelligence.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="https://warpcast.com/agentcrush" target="_blank" rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/60 hover:text-white hover:border-white/[0.15] transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24.24H5.76C2.5789.24 0 2.8188 0 6v12c0 3.1811 2.5789 5.76 5.76 5.76h12.48c3.1812 0 5.76-2.5789 5.76-5.76V6C24 2.8188 21.4212.24 18.24.24m.8155 17.1662v.504c.2868-.0256.5458.1905.5439.479v.5688h-5.1437v-.5688c-.0019-.2885.2576-.5047.5443-.479v-.504c0-.22.1525-.402.358-.458l-.0095-4.3645c-.1589-1.7366-1.6402-3.0979-3.4435-3.0979-1.8038 0-3.2846 1.3613-3.4435 3.0979l-.0096 4.3578c.2276.0424.5318.2083.5395.4648v.504c.2863-.0256.5457.1905.5438.479v.5688H4.3915v-.5688c-.0019-.2885.2575-.5047.5438-.479v-.504c0-.2529.2011-.4548.4536-.4724v-7.895h-.4905L4.2898 7.008l2.6405-.0005V5.0419h9.9495v1.9656h2.8219l-.6091 2.0314h-.4901v7.8949c.2519.0177.453.2195.453.4724"/></svg>
            AgentCrush on Farcaster
          </a>
          <a href="https://x.com/agentcrush_xyz" target="_blank" rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/60 hover:text-white hover:border-white/[0.15] transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            AgentCrush on X
          </a>
          <Link href="/categories"
            className="inline-flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/60 hover:text-white hover:border-white/[0.15] transition-colors">
            Browse Categories →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── What can you do section ────────────────────────────────────────────────
function WhatCanYouDo() {
  const cards = [
    {
      verb: 'Get your agent indexed',
      sub: 'Submit your agent, claim your profile, embed your rank, and compare yourself against nearby agents.',
      href: '/submit',
      linkLabel: 'Submit agent →',
    },
    {
      verb: 'Query agent intelligence from your workflows',
      sub: 'Free MCP server and paid x402 endpoints. Machine-callable from your AI agents and workflows.',
      href: '/developers',
      linkLabel: 'View developer docs →',
    },
    {
      verb: 'Track which agents are gaining adoption',
      sub: 'Track which agent projects are gaining evidence, adoption, protocol presence, and economic activity.',
      href: '/agent-economy-index',
      linkLabel: 'View Agent Economy Index →',
    },
    {
      verb: 'Compare two agents head-to-head',
      sub: 'Score, 30-day history, signals, ecosystem links, and ERC-8004 mappings — side by side.',
      href: '/compare',
      linkLabel: 'Pick two agents →',
    },
  ]
  return (
    <div className="py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.href}
            className="relative rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-4 hover:border-[rgba(233,30,128,0.3)] transition-colors overflow-hidden">
            <CornerAccent />
            <p className="font-mono text-sm font-bold text-[#e91e80] leading-snug mb-1.5">{card.verb}</p>
            <p className="font-mono text-[11px] text-white/40 leading-relaxed mb-3">{card.sub}</p>
            <Link href={card.href}
              className="font-mono text-[11px] font-semibold text-[#39ff14] hover:opacity-80 transition-opacity">
              {card.linkLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Comparison widget ──────────────────────────────────────────────────────
function ComparisonWidget() {
  const comparisons = [
    { a: 'crewai', labelA: 'CrewAI', b: 'langchainagents', labelB: 'LangChain Agents' },
    { a: 'openclaw', labelA: 'OpenClaw Agents', b: 'dspy', labelB: 'DSPy' },
    { a: 'autogpt', labelA: 'AutoGPT', b: 'openhands', labelB: 'OpenHands' },
  ]
  return (
    <div className="relative rounded-lg border border-white/[0.06] bg-[#0a0a14] overflow-hidden">
      <CornerAccent />
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[#e91e80]">⇄</span>
          <span className="font-mono text-xs font-bold text-white tracking-wide">COMPARE</span>
        </div>
        <Link href="/compare" className="font-mono text-[10px] text-white/30 hover:text-white/55 transition-colors">
          Compare any two →
        </Link>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {comparisons.map(({ a, labelA, b, labelB }) => (
          <Link key={`${a}-${b}`}
            href={`/compare/${a}-vs-${b}`}
            className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.025] transition-colors group">
            <span className="font-mono text-[11px] text-white/70 group-hover:text-white/90 transition-colors truncate">{labelA}</span>
            <span className="font-mono text-[10px] text-[#e91e80] shrink-0 px-0.5">vs</span>
            <span className="font-mono text-[11px] text-white/70 group-hover:text-white/90 transition-colors truncate">{labelB}</span>
            <span className="ml-auto font-mono text-[10px] text-white/20 group-hover:text-white/50 transition-colors shrink-0">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export const metadata = {
  title: 'AgentCrush — Strategic Market Intelligence for the Agent Economy',
  description: 'Track AI agents across open-source, x402, ERC-8004, A2A, MCP, and agent marketplaces. Compare activity, adoption, history, and machine-readable credibility signals.',
  openGraph: {
    title: 'AgentCrush — Strategic Market Intelligence for the Agent Economy',
    description: 'Track AI agents across open-source, x402, ERC-8004, A2A, MCP, and agent marketplaces — activity, adoption, history, and machine-readable credibility signals.',
    url: 'https://www.agentcrush.xyz',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — Strategic Market Intelligence for the Agent Economy' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush — Strategic Market Intelligence for the Agent Economy',
    description: 'Track AI agents across open-source, x402, ERC-8004, A2A, MCP, and agent marketplaces — activity, adoption, history, and machine-readable credibility signals.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://www.agentcrush.xyz/og-default.png',
      button: {
        title: 'Open AgentCrush',
        action: {
          type: 'launch_miniapp',
          name: 'AgentCrush',
          url: 'https://www.agentcrush.xyz',
          splashImageUrl: 'https://www.agentcrush.xyz/agentcrush-logo.png',
          splashBackgroundColor: '#08080f',
        },
      },
    }),
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: 'https://www.agentcrush.xyz/og-default.png',
      button: {
        title: 'Open AgentCrush',
        action: {
          type: 'launch_frame',
          name: 'AgentCrush',
          url: 'https://www.agentcrush.xyz',
          splashImageUrl: 'https://www.agentcrush.xyz/agentcrush-logo.png',
          splashBackgroundColor: '#08080f',
        },
      },
    }),
  },
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: (url, options = {}) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  )
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const twoDaysAgo = new Date(todayStart)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const [
    { data: v2HomeRows },
    { data: recentAgents },
    { data: events },
    { data: topMover },
    { data: topFaller },
    { data: newestAgent },
    { data: biggestMovers },
    { count: eventsTodayCount },
    { count: eventsYesterdayCount },
    { count: agentCount },
    { data: archetypeRows },
    { count: evidenceRankedCount },
  ] = await Promise.all([
    supabase
      .from('agent_score_v2_top50_public_candidate')
      .select('handle, display_name, rank_v2_c_public, score_v2_c_public_candidate, active_weight_total, coverage_tier, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score, trust_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_v2_c_public', { ascending: true })
      .limit(10),

    supabase.from('agents')
      .select('id, handle, display_name, avatar_url, custom_background_url, tagline, archetype, created_at')
      .order('created_at', { ascending: false }).limit(12),

    supabase.from('events')
      .select('id, agent_id, event_type, delta_visibility, metadata, created_at')
      .order('created_at', { ascending: false }).limit(60),

    supabase.from('agents')
      .select('id, handle, display_name, weekly_delta')
      .gt('weekly_delta', 0).order('weekly_delta', { ascending: false }).limit(1).maybeSingle(),

    supabase.from('agents')
      .select('id, handle, display_name, weekly_delta')
      .lt('weekly_delta', 0).order('weekly_delta', { ascending: true }).limit(1).maybeSingle(),

    supabase.from('agents')
      .select('id, handle, display_name, created_at')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),

    supabase.from('agents')
      .select('id, handle, display_name, avatar_url, custom_background_url, weekly_delta, tagline')
      .gt('weekly_delta', 0)
      .order('weekly_delta', { ascending: false })
      .limit(8),

    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),

    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString()),

    supabase.from('agents').select('id', { count: 'exact', head: true }),

    supabase.from('agents').select('archetype').not('archetype', 'is', null),

    supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'evidence_ranked'),
  ])

  const [xPostsToday, scheduledToday, snapshotCount] = await Promise.all([
    safeCount(supabase, 'x_observed_posts', (q) => q.gte('created_at', todayStart.toISOString())),
    safeCount(supabase, 'scheduled_posts', (q) => q.gte('created_at', todayStart.toISOString())),
    safeCount(supabase, 'agent_daily_snapshots', (q) => q),
  ])

  const { data: rawNewsItems } = await supabase
    .from('news_items')
    .select('id, source, headline, url, summary, published_at, is_featured, created_at')
    .eq('is_featured', false)
    .order('published_at', { ascending: false })
    .limit(25)

  const _seenSources = new Set()
  const newsItems = (rawNewsItems || []).filter((item) => {
    if (_seenSources.has(item.source)) return false
    if (item.published_at && new Date(item.published_at) < twoDaysAgo) return false
    _seenSources.add(item.source)
    return true
  }).slice(0, 5)

  let signalsToday = (eventsTodayCount || 0) + xPostsToday + scheduledToday
  const signalsYesterday = (eventsYesterdayCount || 0)

  if (signalsToday < 5) {
    const { count: signals48h } = await supabase
      .from('events').select('id', { count: 'exact', head: true })
      .gte('created_at', twoDaysAgo.toISOString())
    signalsToday = Math.max(signalsToday, signals48h || 0)
  }

  const signalsDelta = signalsYesterday > 0
    ? Math.round(((signalsToday - signalsYesterday) / signalsYesterday) * 100)
    : null

  const v2HomeHandles = (v2HomeRows || []).map((r) => r.handle).filter(Boolean)
  const { data: homeAgentsData } = v2HomeHandles.length > 0
    ? await supabase
        .from('agents')
        .select('id, handle, display_name, bio, archetype, avatar_url, custom_background_url, tagline, weekly_delta, verified, identity_status, website_url, github_url')
        .in('handle', v2HomeHandles)
    : { data: [] }

  const homeAgentsByHandle = {}
  for (const a of homeAgentsData || []) {
    homeAgentsByHandle[a.handle] = a
  }

  const rankingAgentIds = (homeAgentsData || []).map((a) => a.id).filter(Boolean)
  let trendingByAgentId = {}
  if (rankingAgentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary').select('agent_id, latest_event_type').in('agent_id', rankingAgentIds)
    trendingByAgentId = Object.fromEntries((trendingRows || []).map((r) => [r.agent_id, r]))
  }

  const rankingRows = (v2HomeRows || []).map((v2, idx) => {
    const a = homeAgentsByHandle[v2.handle] || {}
    const trending = trendingByAgentId[a.id] || null
    return {
      id: a.id || v2.handle,
      global_rank: v2.rank_v2_c_public ?? idx + 1,
      handle: v2.handle,
      display_name: a.display_name || v2.display_name || v2.handle,
      avatar_url: toPublicImageUrl(a.custom_background_url || a.avatar_url),
      tagline: a.tagline || '',
      archetype: a.archetype || '',
      score_total: v2.score_v2_c_public_candidate ?? 0,
      score_visibility: 0,
      score_reputation: 0,
      github_score:        v2.github_score        ?? null,
      package_usage_score: v2.package_usage_score ?? null,
      dependency_score:    v2.dependency_score    ?? null,
      ecosystem_score:     v2.ecosystem_score     ?? null,
      docs_quality_score:  v2.docs_quality_score  ?? null,
      hn_score:            v2.hn_score            ?? null,
      trust_score:         v2.trust_score         ?? null,
      coverage_tier:       v2.coverage_tier       ?? null,
      active_weight_total: v2.active_weight_total ?? null,
      weekly_delta: a.weekly_delta || 0,
      rank_move_reason: getMovementReason(a.weekly_delta, trending?.latest_event_type),
      latest_event_type: trending?.latest_event_type || null,
      trending: { latest_event_type: trending?.latest_event_type || null },
      verified: a.verified || a.identity_status === 'verified',
      external_url: a.website_url || a.github_url || null,
    }
  })

  const moverIds = (biggestMovers || []).map((agent) => agent.id).filter(Boolean)
  const { data: moverRankings } = moverIds.length
    ? await supabase
        .from('rankings')
        .select('agent_id, global_rank, score_visibility, score_reputation')
        .in('agent_id', moverIds)
    : { data: [] }
  const moverRankingMap = new Map()
  for (const row of moverRankings || []) {
    if (!row.agent_id || moverRankingMap.has(row.agent_id)) continue
    moverRankingMap.set(row.agent_id, row)
  }
  const biggestMoverRows = (biggestMovers || []).map((agent) => {
    const ranking = moverRankingMap.get(agent.id)
    return {
      ...agent,
      global_rank: ranking?.global_rank ?? null,
      score_total: (ranking?.score_visibility || 0) + (ranking?.score_reputation || 0),
    }
  })

  const eventAgentIds = [...new Set((events || []).map((e) => e.agent_id).filter(Boolean))]
  const { data: eventAgents } = eventAgentIds.length
    ? await supabase.from('agents').select('id, handle, display_name, avatar_url, custom_background_url').in('id', eventAgentIds)
    : { data: [] }
  const eventAgentMap = new Map((eventAgents || []).map((a) => [a.id, a]))

  const deduped = dedupeRows(
    (events || []).map((e) => {
      const agent = eventAgentMap.get(e.agent_id)
      return {
        id: e.id, created_at: e.created_at, event_type: e.event_type,
        event_label: formatEventSummary(e),
        handle: agent?.handle || 'unknown',
        display_name: agent?.display_name || agent?.handle || 'unknown',
        avatar_url: toPublicImageUrl(agent?.custom_background_url || agent?.avatar_url),
      }
    }), 24
  )

  const ecosystemFeedRows = buildContentFeed(deduped, recentAgents || [], 30)

  const archetypeCounts = {}
  for (const r of (archetypeRows || [])) {
    if (r.archetype) archetypeCounts[r.archetype] = (archetypeCounts[r.archetype] || 0) + 1
  }
  const topSectors = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const indexedFreshness = getIndexedFreshnessMeta(recentAgents?.[0]?.created_at)

  return (
    <div className="min-h-screen bg-[#08080f] overflow-x-hidden" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px'}}>
      {/* Atmosphere overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0c1a] via-[#08080f] to-[#0a0812] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(236,72,153,0.06) 0%, transparent 60%)'}} />

      <div className="relative">

        {/* ── HERO STAT STRIP ──────────────────────────────────────────────── */}
        <div className="relative z-10 border-b border-[rgba(233,30,128,0.08)] bg-[rgba(233,30,128,0.02)]">
          {/* Mobile: scrolling ticker */}
          <div className="sm:hidden overflow-hidden py-1.5">
            <div className="flex whitespace-nowrap" style={{animation: 'ticker-scroll 28s linear infinite', width: 'max-content'}}>
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 shrink-0">
                  <span className="font-mono text-[11px] text-white/50">◆ <span className="text-white font-bold tabular-nums">{agentCount ?? 0}</span> <span className="text-white/30">AGENTS</span></span>
                  <span className="text-white/15">·</span>
                  <span className="font-mono text-[11px] text-white/50">⚡ <span className="text-white font-bold tabular-nums">{signalsToday}</span> <span className="text-white/30">SIGNALS</span></span>
                  <span className="text-white/15">·</span>
                  <span className="font-mono text-[11px] text-white/50">↑ <span className="text-white font-bold tabular-nums">{evidenceRankedCount ?? 0}</span> <span className="text-white/30">EVIDENCE RANKED</span></span>
                  {newestAgent ? (
                    <>
                      <span className="text-white/15">·</span>
                      <span className="font-mono text-[11px] text-white/50">✦ <Link href={`/agent/${encodeURIComponent(newestAgent.handle)}`} className="text-amber-400/80 font-semibold hover:text-amber-300 transition-colors">{newestAgent.display_name || newestAgent.handle}</Link></span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: static stat bar */}
          <Container>
            <div className="hidden sm:flex items-center justify-between py-2 gap-6">
              <div className="flex items-center gap-6 overflow-x-auto">
                <StatPill label="AGENTS" value={agentCount ?? 0} />
                <StatPill
                  label="SIGNALS TODAY"
                  value={signalsToday}
                  badge={signalsDelta !== null ? {
                    text: `${signalsDelta >= 0 ? '+' : ''}${signalsDelta}%`,
                    color: signalsDelta >= 0 ? '#39ff14' : '#f87171',
                  } : null}
                />
                <StatPill label="EVIDENCE RANKED" value={evidenceRankedCount ?? 0} />
                {newestAgent ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[10px] text-amber-400/60 uppercase tracking-wider">✦ Just Indexed</span>
                    <Link href={`/agent/${encodeURIComponent(newestAgent.handle)}`}
                      className="font-mono text-[11px] font-bold text-white hover:text-white/80 transition truncate max-w-[120px]">
                      {newestAgent.display_name || newestAgent.handle}
                    </Link>
                  </div>
                ) : null}
                {topFaller ? (
                  <div className="hidden md:flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[10px] text-white/25 uppercase tracking-wider">Falling</span>
                    <Link href={`/agent/${encodeURIComponent(topFaller.handle)}`}
                      className="font-mono text-[11px] font-bold text-white hover:text-white/80 transition truncate max-w-[100px]">
                      {topFaller.display_name || topFaller.handle}
                    </Link>
                    <span className="font-mono text-[11px] font-bold text-red-400 tabular-nums">{topFaller.weekly_delta}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 animate-ping" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] text-white/30">LIVE</span>
              </div>
            </div>
          </Container>
        </div>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        {/* -mt-7 on mobile pulls the hero up by the ticker height (~28px), keeping
            hero content visible at the fold. sm:mt-0 resets on desktop. */}
        <div className="-mt-7 sm:mt-0">
          <HeroSection
            agentCount={agentCount}
            signalsToday={signalsToday}
            evidenceRankedCount={evidenceRankedCount}
          />
        </div>

        {/* ── INTEL TICKER ─────────────────────────────────────────────────── */}
        <IntelTicker newsItems={newsItems} />

        {/* ── HISTORICAL SNAPSHOTS PROOF-POINT ─────────────────────────────── */}
        {snapshotCount > 0 && (
          <div className="border-b border-[rgba(167,139,250,0.12)] bg-[rgba(167,139,250,0.04)] py-6 md:py-8">
            <Container>
              <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8 max-w-4xl mx-auto">
                {/* Big number */}
                <div className="text-center md:text-left md:border-r md:border-[rgba(167,139,250,0.15)] md:pr-8">
                  <div
                    className="font-mono font-bold tabular-nums"
                    style={{
                      color: '#a78bfa',
                      fontSize: 'clamp(28px, 6vw, 44px)',
                      lineHeight: 1,
                    }}
                  >
                    {snapshotCount.toLocaleString()}
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Daily snapshots since Apr 2026
                  </div>
                </div>

                {/* Why it matters */}
                <div>
                  <p className="text-sm md:text-base text-white/70 leading-relaxed">
                    <span className="text-white/95 font-semibold">The historical moat.</span>{' '}
                    Other directories show today&apos;s list. We show <em className="not-italic text-violet-300">how rankings change over time</em> — who&apos;s climbing, who&apos;s falling, who came from nowhere 30 days ago, who collapsed.
                  </p>
                  <p className="mt-2 text-xs md:text-sm text-white/45 leading-relaxed">
                    Every indexed agent has a daily record of rank, score, and signal change. Trends, not snapshots. Momentum, not vanity metrics.
                  </p>
                </div>
              </div>
            </Container>
          </div>
        )}

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main style={{ position: 'relative', zIndex: 10 }}>
          {/* Ambient fog blobs */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, transparent 70%)', top: -300, left: '20%', animation: 'fogDrift 18s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(233,30,128,0.05) 0%, transparent 70%)', top: -200, right: '10%', animation: 'fogDrift 24s ease-in-out infinite 6s' }} />
          </div>
          <Container>
            {/* Agent Intel news bar */}
            <div className="pt-3">
              <AgentIntelBar
                items={newsItems}
                updatedAt={newsItems?.[0]?.created_at || null}
              />
            </div>

            {/* ── WHAT CAN YOU DO ─────────────────────────────────────────── */}
            <WhatCanYouDo />

            <div className="pb-3 grid grid-cols-12 gap-3" style={{alignItems: 'start'}}>

              {/* ── LEFT COL (8) ── */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">

                {/* Comparison widget */}
                <ComparisonWidget />

                {/* Recently Indexed (above Rising Now) */}
                <div className="relative rounded-lg border border-white/[0.08] bg-[#0a0a14] overflow-hidden">
                  <CornerAccent />
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-[10px] ${indexedFreshness?.isStale ? 'text-white/30' : 'text-amber-400'}`}>✦</span>
                      <span className="font-mono text-xs font-bold text-white">{indexedFreshness?.isStale ? 'INDEX ACTIVITY' : 'RECENTLY INDEXED'}</span>
                    </div>
                    {indexedFreshness?.isStale ? (
                      <Link href="/explore" className="font-mono text-[10px] text-white/30 hover:text-white/55 transition-colors">Explore →</Link>
                    ) : (
                      <Link href="/rankings" className="font-mono text-[10px] text-white/30 hover:text-white/55 transition-colors">All →</Link>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-2">
                    {(recentAgents || []).slice(0, 12).map((a) => {
                      const avatarUrl = toPublicImageUrl(a.custom_background_url || a.avatar_url)
                      const displayName = a.display_name || a.handle || '?'
                      return (
                        <Link key={a.id} href={`/agent/${encodeURIComponent(a.handle)}`}
                          className="flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.02] px-2 py-1.5 hover:bg-white/[0.04] hover:border-white/[0.13] transition-colors min-w-0">
                          <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.09] flex items-center justify-center ${!avatarUrl ? avatarColor(a.handle) : 'bg-white/[0.04]'}`}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="font-mono text-[8px] font-bold">{displayName[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs font-semibold text-white/90 truncate">{displayName}</div>
                            {a.archetype && (
                              <div className="font-mono text-[10px] text-white/40 truncate">{a.archetype}</div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                    {Array.from({ length: Math.max(0, 12 - (recentAgents || []).slice(0, 12).length) }).map((_, i) => (
                      <Link key={`placeholder-${i}`} href="/submit"
                        className="flex items-center justify-center gap-1 rounded border border-dashed border-white/[0.06] bg-transparent px-2 py-1.5 hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors min-w-0">
                        <span className="font-mono text-[9px] text-white/20">+ Submit an agent →</span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.04] px-3 py-1">
                    {indexedFreshness?.isStale ? (
                      <span className="font-mono text-[10px] text-white/30">
                        {(agentCount ?? 0).toLocaleString()}+ agents tracked · indexing run pending
                      </span>
                    ) : indexedFreshness ? (
                      <span className="font-mono text-[10px] text-white/35">
                        {indexedFreshness.label}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Rising Now (10 rows) */}
                <div className="relative rounded-lg border border-white/[0.06] bg-[#0a0a14] overflow-hidden">
                  <CornerAccent />
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#e91e80]">◆</span>
                      <span className="font-mono text-xs font-bold text-white tracking-wide">RISING NOW</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/rankings/model-families" className="font-mono text-[10px] text-[#e91e80]/70 hover:text-[#e91e80] transition-colors">
                        Model Families →
                      </Link>
                      <span className="font-mono text-[10px] text-white/15">·</span>
                      <Link href="/rankings" className="font-mono text-[10px] text-white/30 hover:text-white/55 transition-colors">
                        All Rankings →
                      </Link>
                    </div>
                  </div>
                  <div className="px-3 pt-2 pb-3">
                    <SectorTabsAndTable rows={rankingRows} sectors={topSectors} />
                  </div>
                </div>

              </div>

              {/* ── RIGHT COL (4): Signal Feed + Submit CTA + Follow ── */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-3" style={{alignSelf:'start'}}>

                {/* Signal Feed */}
                <div className="relative rounded-lg border border-white/[0.06] bg-[#0a0a14] overflow-hidden flex flex-col" style={{minHeight: 280}}>
                  <CornerAccent />
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                    <span className="font-mono text-[10px] text-violet-400">⚡</span>
                    <span className="font-mono text-xs font-bold text-white">SIGNAL FEED</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse ml-1" />
                    <span className="ml-auto font-mono text-[10px] text-white/20 tabular-nums">{ecosystemFeedRows.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]" style={{maxHeight: 320}}>
                    {ecosystemFeedRows.map((row) => {
                      const sig = getSignalStyle(row.event_type)
                      return (
                        <div key={row.id} className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{background: sig.dot, boxShadow: `0 0 4px ${sig.dot}`}} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1 min-w-0">
                              <Link href={`/agent/${encodeURIComponent(row.handle)}`}
                                className={`font-mono text-[11px] font-semibold shrink-0 hover:opacity-80 transition ${row.synthetic ? 'text-amber-300/70' : 'text-white/80'}`}>
                                {row.display_name}
                              </Link>
                              <span className="font-mono text-[10px] text-white/30 truncate">{row.event_label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[9px] font-semibold" style={{color: sig.dot}}>{sig.label}</span>
                              <span className="font-mono text-[9px] text-white/20 tabular-nums">{formatRelativeTime(row.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {ecosystemFeedRows.length === 0 ? (
                      <div className="px-3 py-5 font-mono text-xs text-white/25">No signals yet.</div>
                    ) : null}
                  </div>
                </div>

                {/* Biggest Movers */}
                {biggestMoverRows.length > 0 && (
                  <div className="relative rounded-lg border border-white/[0.06] bg-[#0a0a14] overflow-hidden">
                    <CornerAccent />
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px]" style={{color:'#39ff14'}}>↑</span>
                        <span className="font-mono text-xs font-bold text-white">BIGGEST MOVERS</span>
                      </div>
                      <span className="font-mono text-[9px] text-white/20">7d delta</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {biggestMoverRows.slice(0, 6).map((agent) => {
                        const avatarUrl = toPublicImageUrl(agent.custom_background_url || agent.avatar_url)
                        const displayName = agent.display_name || agent.handle || '?'
                        return (
                          <Link key={agent.id} href={`/agent/${encodeURIComponent(agent.handle)}`}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.025] transition-colors">
                            <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.08] flex items-center justify-center ${!avatarUrl ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-mono text-[8px] font-bold">{displayName[0].toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[11px] font-semibold text-white/90 truncate">{displayName}</div>
                              <div className="font-mono text-[9px] text-white/30 tabular-nums">{agent.global_rank ? `#${agent.global_rank}` : '—'}</div>
                            </div>
                            <span className="shrink-0 rounded border border-[rgba(57,255,20,0.25)] bg-[rgba(57,255,20,0.08)] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums" style={{color:'#39ff14'}}>
                              +{agent.weekly_delta}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Submit CTA */}
                <Link href="/submit"
                  className="relative rounded-lg border border-[rgba(233,30,128,0.35)] bg-[rgba(233,30,128,0.06)] px-3 py-2.5 hover:bg-[rgba(233,30,128,0.12)] transition-colors block group overflow-hidden">
                  <CornerAccent />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#e91e80]">Submit an Agent</span>
                    <span className="font-mono text-[#e91e80] group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                  <div className="font-mono text-[10px] text-white/30 mt-0.5">List your agent in the index. Free.</div>
                </Link>

                <FollowEcosystemPanel className="hidden lg:block" />

              </div>

            </div>

            {/* ── FOLLOW FOOTER ─────────────────────────────────────────── */}
            <FollowEcosystemPanel className="pb-4 lg:hidden" />

          </Container>
        </main>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.04]">
          <Container>
            <div className="py-3 text-center">
              <p className="font-mono text-[10px] text-white/20">© {new Date().getFullYear()} AgentCrush · Market intelligence for the agent economy</p>
              <div className="mt-1 flex justify-center gap-5">
                <a href="/about" className="font-mono text-[10px] text-white/20 hover:text-white/40 transition-colors">About</a>
                <a href="/terms" className="font-mono text-[10px] text-white/20 hover:text-white/40 transition-colors">Terms</a>
              </div>
            </div>
          </Container>
        </div>

      </div>
    </div>
  )
}

// ── Server-only sub-component ──────────────────────────────────────────────
function StatPill({ label, value, badge }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="font-mono text-[10px] text-white/25 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-xs font-bold text-white tabular-nums">{value}</span>
      {badge ? (
        <span className="font-mono text-[10px] font-semibold tabular-nums" style={{color: badge.color}}>{badge.text}</span>
      ) : null}
    </div>
  )
}
