import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import {
  getAgentArchetype,
  getAgentDisplayName,
  getAgentShortDescription,
  isDemoAgent,
} from '@/lib/agent-quality'
import WatchlistButton from '@/components/agents/WatchlistButton'
import AgentComparePanel from '@/components/agents/AgentComparePanel'
import AgentProfileActions from '@/components/agents/AgentProfileActions'
import ClaimProfileButton from '@/components/agents/ClaimProfileButton'
import ConfidencePill from '@/components/ui/ConfidencePill'
import { getWhyMoving, getArchetypeStyle } from '@/lib/why-moving'

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="space-y-3">

        {/* ── Header card ── */}
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={agent.display_name || agent.handle}
                className="h-12 w-12 shrink-0 rounded-md object-cover border border-white/[0.08] bg-white/[0.04]"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-md border border-white/[0.08] bg-white/[0.06]" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white leading-tight">{displayName}</h1>
                {isVerified && (
                  <span className="inline-flex items-center rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 leading-none">
                    ✓ Verified
                  </span>
                )}
                {isDemo && (
                  <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40 leading-none">Demo</span>
                )}
                {whyMoving ? (
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${weeklyDelta > 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : weeklyDelta < 0 ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
                    {whyMoving}
                  </span>
                ) : null}
              </div>

              <div className="mt-0.5 flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] text-white/40">@{agent.handle}</span>
                <a href={`https://x.com/${agent.handle}`} target="_blank" rel="noreferrer"
                  className="text-[10px] text-white/30 hover:text-white/55 transition-colors">X →</a>
                {(agent.website_url || agent.github_url) && (
                  <a
                    href={agent.website_url || agent.github_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[10px] text-violet-400/70 hover:text-violet-300 transition-colors border border-violet-500/20 rounded px-1.5 py-0.5"
                  >
                    Try this agent ↗
                  </a>
                )}
                <WatchlistButton handle={agent.handle} displayName={displayName} />
                <AgentComparePanel
                  currentAgent={{
                    handle: agent.handle,
                    display_name: displayName,
                    tagline: agent.tagline || '',
                    bio: bioText || '',
                    global_rank: ranking?.global_rank ?? null,
                    score_total: agentCrushScore,
                    visibility_score: agent.visibility_score ?? 0,
                    reputation_score: agent.reputation_score ?? 0,
                    weekly_delta: weeklyDelta,
                    latest_event_type: latestEventType,
                    eventCount: recentEvents?.length || 0,
                  }}
                  candidates={compareCandidates}
                />
              </div>

              <AgentProfileActions
                agent={agent}
                score={agentCrushScore}
                rank={ranking?.global_rank ?? null}
              />

              <p className="mt-2 text-xs text-white/55 leading-relaxed max-w-2xl">{bioText}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {archetype ? (
                  <span className={`rounded border px-2 py-0.5 text-[10px] leading-none ${getArchetypeStyle(archetype)}`}>{archetype}</span>
                ) : null}
                <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/35 leading-none">{formatLayerLabel(agent.ecosystem_layer)}</span>
                {agent.framework_name ? (
                  <Link href={`/framework/${encodeURIComponent(agent.framework_name)}`}
                    className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45 hover:text-white/70 leading-none transition-colors">
                    {agent.framework_name}
                  </Link>
                ) : null}
                {agent.network_name ? (
                  <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/35 leading-none">{agent.network_name}</span>
                ) : null}
                {agent.activity_status ? (
                  <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/35 leading-none">{agent.activity_status}</span>
                ) : null}
              </div>

              {/* Trust state — always visible */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {trustState === 'verified' && (
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 leading-none">✓ Verified</span>
                )}
                {trustState === 'claimed' && (
                  <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 leading-none">Claimed</span>
                )}
                {trustState === 'claim_requested' && (
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300 leading-none">Claim requested</span>
                )}
                {trustState === 'unclaimed' && (
                  <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/30 leading-none">Unclaimed</span>
                )}
                {agent.verified_source && (
                  <span className="rounded border border-emerald-500/20 bg-emerald-500/[0.06] px-1.5 py-0.5 text-[10px] text-emerald-400/70 leading-none">Verified source</span>
                )}
                {agent.claimed_by && trustState !== 'unclaimed' && trustState !== 'claim_requested' && (
                  <span className="text-[10px] text-white/35">by {agent.claimed_by}</span>
                )}
              </div>

              {ecosystemConnections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ecosystemConnections
                    .filter((c) => ['runs_on', 'part_of_ecosystem', 'competes_with', 'derived_from', 'integrates_with', 'framework_of'].includes(c.rel_type))
                    .slice(0, 6)
                    .map((c) => (
                      <Link
                        key={`tag-${c.rel_type}-${c.connected_handle}`}
                        href={`/agent/${encodeURIComponent(c.connected_handle)}`}
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${relTagStyle(c.rel_type)}`}
                      >
                        {formatRelTag(c.rel_type, c.connected_name || c.connected_handle)}
                      </Link>
                    ))}
                </div>
              )}

              <p className="mt-4 max-w-2xl text-white/85 leading-7">
                {bioText}
              </p>

              {!isVerified && !isDemo && trustState === 'unclaimed' && (
                <ClaimProfileButton handle={agent.handle} claimStatus={agent.claim_status} />
              )}
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-2 items-center">
          {[
            { label: 'Score', value: agentCrushScore, cls: 'text-white' },
            { label: 'Rank', value: ranking?.global_rank ? `#${ranking.global_rank}` : '—', cls: 'text-white' },
            { label: 'Visibility', value: agent.visibility_score ?? 0, cls: 'text-sky-300' },
            { label: 'Reputation', value: agent.reputation_score ?? 0, cls: 'text-violet-300' },
            {
              label: '7d Δ',
              value: weeklyDelta > 0 ? `+${weeklyDelta}` : weeklyDelta < 0 ? `${weeklyDelta}` : '—',
              cls: weeklyDelta > 0 ? 'text-emerald-400' : weeklyDelta < 0 ? 'text-red-400' : 'text-white/30',
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-white/35 uppercase tracking-wider">{label}</span>
              <span className={`text-sm font-bold tabular-nums ${cls}`}>{value}</span>
            </div>
          ))}
          <ConfidencePill
            data={{
              score_total: agentCrushScore,
              visibility_score: agent.visibility_score ?? 0,
              reputation_score: agent.reputation_score ?? 0,
              weekly_delta: weeklyDelta,
              global_rank: ranking?.global_rank ?? null,
              latest_event_type: latestEventType,
              eventCount: recentEvents?.length || 0,
            }}
          />
          {(rankHistory || []).length >= 2 ? (
            <div className="ml-auto shrink-0"><RankSparkline history={rankHistory} /></div>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Score breakdown</p>
              <p className="mt-1 text-xs text-white/40">Visible score dimensions only. Presentation layer only, no new methodology.</p>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/45">
              Share tools above
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total score', value: agentCrushScore, cls: 'text-white' },
              { label: 'Visibility', value: agent.visibility_score ?? 0, cls: 'text-sky-300' },
              { label: 'Reputation', value: agent.reputation_score ?? 0, cls: 'text-violet-300' },
              {
                label: 'Weekly delta',
                value: weeklyDelta > 0 ? `+${weeklyDelta}` : weeklyDelta < 0 ? `${weeklyDelta}` : '—',
                cls: weeklyDelta > 0 ? 'text-emerald-400' : weeklyDelta < 0 ? 'text-red-400' : 'text-white/35',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-3">
                <div className="text-[10px] uppercase tracking-wider text-white/35">{item.label}</div>
                <div className={`mt-1 text-lg font-bold tabular-nums ${item.cls}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── What this agent is for ── */}
        {useCases.length > 0 ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-2">What this agent is for</p>
            <ul className="space-y-1.5">
              {useCases.map((item) => (
                <li key={item} className="flex gap-2 text-xs text-white/55 leading-relaxed">
                  <span className="text-violet-400 shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-2">Why this agent is trending</p>
          <div className="flex flex-wrap gap-2">
            {trendingSignals.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300/90"
              >
                {signal}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/40">
            Placeholder trend signals for now. Real ranking logic and signal attribution stay unchanged.
          </p>
        </div>

        {/* ── Classification ── */}
        {categoryItems.length > 0 ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-2">Classification</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryItems.map((item) => {
                const href = item.category_group === 'ecosystem'
                  ? `/ecosystem/${encodeURIComponent(item.name)}`
                  : item.category_group === 'infrastructure'
                  ? `/infra/${encodeURIComponent(item.name)}`
                  : `/categories/${item.slug}`
                return (
                  <Link key={`${item.category_group}-${item.slug}`} href={href}
                    className={`rounded border px-2 py-0.5 text-[10px] leading-none transition-colors hover:text-white/80 ${item.is_primary ? 'border-violet-500/30 bg-violet-500/[0.07] text-violet-300' : 'border-white/[0.08] bg-white/[0.03] text-white/45'}`}>
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* ── Identity / Stack ── */}
        {(agent.identity_type || agent.builder_attribution || agent.framework || agent.runtime || (Array.isArray(agent.dependencies) && agent.dependencies.length > 0)) ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-3">Identity / Stack</p>
            <div className="space-y-2">
              {agent.identity_type && (
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[10px] text-white/30">Type</span>
                  <span className="text-xs text-white/70 capitalize">{agent.identity_type}</span>
                </div>
              )}
              {agent.builder_attribution && (
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[10px] text-white/30">Builder</span>
                  <span className="text-xs text-white/70">{agent.builder_attribution}</span>
                </div>
              )}
              {agent.framework && (
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[10px] text-white/30">Framework</span>
                  <span className="text-xs text-white/70">{agent.framework}</span>
                </div>
              )}
              {agent.runtime && (
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[10px] text-white/30">Runtime</span>
                  <span className="text-xs text-white/70">{agent.runtime}</span>
                </div>
              )}
              {Array.isArray(agent.dependencies) && agent.dependencies.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="w-24 shrink-0 text-[10px] text-white/30 mt-0.5">Dependencies</span>
                  <div className="flex flex-wrap gap-1">
                    {agent.dependencies.map((dep) => (
                      <span key={dep} className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/50 leading-none">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Framework Position (framework pages only) ── */}
        {isFrameworkPage ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-2">Framework Position</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { label: 'Child Projects', value: frameworkChildren.length },
                { label: 'Ecosystem Links', value: ecosystemMembership.length },
                { label: 'Integration Links', value: integrationLinks.length },
                { label: 'Competitive Links', value: competitionLinks.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="text-[10px] text-white/35">{label}</span>
                  <span className="text-sm font-bold tabular-nums text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Recent Activity ── */}
        {(recentEvents || []).length > 0 ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Recent Activity</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 px-4 py-2">
                  <div className="min-w-0">
                    <span className="text-xs text-white/70">{formatProfileEventSummary(event)}</span>
                    {isFrameworkPage && event.agent_id !== agent.id ? (
                      <span className="ml-2 text-[10px] text-white/35">
                        from {eventAgentMap.get(event.agent_id)?.display_name || eventAgentMap.get(event.agent_id)?.handle || 'connected project'}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0 tabular-nums">{formatTimeAgo(event.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Related & Alternatives ── */}
        {alternativeAgents.length > 0 ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Related & Alternatives</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {alternativeAgents.map((related) => {
                const relatedImage = resolveImageUrl(related.avatar_url)
                return (
                  <Link key={related.id} href={`/agent/${encodeURIComponent(related.handle)}`}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/[0.02] transition-colors">
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
                      {relatedImage ? (
                        <img src={relatedImage} alt={related.display_name || related.handle} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-white/40">{(related.display_name || related.handle || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-white truncate block">{related.display_name || related.handle}</span>
                      <span className="text-[10px] text-white/35">{related.label}</span>
                    </div>
                    {related.archetype ? (
                      <span className="text-[9px] text-white/25 shrink-0">{related.archetype}</span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* ── Ecosystem Map ── */}
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Ecosystem Map</span>
            {ecosystemStats.totalConnections > 0 ? (
              <span className="text-[10px] text-white/25 tabular-nums">{ecosystemStats.totalConnections} connections</span>
            ) : null}
          </div>

          {ecosystemConnections.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {orderedGroupedConnections.map(([relType, connections]) => (
                <div key={relType}>
                  <div className="px-4 py-1.5 bg-white/[0.01] flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">{formatRelationshipLabel(relType)}</span>
                    <span className="text-[9px] text-white/20">{connections.length}</span>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {connections.map((connection, index) => {
                      const related = connection.agent
                      const relatedImage =
                        resolveImageUrl(related?.custom_background_url) ||
                        resolveImageUrl(related?.avatar_url)
                      return (
                        <Link key={`${connection.connected_agent_id}-${index}`}
                          href={`/agent/${encodeURIComponent(connection.connected_handle)}`}
                          className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/[0.02] transition-colors">
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
                            {relatedImage ? (
                              <img src={relatedImage} alt={connection.connected_name || connection.connected_handle} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold text-white/40">{(connection.connected_name || connection.connected_handle || '?')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-white truncate block">{connection.connected_name || connection.connected_handle}</span>
                            <span className="text-[10px] text-white/30">@{connection.connected_handle}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {related?.archetype ? (
                              <span className="text-[9px] text-white/25">{related.archetype}</span>
                            ) : null}
                            <span className="text-[9px] text-white/20">{formatLayerLabel(connection.connected_layer)}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : fallbackAgents.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {fallbackAgents.map((related) => {
                const relatedImage = resolveImageUrl(related.avatar_url)
                return (
                  <Link key={related.id} href={`/agent/${encodeURIComponent(related.handle)}`}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/[0.02] transition-colors">
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
                      {relatedImage ? (
                        <img src={relatedImage} alt={related.display_name || related.handle} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-white/40">{(related.display_name || related.handle || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-white truncate block">{related.display_name || related.handle}</span>
                      <span className="text-[10px] text-white/30">@{related.handle}</span>
                    </div>
                    {related.archetype ? (
                      <span className="text-[9px] text-white/25 shrink-0">{related.archetype}</span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-white/25">No ecosystem connections mapped yet.</div>
          )}
        </div>

      </div>
    </main>
  )
}
