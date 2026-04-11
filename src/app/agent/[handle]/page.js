import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import {
  getAgentArchetype,
  getAgentDisplayName,
  getAgentShortDescription,
  isDemoAgent,
} from '@/lib/agent-quality'
import { getWhyMoving, getArchetypeStyle } from '@/lib/why-moving'
import AgentHeader from '@/components/agent/AgentHeader'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const EVENT_LABELS = {
  daily_boost: 'Gained community traction',
  collab_win: 'Collaboration showing momentum',
  spotlight_pick: 'Featured in spotlight',
  profile_upgrade: 'Profile upgraded',
  rumor_wave: 'Ecosystem chatter increasing',
  canon_scene: 'New ecosystem development',
  timeline_ping: 'Mentioned in the timeline',
  ranking_jump: 'Climbed in the rankings',
  audience_spike: 'Discovered by a new audience',
  reputation_hit: 'Reputation under pressure',
  reputation_recovery: 'Reputation recovering',
  launch_buzz: 'Launch gaining attention',
  repo_star_growth: 'Repository gaining traction',
  repo_release: 'New release detected',
  dev_activity: 'Development activity detected',
  ecosystem_integration: 'New ecosystem integration',
}

function formatEventLabel(eventType) {
  return EVENT_LABELS[eventType] || 'Activity detected'
}

function formatImpact(event) {
  const parts = []

  if (Number(event.delta_visibility || 0) !== 0) {
    parts.push(`Visibility ${event.delta_visibility > 0 ? '+' : ''}${event.delta_visibility}`)
  }

  if (Number(event.delta_reputation || 0) !== 0) {
    parts.push(`Reputation ${event.delta_reputation > 0 ? '+' : ''}${event.delta_reputation}`)
  }

  return parts.length ? parts.join(' • ') : 'No score change'
}

function formatTimeAgo(value) {
  try {
    const now = new Date()
    const then = new Date(value)
    const diffMs = now - then

    const minutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMs / 3600000)
    const days = Math.floor(diffMs / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} h ago`
    return `${days} d ago`
  } catch {
    return value
  }
}

function resolveImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/${path}`
}

function formatRelationshipLabel(relType) {
  switch (relType) {
    case 'framework_of':
      return 'Framework of'
    case 'part_of_ecosystem':
      return 'Part of ecosystem'
    case 'integrates_with':
      return 'Integrates with'
    case 'runs_on':
      return 'Runs on'
    case 'derived_from':
      return 'Derived from'
    case 'competes_with':
      return 'Competes with'
    case 'adjacent_to':
      return 'Related project'
    default:
      return 'Connected project'
  }
}

// Short tag label: "Built on LangChain", "vs Devin", "Part of Virtuals"
function formatRelTag(relType, connectedName) {
  const name = connectedName || ''
  switch (relType) {
    case 'runs_on':         return `Built on ${name}`
    case 'framework_of':   return `Powers ${name}`
    case 'part_of_ecosystem': return `Part of ${name}`
    case 'integrates_with': return `Uses ${name}`
    case 'derived_from':   return `Derived from ${name}`
    case 'competes_with':  return `vs ${name}`
    case 'adjacent_to':    return `Related: ${name}`
    default:               return name
  }
}

function relTagStyle(relType) {
  switch (relType) {
    case 'runs_on':         return 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
    case 'framework_of':   return 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
    case 'part_of_ecosystem': return 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
    case 'integrates_with': return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
    case 'derived_from':   return 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
    case 'competes_with':  return 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
    case 'adjacent_to':    return 'border-white/15 bg-white/5 text-white/50 hover:bg-white/10'
    default:               return 'border-white/15 bg-white/5 text-white/50 hover:bg-white/10'
  }
}

function formatLayerLabel(layer) {
  switch (layer) {
    case 'framework':
      return 'Framework'
    case 'infrastructure':
      return 'Infrastructure'
    case 'network':
      return 'Network'
    case 'observer':
      return 'Observer'
    case 'agent':
      return 'Agent'
    default:
      return 'Project'
  }
}

function relationPriority(relType) {
  switch (relType) {
    case 'framework_of':
      return 1
    case 'part_of_ecosystem':
      return 2
    case 'runs_on':
      return 3
    case 'integrates_with':
      return 4
    case 'derived_from':
      return 5
    case 'competes_with':
      return 6
    case 'adjacent_to':
      return 7
    default:
      return 99
  }
}

