import { createClient } from '@supabase/supabase-js'
import { getAllUseCaseSlugs } from '@/lib/use-cases'

const BASE_URL = 'https://agentcrush.xyz'

const STATIC_PAGES = [
  { path: '/',              priority: 1.0, changeFrequency: 'daily'  },
  { path: '/rankings',     priority: 0.9, changeFrequency: 'daily'  },
  { path: '/explore',      priority: 0.8, changeFrequency: 'daily'  },
  { path: '/categories',   priority: 0.8, changeFrequency: 'weekly' },
  { path: '/use-cases',    priority: 0.8, changeFrequency: 'weekly' },
  { path: '/about',        priority: 0.5, changeFrequency: 'monthly'},
  { path: '/how-it-works', priority: 0.5, changeFrequency: 'monthly'},
  { path: '/api-docs',     priority: 0.7, changeFrequency: 'monthly'},
  { path: '/for-agents',  priority: 0.7, changeFrequency: 'monthly'},
  { path: '/submit',       priority: 0.7, changeFrequency: 'monthly'},
  { path: '/compare',      priority: 0.7, changeFrequency: 'daily'  },
]

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default async function sitemap() {
  const supabase = makeSupabase()
  const now = new Date()

  // Static pages
  const staticEntries = STATIC_PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  // Agents
  let agentEntries = []
  if (supabase) {
    // Latest snapshot date per agent as lastModified
    const { data: snapshots } = await supabase
      .from('agent_snapshots')
      .select('agent_id, snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(5000)

    const latestSnapshotByAgent = {}
    for (const row of snapshots ?? []) {
      if (!latestSnapshotByAgent[row.agent_id]) {
        latestSnapshotByAgent[row.agent_id] = new Date(row.snapshot_date)
      }
    }

    const { data: agents } = await supabase
      .from('agents')
      .select('id, handle, tier')
      .eq('status', 'active')

    agentEntries = (agents ?? []).map((agent) => ({
      url: `${BASE_URL}/agent/${encodeURIComponent(agent.handle)}`,
      lastModified: latestSnapshotByAgent[agent.id] ?? now,
      changeFrequency: 'daily',
      priority: agent.tier === 'evidence_ranked' ? 0.8 : 0.6,
    }))
  }

  // Categories (from categories table)
  let categoryEntries = []
  if (supabase) {
    const { data: categories } = await supabase
      .from('categories')
      .select('slug')

    categoryEntries = (categories ?? []).map((cat) => ({
      url: `${BASE_URL}/categories/${encodeURIComponent(cat.slug)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
  }

  // Use cases (from static lib)
  const useCaseEntries = getAllUseCaseSlugs().map((slug) => ({
    url: `${BASE_URL}/use-cases/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Ecosystem / framework / infra dynamic routes
  let layerEntries = []
  if (supabase) {
    const { data: networks } = await supabase
      .from('agents')
      .select('network_name')
      .eq('ecosystem_layer', 'network')
      .not('network_name', 'is', null)
      .eq('status', 'active')

    const { data: frameworks } = await supabase
      .from('agents')
      .select('framework_name')
      .eq('ecosystem_layer', 'framework')
      .not('framework_name', 'is', null)
      .eq('status', 'active')

    const { data: infras } = await supabase
      .from('agents')
      .select('handle')
      .eq('ecosystem_layer', 'infrastructure')
      .eq('status', 'active')

    const seenNetworks = new Set()
    for (const row of networks ?? []) {
      if (row.network_name && !seenNetworks.has(row.network_name)) {
        seenNetworks.add(row.network_name)
        layerEntries.push({
          url: `${BASE_URL}/ecosystem/${encodeURIComponent(row.network_name)}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.5,
        })
      }
    }

    const seenFrameworks = new Set()
    for (const row of frameworks ?? []) {
      if (row.framework_name && !seenFrameworks.has(row.framework_name)) {
        seenFrameworks.add(row.framework_name)
        layerEntries.push({
          url: `${BASE_URL}/framework/${encodeURIComponent(row.framework_name)}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.5,
        })
      }
    }

    for (const row of infras ?? []) {
      layerEntries.push({
        url: `${BASE_URL}/infra/${encodeURIComponent(row.handle)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }
  }

  return [
    ...staticEntries,
    ...agentEntries,
    ...categoryEntries,
    ...useCaseEntries,
    ...layerEntries,
  ]
}
