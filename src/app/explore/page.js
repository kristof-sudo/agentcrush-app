export const metadata = {
  title: 'Explore AI Agents · AgentCrush',
  description: 'Browse all 1,225+ AI agents indexed by AgentCrush. Evidence-ranked agents with verified signals appear first.',
  openGraph: {
    title: 'Explore AI Agents · AgentCrush',
    description: 'Browse all 1,225+ AI agents indexed by AgentCrush. Evidence-ranked agents with verified signals appear first.',
    url: 'https://agentcrush.xyz/explore',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'Explore AI Agents — AgentCrush' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore AI Agents · AgentCrush',
    description: 'Browse all 1,225+ AI agents indexed by AgentCrush.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

import { supabaseAnon } from '@/lib/supabase'
import ExploreSearch from '@/components/explore/ExploreSearch'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function fetchAllAgents(supabase) {
  const PAGE = 1000
  const all = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('agents')
      .select('id, handle, display_name, archetype, tagline, tier, avatar_url, website_url, github_url')
      .neq('tier', 'archived')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

export default async function ExplorePage() {
  const supabase = supabaseAnon()

  const [agents, { data: v2Rows }] = await Promise.all([
    fetchAllAgents(supabase),
    supabase
      .from('agent_score_v2_top50_public_candidate')
      .select('handle, rank_v2_c_public, score_v2_c_public_candidate')
      .eq('evidence_ready_for_public_rank', true),
  ])

  const v2ByHandle = {}
  for (const row of v2Rows || []) {
    v2ByHandle[row.handle] = row
  }

  const sorted = [...agents].sort((a, b) => {
    const ae = a.tier === 'evidence_ranked'
    const be = b.tier === 'evidence_ranked'
    if (ae && !be) return -1
    if (!ae && be) return 1
    if (ae && be) {
      const aRank = v2ByHandle[a.handle]?.rank_v2_c_public ?? 9999
      const bRank = v2ByHandle[b.handle]?.rank_v2_c_public ?? 9999
      return aRank - bRank
    }
    return (a.display_name || a.handle || '').localeCompare(b.display_name || b.handle || '')
  })

  const agentsWithV2 = sorted.map((agent) => ({
    ...agent,
    v2_rank: v2ByHandle[agent.handle]?.rank_v2_c_public ?? null,
    v2_score: v2ByHandle[agent.handle]?.score_v2_c_public_candidate ?? null,
  }))

  const evidenceCount = agentsWithV2.filter((a) => a.tier === 'evidence_ranked').length

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/rankings" className="font-mono text-[10px] text-white/30 hover:text-white/55 transition-colors">
            ← Evidence Rankings
          </Link>
        </div>
        <h1 className="font-mono text-2xl font-bold text-white tracking-tight">Explore Agents</h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          {agents.length} agents indexed ·{' '}
          <span style={{ color: '#39ff14' }}>{evidenceCount} evidence-ranked</span>
          {' '}· indexed agents sorted A–Z
        </p>
      </div>

      <div className="mb-5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 font-mono text-[11px] text-white/40 leading-relaxed">
        Explore the full AgentCrush index.{' '}
        <span className="rounded border border-[rgba(57,255,20,0.35)] bg-[rgba(57,255,20,0.08)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: '#39ff14' }}>Evidence-ranked</span>
        {' '}agents have enough signal for public ranking;{' '}
        <span className="rounded border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/30">indexed</span>
        {' '}agents are tracked but still accumulating evidence.
      </div>

      <ExploreSearch agents={agentsWithV2} />
    </main>
  )
}