function sortConnections(connections) {
  return [...connections].sort((a, b) => {
    const relDiff = relationPriority(a.rel_type) - relationPriority(b.rel_type)
    if (relDiff !== 0) return relDiff

    const intensityA = Number(a.intensity || 0)
    const intensityB = Number(b.intensity || 0)
    if (intensityA !== intensityB) return intensityB - intensityA

    return String(a.connected_name || a.connected_handle || '').localeCompare(
      String(b.connected_name || b.connected_handle || '')
    )
  })
}

function groupConnectionsByType(connections) {
  return connections.reduce((acc, connection) => {
    const key = connection.rel_type || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(connection)
    return acc
  }, {})
}

function buildAlternativeAgents(ecosystemConnections, fallbackAgents) {
  const items = []
  const seen = new Set()

  for (const connection of ecosystemConnections || []) {
    const relType = connection?.rel_type
    const related = connection?.agent
    const connectedHandle = connection?.connected_handle

    if (!related?.id || !connectedHandle) continue
    if (!['competes_with', 'adjacent_to', 'integrates_with'].includes(relType)) continue
    if (seen.has(related.id)) continue

    seen.add(related.id)
    items.push({
      id: related.id,
      handle: connectedHandle,
      display_name: connection.connected_name || related.display_name || connectedHandle,
      archetype: related.archetype,
      avatar_url: related.custom_background_url || related.avatar_url,
      ecosystem_layer: related.ecosystem_layer,
      label:
        relType === 'competes_with'
          ? 'Alternative option'
          : relType === 'integrates_with'
          ? 'Works alongside this agent'
          : 'Related option',
      score: Number(related.visibility_score || 0) + Number(related.reputation_score || 0),
    })

    if (items.length >= 4) return items
  }

  for (const related of fallbackAgents || []) {
    if (!related?.id || seen.has(related.id)) continue

    seen.add(related.id)
    items.push({
      id: related.id,
      handle: related.handle,
      display_name: related.display_name || related.handle,
      archetype: related.archetype,
      avatar_url: related.avatar_url,
      ecosystem_layer: related.ecosystem_layer,
      label: 'Similar profile',
      score: Number(related.visibility_score || 0) + Number(related.reputation_score || 0),
    })

    if (items.length >= 4) break
  }

  return items
}

