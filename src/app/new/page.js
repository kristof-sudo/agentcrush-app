/**
 * /new — New Agents Radar
 *
 * Recently indexed/promoted agents. DexScan equivalent.
 * Feeds daily discovery narrative for Ajsa.
 * Mobile-first, 390px primary.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 1800

export const metadata = {
  title: 'New Agents Radar · AgentCrush',
  description: 'Recently indexed and newly evidence-ranked AI agents. Updated continuously from GitHub, Virtuals, Agentverse, ERC-8004, and direct submissions.',
  alternates: { canonical: 'https://agentcrush.xyz/new' },
  openGraph: {
    title: 'New Agents Radar — AgentCrush',
    description: 'The freshest additions to the AI agent economy index.',
    url: 'https://agentcrush.xyz/new',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const CATEGORY_COLOR = {
  developer:    '#00d4ff',
  tokenized:    '#39ff14',
  service:      '#f0a500',
  model_family: '#a78bfa',
  mcp_server:   '#f97316',
}

const CATEGORY_LABEL = {
  developer:    'Developer',
  tokenized:    'Tokenized',
  service:      'Service',
  model_family: 'Model Family',
  mcp_server:   'MCP Server',
}

function timeAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1)  return 'just now'
  if (h < 24) return `${h}h ago`
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function getNewAgents() {
  const sb = db()

  // Recently indexed (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: recentlyIndexed } = await sb
    .from('agents')
    .select('handle, display_name, bio, primary_category, tier, created_at, website_url, github_url, activity_status')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(30)

  // Recently promoted to evidence_ranked (last 14 days, using tier_promoted_at)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString()

  const { data: recentlyPromoted } = await sb
    .from('agents')
    .select('handle, display_name, bio, primary_category, tier, tier_promoted_at, created_at, website_url, github_url, activity_status')
    .eq('tier', 'evidence_ranked')
    .gte('tier_promoted_at', fourteenDaysAgo)
    .order('tier_promoted_at', { ascending: false })
    .limit(20)

  return {
    recentlyIndexed:  recentlyIndexed  || [],
    recentlyPromoted: recentlyPromoted || [],
  }
}

function AgentRow({ agent, timestamp, label }) {
  const cat = agent.primary_category
  const color = CATEGORY_COLOR[cat] || '#ffffff44'
  const catLabel = CATEGORY_LABEL[cat] || cat || 'Unknown'
  const name = agent.display_name || agent.handle
  const isAlive = agent.activity_status === 'active'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      {/* Category dot */}
      <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/agent/${agent.handle}`}
            className="text-sm font-semibold text-white/85 hover:text-white transition-colors truncate"
          >
            {name}
          </Link>
          {isAlive && (
            <span className="text-[9px] font-mono bg-green-500/10 text-green-400/70 px-1 py-0.5 rounded">alive</span>
          )}
        </div>
        <p className="text-[11px] text-white/30 mt-0.5 truncate">
          {agent.bio ? agent.bio.slice(0, 80) : agent.handle}
        </p>
      </div>

      {/* Meta */}
      <div className="text-right shrink-0">
        <p className="text-[10px] font-mono" style={{ color: color + 'aa' }}>{catLabel}</p>
        <p className="text-[10px] text-white/25 mt-0.5">{timeAgo(timestamp)}</p>
      </div>
    </div>
  )
}

export default async function NewAgentsPage() {
  let data
  try { data = await getNewAgents() }
  catch (_) { data = { recentlyIndexed: [], recentlyPromoted: [] } }

  const { recentlyIndexed, recentlyPromoted } = data

  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
        <span className="mx-2 text-white/15">/</span>
        New
      </p>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          New Agents
        </h1>
        <span className="text-[10px] font-mono text-white/25 bg-white/[0.04] px-2 py-1 rounded">
          live
        </span>
      </div>
      <p className="text-sm text-white/45 mb-10">
        Recently indexed and newly evidence-ranked agents — the freshest additions to the index.
      </p>

      {/* Promoted to evidence-ranked */}
      {recentlyPromoted.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70">
              Newly Evidence-Ranked
            </h2>
            <span className="text-[10px] font-mono text-white/20">last 14 days</span>
          </div>
          <div className="rounded-lg border border-[#00d4ff]/10 bg-[#00d4ff]/[0.02] px-4">
            {recentlyPromoted.map(agent => (
              <AgentRow
                key={agent.handle}
                agent={agent}
                timestamp={agent.tier_promoted_at || agent.created_at}
                label="promoted"
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently indexed */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Recently Indexed
          </h2>
          <span className="text-[10px] font-mono text-white/20">last 30 days</span>
        </div>

        {recentlyIndexed.length > 0 ? (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4">
            {recentlyIndexed.map(agent => (
              <AgentRow
                key={agent.handle}
                agent={agent}
                timestamp={agent.created_at}
                label="indexed"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30 py-6 text-center">No new agents indexed in the last 30 days.</p>
        )}
      </section>

      {/* Submit */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 mb-8">
        <p className="text-sm font-semibold text-white/70 mb-1">Submit an agent</p>
        <p className="text-xs text-white/40 mb-3">
          Know an agent that should be indexed? Submit it and it&apos;ll appear here within 24 hours if it passes the evidence threshold.
        </p>
        <Link
          href="/submit"
          className="inline-block text-xs font-mono text-[#00d4ff]/70 border border-[#00d4ff]/20 px-3 py-1.5 rounded hover:bg-[#00d4ff]/[0.06] transition-colors"
        >
          Submit agent →
        </Link>
      </div>

      {/* Machine-readable */}
      <div className="text-[11px] text-white/25 mb-8">
        Machine-readable:{' '}
        <a href="/api/agents/dataset?sort=created_at&order=desc&limit=50" className="text-[#00d4ff]/40 hover:text-[#00d4ff] font-mono transition-colors">
          /api/agents/dataset?sort=created_at&order=desc
        </a>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">Rankings →</Link>
        <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
        <Link href="/agent-economy-index" className="hover:text-white/70 transition-colors">Economy →</Link>
      </div>

    </main>
  )
}
