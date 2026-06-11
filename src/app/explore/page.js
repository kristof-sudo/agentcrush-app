export const metadata = {
  title: 'Explore AI Agents · AgentCrush',
  description: 'Browse all 1,350+ AI agents indexed by AgentCrush across 5 category methodologies (model families, tokenized, service, developer). Evidence-ranked agents with verified signals appear first.',
  openGraph: {
    title: 'Explore AI Agents · AgentCrush',
    description: 'Browse all 1,350+ AI agents indexed by AgentCrush. Evidence-ranked agents with verified signals appear first.',
    url: 'https://agentcrush.xyz/explore',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'Explore AI Agents — AgentCrush' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore AI Agents · AgentCrush',
    description: 'Browse all 1,350+ AI agents indexed by AgentCrush.',
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

  const top4 = agentsWithV2.filter((a) => a.tier === 'evidence_ranked' && a.v2_rank != null).slice(0, 4)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* TIER 02 eyebrow */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: '#00d4ff' }}>TIER 02 · EVIDENCE RANKED</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,212,255,0.2)' }} />
        <Link href="/rankings" className="font-mono text-[9px] text-white/30 hover:text-white/55 transition-colors">
          full rankings →
        </Link>
      </div>

      {/* Top-4 featured strip */}
      {top4.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {top4.map((a) => (
            <Link key={a.handle} href={`/agent/${encodeURIComponent(a.handle)}`}
              className="block rounded-lg border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.04)] px-3 py-2.5 hover:border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.07)] transition-all no-underline"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: '#00d4ff' }}>#{a.v2_rank}</span>
              </div>
              <div className="font-mono text-xs font-semibold text-white/80 truncate">{a.display_name || a.handle}</div>
              <div className="font-mono text-[10px] text-white/30 truncate">@{a.handle}</div>
            </Link>
          ))}
        </div>
      )}

      {/* TIER 01 eyebrow */}
      <div className="flex items-center gap-3 mb-3 mt-1">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/25">TIER 01 · FULL INDEX</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        <span className="font-mono text-[9px] text-white/25">{agents.length} agents · <span style={{ color: '#00d4ff' }}>{evidenceCount} ranked</span></span>
      </div>

      <ExploreSearch agents={agentsWithV2} />
    </main>
  )
}