function sentenceCase(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildUseCases(agent, bioText) {
  const sourceText = `${agent?.tagline || ''} ${bioText || ''}`.toLowerCase()
  const useCases = []

  const addUseCase = (value) => {
    if (!value || useCases.includes(value) || useCases.length >= 3) return
    useCases.push(value)
  }

  if (/\bresearch|analy|insight|summary|brief|report\b/.test(sourceText)) {
    addUseCase('Use it when you need fast research, summaries, or synthesized insights.')
  }

  if (/\bbuild|code|dev|ship|prototype|automation|workflow\b/.test(sourceText)) {
    addUseCase('Use it to build, automate, or unblock execution work quickly.')
  }

  if (/\bsocial|x\b|audience|content|community|growth|marketing\b/.test(sourceText)) {
    addUseCase('Use it for audience growth, social momentum, or content support.')
  }

  if (/\bfinance|trading|market|crypto|token|invest\b/.test(sourceText)) {
    addUseCase('Use it to track markets, surface signals, or monitor financial moves.')
  }

  if (/\bfitness|health|wellness|habit|coach\b/.test(sourceText)) {
    addUseCase('Use it for coaching, routines, and practical health guidance.')
  }

  if (/\bcompanion|relationship|romance|lifestyle|care\b/.test(sourceText)) {
    addUseCase('Use it for ongoing guidance, companionship, or personal support.')
  }

  if (/\bframework|tooling|infra|infrastructure|platform|sdk\b/.test(sourceText)) {
    addUseCase('Use it when you need tooling, infrastructure, or a base layer for other agents.')
  }

  if (agent?.archetype) {
    addUseCase(`Use it when you want a ${sentenceCase(agent.archetype)}-style agent for focused tasks.`)
  }

  if (agent?.ecosystem_layer) {
    addUseCase(`Use it as a ${formatLayerLabel(agent.ecosystem_layer).toLowerCase()} layer inside a broader agent workflow.`)
  }

  addUseCase('Use it when you need a practical specialist instead of a general-purpose assistant.')

  return useCases.slice(0, 3)
}

function RankSparkline({ history = [] }) {
  const points = [...history].reverse()
  if (points.length < 2) return null

  const ranks = points.map((p) => p.global_rank)
  const minRank = Math.min(...ranks)
  const maxRank = Math.max(...ranks)
  const range = maxRank - minRank || 1

  const W = 80
  const H = 28
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((maxRank - p.global_rank) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const latest = ranks[ranks.length - 1]
  const earliest = ranks[0]
  const improved = latest < earliest
  const color = improved ? '#6ee7b7' : latest > earliest ? '#fca5a5' : '#94a3b8'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function formatProfileEventSummary(event) {
  const metadata = event?.metadata || {}

  function readNum(keys) {
    for (const k of keys) {
      const v = metadata?.[k]
      if (v !== null && v !== undefined && v !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
      }
    }
    return null
  }

  function readText(keys) {
    for (const k of keys) {
      const v = metadata?.[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return null
  }

  const stars = readNum(['stars_gained', 'star_gain', 'stars', 'github_stars'])
  const mentions = readNum(['mention_count', 'mentions', 'post_count', 'x_posts'])
  const rankJump = readNum(['rank_jump', 'positions_gained', 'rank_delta'])
  const releaseName = readText(['release_name', 'version', 'tag_name'])
  const integrationName = readText(['integration_name', 'partner', 'framework', 'platform'])

  switch (event?.event_type) {
    case 'repo_star_growth':
      if (stars) return `Gained ${stars} GitHub stars`
      return 'GitHub repository picked up new stars'
    case 'repo_release':
      if (releaseName) return `Published release: ${releaseName}`
      return 'Published a new release'
    case 'audience_spike':
      if (mentions) return `Mentioned in ${mentions} recent X posts`
      return 'Audience spike detected'
    case 'ranking_jump':
      if (rankJump) return `Climbed ${rankJump} spots in the rankings`
      return 'Moved up in the rankings'
    case 'timeline_ping':
      if (mentions) return `Surfaced in ${mentions} ecosystem mentions`
      return 'Mentioned in the ecosystem'
    case 'launch_buzz':
      if (mentions) return `Generated ${mentions} launch mentions`
      return 'Launch attention detected'
    case 'collab_win':
      if (integrationName) return `New collaboration with ${integrationName}`
      return 'New collaboration detected'
    case 'daily_boost':
      return 'Picked up fresh momentum'
    case 'canon_scene':
      return 'Ecosystem milestone detected'
    case 'ecosystem_integration':
      if (integrationName) return `New integration with ${integrationName}`
      return 'New ecosystem integration'
    case 'dev_activity':
      return 'New development activity'
    default:
      return formatEventLabel(event?.event_type)
  }
}

const EVENT_DOT_COLORS = {
  repo_star_growth:     '#4ade80',
  repo_release:         '#e879f9',
  dev_activity:         '#60a5fa',
  ranking_jump:         '#fbbf24',
  audience_spike:       '#00e5ff',
  timeline_ping:        '#00e5ff',
  launch_buzz:          '#4ade80',
  collab_win:           '#34d399',
  daily_boost:          '#4ade80',
  canon_scene:          '#fbbf24',
  ecosystem_integration:'#00e5ff',
  reputation_hit:       '#f87171',
  reputation_recovery:  '#4ade80',
  spotlight_pick:       '#e879f9',
  profile_upgrade:      '#818cf8',
  rumor_wave:           '#facc15',
}

const CAT_COLORS_SERVER = {
  ECOSYSTEM:  { bg: 'rgba(0,229,255,0.12)',   text: '#00e5ff', glow: '#00e5ff' },
  TRADER:     { bg: 'rgba(255,64,200,0.12)',  text: '#ff40c8', glow: '#ff40c8' },
  RESEARCHER: { bg: 'rgba(147,51,234,0.18)',  text: '#c084fc', glow: '#c084fc' },
  REBEL:      { bg: 'rgba(255,100,50,0.12)',  text: '#ff6432', glow: '#ff6432' },
  OPERATOR:   { bg: 'rgba(250,204,21,0.12)',  text: '#facc15', glow: '#facc15' },
  BUILDER:    { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', glow: '#34d399' },
  FRAMEWORK:  { bg: 'rgba(99,102,241,0.14)',  text: '#818cf8', glow: '#818cf8' },
  AGENT:      { bg: 'rgba(0,229,255,0.09)',   text: '#67e8f9', glow: '#67e8f9' },
  CREATOR:    { bg: 'rgba(232,121,249,0.12)', text: '#e879f9', glow: '#e879f9' },
  FINANCE:    { bg: 'rgba(250,204,21,0.12)',  text: '#facc15', glow: '#facc15' },
  CRYPTO:     { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', glow: '#34d399' },
  DEVELOPER:  { bg: 'rgba(129,140,248,0.14)', text: '#818cf8', glow: '#818cf8' },
  INFRA:      { bg: 'rgba(248,113,113,0.12)', text: '#f87171', glow: '#f87171' },
  SOCIALITE:  { bg: 'rgba(244,114,182,0.12)', text: '#f472b6', glow: '#f472b6' },
  CORPORATE:  { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', glow: '#94a3b8' },
  EXPLORER:   { bg: 'rgba(45,212,191,0.12)',  text: '#2dd4bf', glow: '#2dd4bf' },
  MYSTIC:     { bg: 'rgba(129,140,248,0.14)', text: '#818cf8', glow: '#818cf8' },
  FITNESS:    { bg: 'rgba(34,211,238,0.12)',  text: '#22d3ee', glow: '#22d3ee' },
}

function getCatColor(archetype) {
  return CAT_COLORS_SERVER[(archetype || '').toUpperCase()] || { bg: 'rgba(0,229,255,0.09)', text: '#67e8f9', glow: '#67e8f9' }
}

function CornerAccentsServer({ color }) {
  const s = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none', opacity: 0.7 }
  return (
    <>
      <span style={{ ...s, top: 0, left: 0, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, top: 0, right: 0, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: 0, left: 0, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  )
}

function NeonBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.round((Math.abs(value) / Math.max(max, 1)) * 100))
  return (
    <div style={{ width: '100%', height: 3, borderRadius: 9999, marginTop: 4, background: 'rgba(255,255,255,0.07)' }}>
      <div style={{ height: '100%', borderRadius: 9999, width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: 'all 0.3s' }} />
    </div>
  )
}

const PANEL = { position: 'relative', borderRadius: 2, padding: 12, background: '#0a0a14', border: '1px solid rgba(255,255,255,0.07)' }
const LABEL_STYLE = { fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(226,232,240,0.35)' }

export async function generateMetadata({ params }) {
  const { handle } = await params
  const cleanHandle = decodeURIComponent(handle)

  const { data: agent } = await supabase
    .from('agents')
    .select('display_name, bio, tagline, handle')
    .ilike('handle', cleanHandle)
    .maybeSingle()

  if (!agent) return {}

  const name = agent.display_name || agent.handle
  const description = agent.tagline || agent.bio || `${name} — AI agent profile on AgentCrush`
  const title = `${name} — AI Agent Profile | AgentCrush`
  const image = 'https://agentcrush.xyz/apple-icon.png'

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: 'profile',
      siteName: 'AgentCrush',
      url: `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
      images: [{ url: image, width: 512, height: 512, alt: `${name} on AgentCrush` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 160),
      images: [image],
    },
  }
}

export default async function AgentPage({ params }) {
  const { handle } = await params
  const cleanHandle = decodeURIComponent(handle)

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select(`
      id,
      handle,
      display_name,
      archetype,
      avatar_url,
      custom_background_url,
      visibility_score,
      reputation_score,
      weekly_delta,
      status,
      bio,
      tagline,
      ecosystem_layer,
      framework_name,
      network_name,
      activity_status,
      identity_status,
      verified,
      github_url,
      website_url,
      claimed_by,
      claim_status,
      verified_source,
      identity_type,
      builder_attribution,
      framework,
      runtime,
      dependencies
    `)
    .ilike('handle', cleanHandle)
    .maybeSingle()

  if (agentError) {
    console.error('AGENT PAGE QUERY ERROR:', agentError)
  }

  if (!agent) {
    notFound()
  }

  const { data: ranking } = await supabase
    .from('rankings')
    .select('global_rank, score_total')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: rankHistory } = await supabase
    .from('rankings')
    .select('global_rank, computed_at')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(7)

  const { data: compareCandidatesRaw } = await supabase
    .from('rankings')
    .select(`
      agent_id,
      global_rank,
      score_visibility,
      score_reputation,
      agent:agents!inner (
        id,
        handle,
        display_name,
        tagline,
        bio,
        weekly_delta,
        visibility_score,
        reputation_score
      )
    `)
    .order('global_rank', { ascending: true })
    .limit(14)

    const { data: categoryLinks } = await supabase
    .from('agent_categories')
    .select(`
      is_primary,
      categories (
        id,
        slug,
        name,
        category_group
      )
    `)
    .eq('agent_id', agent.id)
  
  const { data: profileRelated, error: relatedError } = await supabase
    .from('agent_profile_related')
    .select(`
      connected_agent_id,
      connected_handle,
      connected_name,
      connected_layer,
      rel_type,
      intensity
    `)
    .eq('agent_handle', cleanHandle)
    .limit(12)

  if (relatedError) {
    console.error('AGENT PROFILE RELATED QUERY ERROR:', relatedError)
  }

  const connectedIds = [
    ...new Set((profileRelated || []).map((r) => r.connected_agent_id).filter(Boolean)),
  ]

  const { data: connectedAgents, error: connectedAgentsError } = connectedIds.length
    ? await supabase
        .from('agents')
        .select(`
          id,
          handle,
          display_name,
          archetype,
          avatar_url,
          custom_background_url,
          ecosystem_layer,
          visibility_score,
          reputation_score,
          network_name,
          framework_name,
          activity_status
        `)
        .in('id', connectedIds)
    : { data: [] }

  if (connectedAgentsError) {
    console.error('CONNECTED AGENTS QUERY ERROR:', connectedAgentsError)
  }

  const connectedMap = new Map((connectedAgents || []).map((a) => [a.id, a]))

  const eventAgentMap = new Map([
    [agent.id, agent],
    ...((connectedAgents || []).map((a) => [a.id, a])),
  ])

  const ecosystemConnections = sortConnections(
    (profileRelated || []).map((rel) => {
      const connected = connectedMap.get(rel.connected_agent_id)

      return {
        ...rel,
        agent: connected || null,
      }
    })
  )

  const ecosystemStats = {
    totalConnections: ecosystemConnections.length,
    frameworks: ecosystemConnections.filter((c) => c.connected_layer === 'framework').length,
    infrastructure: ecosystemConnections.filter((c) => c.connected_layer === 'infrastructure').length,
    networks: ecosystemConnections.filter((c) => c.connected_layer === 'network').length,
    agents: ecosystemConnections.filter((c) => c.connected_layer === 'agent').length,
  }

  const connectionTypeCounts = ecosystemConnections.reduce((acc, connection) => {
    const key = connection.rel_type || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const topConnectionTypes = Object.entries(connectionTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Check for pending claim request (to show "Claim requested" state)
  let hasPendingClaim = false
  try {
    const serviceDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { count } = await serviceDb
      .from('claim_requests')
      .select('id', { count: 'exact', head: true })
      .eq('agent_handle', agent.handle)
      .eq('status', 'pending')
    hasPendingClaim = (count || 0) > 0
  } catch {
    // claim_requests table may not be migrated yet — safe to ignore
  }

  const displayName = getAgentDisplayName(agent)
  const archetype = getAgentArchetype(agent)
  const bioText = getAgentShortDescription(agent)
  const useCases = buildUseCases(agent, bioText)
  const isDemo = isDemoAgent(agent)
  const isVerified = !isDemo && (agent.verified === true || agent.identity_status === 'verified' || agent.claim_status === 'verified')

  // Trust state: single source of truth for the trust badge row
  const trustState = isVerified
    ? 'verified'
    : agent.claim_status === 'claimed'
    ? 'claimed'
    : hasPendingClaim
    ? 'claim_requested'
    : 'unclaimed'

    const categoryItems = (categoryLinks || [])
    .map((row) => ({
      is_primary: row.is_primary,
      ...(Array.isArray(row.categories) ? row.categories[0] : row.categories),
    }))
    .filter(Boolean)

  const primaryCategories = categoryItems.filter((item) => item.is_primary)
  const frameworkCategories = categoryItems.filter((item) => item.category_group === 'framework')
  const ecosystemCategories = categoryItems.filter((item) => item.category_group === 'ecosystem')
  const infrastructureCategories = categoryItems.filter((item) => item.category_group === 'infrastructure')
  
  const isFrameworkPage = agent.ecosystem_layer === 'framework'

  const pageIntro = isFrameworkPage
    ? 'Framework hub inside the AgentCrush ecosystem.'
    : 'Project profile inside the wider AgentCrush ecosystem.'

  const groupedConnections = groupConnectionsByType(ecosystemConnections)

  const frameworkSectionOrder = [
    'framework_of',
    'part_of_ecosystem',
    'runs_on',
    'integrates_with',
    'competes_with',
    'derived_from',
    'adjacent_to',
  ]

  const defaultSectionOrder = [
    'part_of_ecosystem',
    'integrates_with',
    'runs_on',
    'derived_from',
    'competes_with',
    'framework_of',
    'adjacent_to',
  ]

  const orderedGroupedConnections = (isFrameworkPage
    ? frameworkSectionOrder
    : defaultSectionOrder
  )
    .filter((relType) => groupedConnections[relType]?.length)
    .map((relType) => [relType, groupedConnections[relType]])

  const frameworkChildren = groupedConnections.framework_of || []
  const ecosystemMembership = groupedConnections.part_of_ecosystem || []
  const integrationLinks = groupedConnections.integrates_with || []
  const competitionLinks = groupedConnections.competes_with || []

  const frameworkConnectionIds = ecosystemConnections
    .map((connection) => connection.connected_agent_id)
    .filter(Boolean)

  const recentEventAgentIds = isFrameworkPage
    ? [agent.id, ...frameworkConnectionIds]
    : [agent.id]

  const { data: recentEvents } = await supabase
    .from('events')
    .select(`
      id,
      agent_id,
      event_type,
      delta_visibility,
      delta_reputation,
      created_at
    `)
    .in('agent_id', recentEventAgentIds)
    .order('created_at', { ascending: false })
    .limit(8)

  const { data: maxScoreRow } = await supabase
    .from('rankings')
    .select('score_total')
    .order('score_total', { ascending: false })
    .limit(1)
    .maybeSingle()
  const maxScore = maxScoreRow?.score_total || 100

  let fallbackAgents = []

  if (!ecosystemConnections.length) {
    const { data } = await supabase
      .from('agents')
      .select(`
        id,
        handle,
        display_name,
        archetype,
        avatar_url,
        visibility_score,
        reputation_score,
        ecosystem_layer
      `)
      .eq('archetype', agent.archetype)
      .neq('id', agent.id)
      .order('visibility_score', { ascending: false })
      .limit(4)

    fallbackAgents = data || []
  }

  const agentCrushScore =
    ranking?.score_total ??
    Number(agent.visibility_score || 0) + Number(agent.reputation_score || 0)

  const imageUrl =
    resolveImageUrl(agent.custom_background_url) ||
    resolveImageUrl(agent.avatar_url)
  const alternativeAgents = buildAlternativeAgents(ecosystemConnections, fallbackAgents)
  const compareCandidates = (compareCandidatesRaw || [])
    .map((row) => {
      const compareAgent = row.agent || {}
      if (!compareAgent.handle || compareAgent.id === agent.id) return null
      return {
        id: compareAgent.id || row.agent_id,
        handle: compareAgent.handle,
        display_name: compareAgent.display_name || compareAgent.handle,
        tagline: compareAgent.tagline || '',
        bio: compareAgent.bio || '',
        global_rank: row.global_rank ?? null,
        score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
        visibility_score: compareAgent.visibility_score ?? row.score_visibility ?? 0,
        reputation_score: compareAgent.reputation_score ?? row.score_reputation ?? 0,
        weekly_delta: compareAgent.weekly_delta || 0,
      }
    })
    .filter(Boolean)

  // Why trending: derive from most recent event type + weekly_delta
  const latestEventType = recentEvents?.[0]?.event_type || null
  const weeklyDelta = Number(agent.weekly_delta || 0)
  const whyMoving = getWhyMoving(weeklyDelta, latestEventType)
  const trendingSignals = [
    'High activity',
    'Growing attention',
    'Strong visibility',
  ]

  const catColor = getCatColor(archetype)
  const headerTags = [
    ...(agent.github_url ? ['GitHub'] : []),
    ...(agent.activity_status === 'active' || agent.status === 'active' ? ['Active'] : []),
  ]

  // Ecosystem sections for the V0 map panel
  const ecoSections = [
    { key: 'integrates_with', label: 'Integrates with' },
    { key: 'runs_on',         label: 'Runs on' },
    { key: 'framework_of',   label: 'Framework of' },
    { key: 'part_of_ecosystem', label: 'Part of ecosystem' },
  ].filter((s) => groupedConnections[s.key]?.length > 0)

  return (
    <main style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#e2e8f0' }}>
      <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── 1. AGENT HEADER (client — Watch button) ─────────────────── */}
        <AgentHeader
          displayName={displayName}
          handle={agent.handle}
          imageUrl={imageUrl}
          tagline={agent.tagline || bioText || ''}
          archetype={archetype}
          delta7d={weeklyDelta}
          trustState={trustState}
          claimHandle={agent.handle}
          externalUrl={agent.website_url || agent.github_url || null}
          tags={headerTags}
        />

        {/* ── 2. SCORE STRIP ───────────────────────────────────────────── */}
        <div style={{ ...PANEL, padding: 0 }}>
          <CornerAccentsServer color="#00e5ff" />
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {[
              { label: 'SCORE', value: agentCrushScore ? agentCrushScore.toLocaleString() : '—', color: '#f0f4ff', glow: undefined },
              { label: 'RANK',  value: ranking?.global_rank ? `#${ranking.global_rank}` : '—', color: '#fbbf24', glow: '0 0 10px rgba(251,191,36,0.6)' },
              { label: 'VIS',   value: String(agent.visibility_score ?? 0), color: '#00e5ff', glow: '0 0 8px rgba(0,229,255,0.5)' },
              { label: 'REP',   value: String(agent.reputation_score ?? 0), color: '#c084fc', glow: '0 0 8px rgba(192,132,252,0.5)' },
              { label: '7D',    value: weeklyDelta > 0 ? `+${weeklyDelta}` : weeklyDelta < 0 ? `${weeklyDelta}` : '—', color: weeklyDelta >= 0 ? '#4ade80' : '#f87171', glow: weeklyDelta >= 0 ? '0 0 10px rgba(74,222,128,0.5)' : '0 0 10px rgba(248,113,113,0.5)' },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0', gap: 2, borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <span style={LABEL_STYLE}>{stat.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: stat.color, textShadow: stat.glow }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. SCORE BREAKDOWN ───────────────────────────────────────── */}
        <div style={{ ...PANEL, padding: 0, overflow: 'hidden' }}>
          <CornerAccentsServer color="#ff40c8" />
          <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={LABEL_STYLE}>Score breakdown</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { label: 'Total Score',   value: agentCrushScore, display: agentCrushScore ? agentCrushScore.toLocaleString() : '—', max: maxScore, color: '#f0f4ff', suffix: '' },
              { label: 'Visibility',    value: agent.visibility_score ?? 0, display: String(agent.visibility_score ?? 0), max: 100, color: '#00e5ff', suffix: '/100' },
              { label: 'Reputation',    value: agent.reputation_score ?? 0, display: String(agent.reputation_score ?? 0), max: 100, color: '#c084fc', suffix: '/100' },
              { label: 'Weekly Delta',  value: Math.abs(weeklyDelta), display: weeklyDelta > 0 ? `+${weeklyDelta}` : weeklyDelta < 0 ? `${weeklyDelta}` : '—', max: 50, color: weeklyDelta >= 0 ? '#4ade80' : '#f87171', suffix: '' },
            ].map((item, i) => (
              <div key={item.label} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4, borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <span style={LABEL_STYLE}>{item.label}</span>
                <span style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.color, textShadow: `0 0 12px ${item.color}66` }}>
                  {item.display}
                  {item.suffix && <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.4 }}>{item.suffix}</span>}
                </span>
                <NeonBar value={item.value} max={item.max} color={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. WHAT THIS AGENT IS FOR ────────────────────────────────── */}
        {useCases.length > 0 && (
          <div style={{ ...PANEL, borderLeft: `2px solid ${catColor.glow}` }}>
            <CornerAccentsServer color={catColor.glow} />
            <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>What this agent does</div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
              {useCases.map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.6, color: 'rgba(226,232,240,0.75)' }}>
                  <span style={{ color: catColor.text, flexShrink: 0, marginTop: 1 }}>▸</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── 5. IDENTITY / STACK ──────────────────────────────────────── */}
        {(agent.identity_type || agent.builder_attribution || agent.framework || agent.runtime || (Array.isArray(agent.dependencies) && agent.dependencies.length > 0)) && (
          <div style={PANEL}>
            <CornerAccentsServer color="#818cf8" />
            <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Identity / Stack</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
              {[
                { label: 'Type',    value: agent.identity_type },
                { label: 'Builder', value: agent.builder_attribution },
                { label: 'Runtime', value: agent.runtime },
                { label: 'Framework', value: agent.framework },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={LABEL_STYLE}>{row.label}</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0' }}>{row.value}</span>
                </div>
              ))}
              {Array.isArray(agent.dependencies) && agent.dependencies.length > 0 && (
                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                  <span style={LABEL_STYLE}>Dependencies</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {agent.dependencies.map((dep) => (
                      <span key={dep} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)' }}>
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 6. ACTIVITY TIMELINE ─────────────────────────────────────── */}
        {(recentEvents || []).length > 0 && (
          <div style={PANEL}>
            <CornerAccentsServer color="#34d399" />
            <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentEvents.slice(0, 5).map((event) => {
                const dot = EVENT_DOT_COLORS[event.event_type] || '#818cf8'
                return (
                  <div key={event.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0, marginTop: 3, width: 6, height: 6, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'rgba(226,232,240,0.75)' }}>{formatProfileEventSummary(event)}</span>
                      <br />
                      <span style={{ color: 'rgba(226,232,240,0.35)', fontSize: 10 }}>{formatTimeAgo(event.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 7. ECOSYSTEM MAP ─────────────────────────────────────────── */}
        {(ecoSections.length > 0 || ecosystemConnections.length > 0) && (
          <div style={PANEL}>
            <CornerAccentsServer color="#00e5ff" />
            <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>Ecosystem Map</div>
            {ecoSections.length > 0 ? (
              ecoSections.map((section, sIdx) => {
                const conns = groupedConnections[section.key] || []
                return (
                  <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: sIdx < ecoSections.length - 1 ? 12 : 0 }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(226,232,240,0.4)' }}>{section.label}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {conns.slice(0, 6).map((conn, i) => {
                        const itemCat = getCatColor(conn.agent?.archetype)
                        const name = conn.connected_name || conn.connected_handle || '?'
                        const letter = name[0].toUpperCase()
                        const imgUrl = resolveImageUrl(conn.agent?.custom_background_url) || resolveImageUrl(conn.agent?.avatar_url)
                        return (
                          <Link
                            key={`${conn.connected_handle}-${i}`}
                            href={`/agent/${encodeURIComponent(conn.connected_handle)}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 4, background: itemCat.bg, border: `1px solid ${itemCat.glow}33`, fontSize: 10, fontWeight: 600, textDecoration: 'none' }}
                          >
                            <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: `${itemCat.glow}22`, color: itemCat.text, border: `1px solid ${itemCat.glow}55`, overflow: 'hidden', flexShrink: 0 }}>
                              {imgUrl ? <img src={imgUrl} alt={name} style={{ width: 22, height: 22, objectFit: 'cover' }} /> : letter}
                            </span>
                            <span style={{ color: itemCat.text }}>{name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.25)' }}>No ecosystem connections mapped yet.</div>
            )}
          </div>
        )}

        {/* ── 8. RELATED AGENTS ────────────────────────────────────────── */}
        {alternativeAgents.length > 0 && (
          <div style={PANEL}>
            <CornerAccentsServer color="#ff40c8" />
            <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Also Trending</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {alternativeAgents.map((rel) => {
                const relCat = getCatColor(rel.archetype)
                const relImg = resolveImageUrl(rel.avatar_url)
                const relName = rel.display_name || rel.handle || '?'
                return (
                  <Link
                    key={rel.id}
                    href={`/agent/${encodeURIComponent(rel.handle)}`}
                    style={{ flexShrink: 0, width: 140, padding: 10, borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: `1px solid ${relCat.glow}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, background: relCat.bg, border: `2px solid ${relCat.glow}`, boxShadow: `0 0 10px ${relCat.glow}55`, color: relCat.text, overflow: 'hidden', flexShrink: 0 }}>
                      {relImg ? <img src={relImg} alt={relName} style={{ width: 40, height: 40, objectFit: 'cover' }} /> : relName[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#e2e8f0' }}>{relName}</span>
                    <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.4)' }}>{rel.label || rel.archetype || ''}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        *::-webkit-scrollbar { width: 6px; height: 6px; }
        *::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        *::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 3px; }
        *::-webkit-scrollbar-thumb:hover { background: rgba(0,229,255,0.4); }
      `}</style>
    </main>
  )
}
