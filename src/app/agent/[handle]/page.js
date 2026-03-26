import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

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
      activity_status
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

  const bioText = agent.bio || agent.tagline || 'No bio available yet.'
  const useCases = buildUseCases(agent, bioText)

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

  return (
    <main className="min-h-screen bg-[#050816] text-white px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={agent.display_name || agent.handle}
                className="h-28 w-28 rounded-2xl object-cover border border-white/10 bg-white/5"
              />
            ) : (
              <div className="h-28 w-28 rounded-2xl border border-white/10 bg-white/10" />
            )}

            <div className="flex-1">
              <h1 className="text-4xl font-bold">
                {agent.display_name || agent.handle}
              </h1>

              <p className="mt-2 text-white/70">@{agent.handle}</p>

              <p className="mt-2 text-sm text-white/60">{pageIntro}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                  Archetype: {agent.archetype || 'Unknown'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                  Layer: {formatLayerLabel(agent.ecosystem_layer)}
                </span>
                {agent.network_name ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                    Network: {agent.network_name}
                  </span>
                ) : null}
                {agent.activity_status ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                    Activity: {agent.activity_status}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 max-w-2xl text-white/85 leading-7">
                {bioText}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">What this agent is for</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {useCases.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-[3px] text-white/40">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">AgentCrush Score</div>
            <div className="mt-2 text-2xl font-semibold">{agentCrushScore}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Current Rank</div>
            <div className="mt-2 text-2xl font-semibold">
              {ranking?.global_rank ? `#${ranking.global_rank}` : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Visibility</div>
            <div className="mt-2 text-2xl font-semibold">
              {agent.visibility_score ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Reputation</div>
            <div className="mt-2 text-2xl font-semibold">
              {agent.reputation_score ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Weekly Delta</div>
            <div className="mt-2 text-2xl font-semibold">
              {agent.weekly_delta ?? 0}
            </div>
          </div>
        </div>

               <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Classification</h2>
          <p className="mt-1 text-sm text-white/60">
            How this project is positioned inside the AgentCrush ecosystem.
          </p>

          <div className="mt-4 space-y-4">
            {primaryCategories.length > 0 ? (
              <div>
                <div className="mb-2 text-sm font-medium text-white/70">Primary Type</div>
                <div className="flex flex-wrap gap-2">
                  {primaryCategories.map((item) => (
                    <Link
                      key={`${item.category_group}-${item.slug}`}
                      href={`/categories/${item.slug}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {frameworkCategories.length > 0 ? (
              <div>
                <div className="mb-2 text-sm font-medium text-white/70">Framework</div>
                <div className="flex flex-wrap gap-2">
                  {frameworkCategories.map((item) => (
                    <Link
                      key={`${item.category_group}-${item.slug}`}
                      href={`/categories/${item.slug}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {ecosystemCategories.length > 0 ? (
              <div>
                <div className="mb-2 text-sm font-medium text-white/70">Ecosystem</div>
                <div className="flex flex-wrap gap-2">
                  {ecosystemCategories.map((item) => (
                    <Link
                      key={`${item.category_group}-${item.slug}`}
                      href={`/categories/${item.slug}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {infrastructureCategories.length > 0 ? (
              <div>
                <div className="mb-2 text-sm font-medium text-white/70">Infrastructure</div>
                <div className="flex flex-wrap gap-2">
                  {infrastructureCategories.map((item) => (
                    <Link
                      key={`${item.category_group}-${item.slug}`}
                      href={`/categories/${item.slug}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {categoryItems.length === 0 ? (
              <div className="text-white/60">No classification mapped yet.</div>
            ) : null}
          </div>
        </div>

        {isFrameworkPage ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
              <div>
                <h2 className="text-xl font-semibold">Framework Position</h2>
                <p className="mt-1 text-sm text-white/60">
                  Snapshot of this framework&apos;s role inside the AgentCrush ecosystem.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/60">Child Projects</div>
                <div className="mt-2 text-2xl font-semibold">
                  {frameworkChildren.length}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/60">Ecosystem Links</div>
                <div className="mt-2 text-2xl font-semibold">
                  {ecosystemMembership.length}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/60">Integration Links</div>
                <div className="mt-2 text-2xl font-semibold">
                  {integrationLinks.length}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/60">Competitive Links</div>
                <div className="mt-2 text-2xl font-semibold">
                  {competitionLinks.length}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Recent Activity</h2>

          <div className="mt-4 space-y-3">
            {(recentEvents || []).length > 0 ? (
              recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">
                        {formatEventLabel(event.event_type)}
                      </div>
                      {isFrameworkPage && event.agent_id !== agent.id ? (
                        <div className="mt-1 text-xs text-white/50">
                          from {eventAgentMap.get(event.agent_id)?.display_name || eventAgentMap.get(event.agent_id)?.handle || 'connected project'}
                        </div>
                      ) : null}
                      <div className="mt-1 text-sm text-white/60">
                        {formatImpact(event)}
                      </div>
                    </div>
                    <div className="text-sm text-white/50">
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-white/60">No recent activity yet.</div>
            )}
          </div>
        </div>

        {alternativeAgents.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Related / alternative agents</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {alternativeAgents.map((related) => {
                const relatedImage = resolveImageUrl(related.avatar_url)

                return (
                  <Link
                    key={related.id}
                    href={`/agent/${encodeURIComponent(related.handle)}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {relatedImage ? (
                        <img
                          src={relatedImage}
                          alt={related.display_name || related.handle}
                          className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-white/5"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/10" />
                      )}

                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {related.display_name || related.handle}
                        </div>
                        <div className="truncate text-sm text-white/60">
                          @{related.handle}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-white/80 font-medium">
                      {related.label}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {related.ecosystem_layer ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                          {formatLayerLabel(related.ecosystem_layer)}
                        </span>
                      ) : null}

                      {related.archetype ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                          {related.archetype}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-sm text-white/60">
                      Score: {related.score}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
            <div>
              <h2 className="text-xl font-semibold">Ecosystem Summary</h2>
              <p className="mt-1 text-sm text-white/60">
                Structured overview of this project&apos;s ecosystem position.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Connections</div>
              <div className="mt-2 text-2xl font-semibold">
                {ecosystemStats.totalConnections}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Agent Links</div>
              <div className="mt-2 text-2xl font-semibold">
                {ecosystemStats.agents}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Framework Links</div>
              <div className="mt-2 text-2xl font-semibold">
                {ecosystemStats.frameworks}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Infrastructure Links</div>
              <div className="mt-2 text-2xl font-semibold">
                {ecosystemStats.infrastructure}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Network Links</div>
              <div className="mt-2 text-2xl font-semibold">
                {ecosystemStats.networks}
              </div>
            </div>
          </div>

          {topConnectionTypes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {topConnectionTypes.map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70"
                >
                  {formatRelationshipLabel(type)}: {count}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Ecosystem Map</h2>
              <p className="mt-1 text-sm text-white/60">
                {isFrameworkPage
                  ? 'Framework ecosystem graph. Projects, integrations, and competitive frameworks connected to this hub.'
                  : 'Structured ecosystem graph showing how this project connects to other agents and frameworks.'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-6">
            {ecosystemConnections.length > 0 ? (
              orderedGroupedConnections.map(([relType, connections]) => (
                <div key={relType}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                      {formatRelationshipLabel(relType)}
                    </h3>
                    <span className="text-xs text-white/45">
                      {connections.length}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {connections.map((connection, index) => {
                      const related = connection.agent
                      const relatedImage =
                        resolveImageUrl(related?.custom_background_url) ||
                        resolveImageUrl(related?.avatar_url)

                      return (
                        <Link
                          key={`${connection.connected_agent_id}-${index}`}
                          href={`/agent/${encodeURIComponent(connection.connected_handle)}`}
                          className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                        >
                          <div className="flex items-center gap-3">
                            {relatedImage ? (
                              <img
                                src={relatedImage}
                                alt={connection.connected_name || connection.connected_handle}
                                className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-white/5"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/10" />
                            )}

                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {connection.connected_name || connection.connected_handle}
                              </div>
                              <div className="truncate text-sm text-white/60">
                                @{connection.connected_handle}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-sm text-white/80 font-medium">
                            {formatRelationshipLabel(connection.rel_type)}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                              {formatLayerLabel(connection.connected_layer)}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                              Strength {connection.intensity ?? 1}
                            </span>
                          </div>

                          {related?.archetype ? (
                            <div className="mt-3 text-sm text-white/60">
                              Archetype: {related.archetype}
                            </div>
                          ) : null}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : fallbackAgents.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    Related by similarity
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fallbackAgents.map((related) => {
                    const relatedImage = resolveImageUrl(related.avatar_url)
                    const relatedScore =
                      Number(related.visibility_score || 0) +
                      Number(related.reputation_score || 0)

                    return (
                      <Link
                        key={related.id}
                        href={`/agent/${encodeURIComponent(related.handle)}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          {relatedImage ? (
                            <img
                              src={relatedImage}
                              alt={related.display_name || related.handle}
                              className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-white/5"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/10" />
                          )}

                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {related.display_name || related.handle}
                            </div>
                            <div className="truncate text-sm text-white/60">
                              @{related.handle}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-white/80 font-medium">
                          Related project
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                            {formatLayerLabel(related.ecosystem_layer)}
                          </span>
                        </div>

                        <div className="mt-3 text-sm text-white/60">
                          Fallback similarity • {related.archetype || 'Unknown'}
                        </div>

                        <div className="mt-2 text-sm text-white/80">
                          Score: {relatedScore}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-white/60">No ecosystem connections mapped yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
