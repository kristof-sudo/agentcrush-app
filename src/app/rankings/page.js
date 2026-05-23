import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import { getMovementReason, formatRelativeTime } from '@/lib/why-moving'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Agent Rankings — 4 Category Rankings · AgentCrush',
  description: 'Developer, Model Families, Tokenized, and Service agent rankings — all four evidence-based rankings in one place. AgentCrush is the public record of AI agents.',
  alternates: { canonical: 'https://agentcrush.xyz/rankings' },
  openGraph: {
    title: 'AI Agent Rankings · AgentCrush',
    description: '4 category rankings: Developer · Model Families · Tokenized · Service. Evidence-ranked, open methodology.',
    url: 'https://agentcrush.xyz/rankings',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/api/og?title=AI%20Agent%20Rankings&kicker=4%20CATEGORY%20RANKINGS&subtitle=Developer%20-%20Model%20Families%20-%20Tokenized%20-%20Service%20-%20Payments%20Stack', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Rankings · AgentCrush',
    description: '4 category rankings: Developer · Model Families · Tokenized · Service.',
    images: ['https://agentcrush.xyz/api/og?title=AI%20Agent%20Rankings&kicker=4%20CATEGORY%20RANKINGS&subtitle=Developer%20-%20Model%20Families%20-%20Tokenized%20-%20Service%20-%20Payments%20Stack'],
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/${path}` : null
}

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300', 'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300',       'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300',     'bg-cyan-500/25 text-cyan-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ── Category config ────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'developer',
    label: 'Developer',
    href: '/rankings/developer',
    methodology: 'v2.c-public',
    color: '#00d4ff',
    colorDim: 'rgba(0,212,255,0.08)',
    colorBorder: 'rgba(0,212,255,0.25)',
    signals: [
      { key: 'github_score',        label: 'GitHub',    color: '#00d4ff' },
      { key: 'package_usage_score', label: 'Packages',  color: '#a78bfa' },
      { key: 'ecosystem_score',     label: 'Ecosystem', color: '#e91e80' },
    ],
    scoreKey: 'score_v2_c_public_candidate',
    rankKey:  'rank_v2_c_public',
    description: 'Open-source developer agents — GitHub activity, package adoption, dependency graph, ecosystem relationships.',
  },
  {
    id: 'model-families',
    label: 'Model Families',
    href: '/rankings/model-families',
    methodology: 'v1.4-with-deployment',
    color: '#a78bfa',
    colorDim: 'rgba(167,139,250,0.08)',
    colorBorder: 'rgba(167,139,250,0.25)',
    signals: [
      { key: 'hf_score',          label: 'HuggingFace', color: '#a78bfa' },
      { key: 'lmarena_score',     label: 'LMArena',     color: '#00d4ff' },
      { key: 'deployment_score',  label: 'Deployment',  color: '#e91e80' },
    ],
    scoreKey: 'model_family_score',
    rankKey:  'rank_in_model_family',
    description: 'Base/foundation model lineages — HuggingFace adoption, LMArena capability, fine-tune derivatives, citations.',
  },
  {
    id: 'tokenized',
    label: 'Tokenized',
    href: '/rankings/tokenized-agents',
    methodology: 'v1.1-tokenized-tvl',
    color: '#39ff14',
    colorDim: 'rgba(57,255,20,0.06)',
    colorBorder: 'rgba(57,255,20,0.2)',
    signals: [
      { key: 'market_cap_score',         label: 'Market Cap', color: '#39ff14' },
      { key: 'liquidity_volume_score',   label: 'Liquidity',  color: '#00d4ff' },
      { key: 'holders_basket_score',     label: 'Holders',    color: '#a78bfa' },
    ],
    scoreKey: 'tokenized_score',
    rankKey:  'rank_in_tokenized',
    description: 'On-chain tokenized agents — market cap, liquidity, holder distribution, TVL, momentum.',
  },
  {
    id: 'service',
    label: 'Service',
    href: '/rankings/service-agents',
    methodology: 'v1.1-service-forks',
    color: '#f0a500',
    colorDim: 'rgba(240,165,0,0.06)',
    colorBorder: 'rgba(240,165,0,0.2)',
    signals: [
      { key: 'adoption_score',        label: 'Adoption', color: '#f0a500' },
      { key: 'source_quality_score',  label: 'Quality',  color: '#a78bfa' },
      { key: 'activity_score',        label: 'Activity', color: '#39ff14' },
    ],
    scoreKey: 'service_score',
    rankKey:  'rank_in_service',
    description: 'Callable AI agents — A2A, Agentverse, ERC-8004 service endpoints. Adoption, quality, protocol breadth.',
  },
]

// ── Row component (server) ─────────────────────────────────────────────────

function HubAgentRow({ agent, rank, scoreKey, signals, catColor }) {
  const avatarUrl = toPublicImageUrl(agent.custom_background_url || agent.avatar_url)
  const displayName = agent.display_name || agent.handle || '?'
  const score = Math.round(agent[scoreKey] ?? 0)
  const delta = agent.weekly_delta || 0
  const isTop3 = rank <= 3

  return (
    <Link
      href={`/agent/${encodeURIComponent(agent.handle)}`}
      className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.025] transition-colors group"
      style={{ borderLeft: isTop3 ? `2px solid ${catColor}` : '2px solid transparent' }}
    >
      {/* Rank */}
      <span
        className="font-mono text-[10px] font-bold tabular-nums shrink-0 w-5 text-right"
        style={{ color: isTop3 ? catColor : 'rgba(255,255,255,0.3)' }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <div className={`h-7 w-7 shrink-0 rounded overflow-hidden border border-white/[0.08] flex items-center justify-center ${!avatarUrl ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          : <span className="font-mono text-[9px] font-bold">{displayName[0].toUpperCase()}</span>
        }
      </div>

      {/* Name + signal bars */}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] font-semibold text-white/90 truncate group-hover:text-white transition-colors">
          {displayName}
        </div>
        <div className="mt-1 flex gap-1.5 items-center">
          {signals.map((sig) => {
            const val = Math.min(100, Math.max(0, agent[sig.key] ?? 0))
            return (
              <div key={sig.key} className="flex-1 min-w-0" title={`${sig.label}: ${val}`}>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${val}%`, background: sig.color, boxShadow: `0 0 4px ${sig.color}88` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <div className="font-mono text-xs font-bold tabular-nums text-white/85">{score}</div>
        {delta !== 0 && (
          <div className={`font-mono text-[9px] font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Category tile ──────────────────────────────────────────────────────────

function CategoryTile({ cat, rows, evidenceCount, totalCount }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden flex flex-col"
      style={{ border: `1px solid ${cat.colorBorder}`, background: '#0a0a14' }}
    >
      {/* Corner accents */}
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: cat.colorBorder }} />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: cat.colorBorder }} />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: cat.colorBorder }} />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: cat.colorBorder }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]" style={{ background: cat.colorDim }}>
        <div>
          <span className="font-mono text-sm font-bold" style={{ color: cat.color }}>{cat.label}</span>
          <span className="ml-2 font-mono text-[9px] text-white/30 uppercase tracking-wider">{cat.methodology}</span>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] font-bold tabular-nums" style={{ color: cat.color }}>{evidenceCount} ranked</div>
          <div className="font-mono text-[9px] text-white/25">{totalCount} tracked</div>
        </div>
      </div>

      {/* Description */}
      <p className="font-mono text-[10px] text-white/35 px-3 pt-2 pb-1 leading-relaxed">{cat.description}</p>

      {/* Column headers */}
      <div className="grid grid-cols-[20px_28px_1fr_40px] gap-2 px-3 py-1 border-b border-white/[0.04]">
        {['#', '', 'AGENT', 'SCORE'].map((h) => (
          <span key={h} className="font-mono text-[9px] text-white/20 uppercase tracking-wider">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-white/[0.04]">
        {rows.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[11px] text-white/25">Populating…</div>
        ) : (
          rows.map((agent, i) => (
            <HubAgentRow
              key={agent.handle}
              agent={agent}
              rank={i + 1}
              scoreKey={cat.scoreKey}
              signals={cat.signals}
              catColor={cat.color}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/[0.04] flex items-center justify-between">
        <span className="font-mono text-[9px] text-white/25">
          {evidenceCount > 5 ? `+${evidenceCount - 5} more` : 'evidence-ranked'}
        </span>
        <Link
          href={cat.href}
          className="font-mono text-[10px] font-semibold transition-colors"
          style={{ color: cat.color }}
        >
          Full ranking →
        </Link>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function RankingsHub() {
  const supabase = supabaseAnon()

  // Fetch top 5 evidence-ranked from each category view + counts
  const [
    { data: devRows },
    { data: mfRows },
    { data: tokRows },
    { data: svcRows },
    { count: devCount },
    { count: mfCount },
    { count: tokCount },
    { count: svcCount },
    { data: biggestMovers },
  ] = await Promise.all([
    supabase.from('agent_score_v2_top50_public_candidate')
      .select('handle, display_name, rank_v2_c_public, score_v2_c_public_candidate, github_score, package_usage_score, ecosystem_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_v2_c_public', { ascending: true })
      .limit(5),

    supabase.from('agent_score_model_family_v1')
      .select('agent_id, handle, display_name, model_family_score, rank_in_model_family, hf_score, lmarena_score, deployment_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_in_model_family', { ascending: true })
      .limit(5),

    supabase.from('agent_score_tokenized_v1')
      .select('agent_id, handle, display_name, tokenized_score, rank_in_tokenized, market_cap_score, liquidity_volume_score, holders_basket_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_in_tokenized', { ascending: true })
      .limit(5),

    supabase.from('agent_score_service_v1')
      .select('agent_id, handle, display_name, service_score, rank_in_service, adoption_score, source_quality_score, activity_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_in_service', { ascending: true })
      .limit(5),

    supabase.from('agent_score_v2_top50_public_candidate')
      .select('handle', { count: 'exact', head: true })
      .eq('evidence_ready_for_public_rank', true),

    supabase.from('agent_score_model_family_v1')
      .select('agent_id', { count: 'exact', head: true })
      .eq('evidence_ready_for_public_rank', true),

    supabase.from('agent_score_tokenized_v1')
      .select('agent_id', { count: 'exact', head: true })
      .eq('evidence_ready_for_public_rank', true),

    supabase.from('agent_score_service_v1')
      .select('agent_id', { count: 'exact', head: true })
      .eq('evidence_ready_for_public_rank', true),

    supabase.from('agents')
      .select('id, handle, display_name, avatar_url, custom_background_url, weekly_delta, archetype')
      .gt('weekly_delta', 0)
      .order('weekly_delta', { ascending: false })
      .limit(8),
  ])

  // Enrich the 4 category view rows with avatar/delta from agents table
  const allHandles = [
    ...(devRows || []).map(r => r.handle),
    ...(mfRows || []).map(r => r.handle),
    ...(tokRows || []).map(r => r.handle),
    ...(svcRows || []).map(r => r.handle),
  ].filter(Boolean)

  const { data: agentsData } = allHandles.length > 0
    ? await supabase.from('agents')
        .select('id, handle, display_name, avatar_url, custom_background_url, weekly_delta, archetype')
        .in('handle', allHandles)
    : { data: [] }

  const byHandle = {}
  for (const a of agentsData || []) byHandle[a.handle] = a

  function enrichRows(rows, scoreKey, rankKey) {
    return (rows || []).map(row => ({
      ...row,
      ...(byHandle[row.handle] || {}),
      [scoreKey]: row[scoreKey],
      [rankKey]: row[rankKey],
    }))
  }

  const devEnriched  = enrichRows(devRows,  'score_v2_c_public_candidate', 'rank_v2_c_public')
  const mfEnriched   = enrichRows(mfRows,   'model_family_score', 'rank_in_model_family')
  const tokEnriched  = enrichRows(tokRows,  'tokenized_score', 'rank_in_tokenized')
  const svcEnriched  = enrichRows(svcRows,  'service_score', 'rank_in_service')

  // Fetch total tracked counts
  const [{ count: devTotal }, { count: mfTotal }, { count: tokTotal }, { count: svcTotal }] = await Promise.all([
    supabase.from('agent_score_v2_top50_public_candidate').select('handle', { count: 'exact', head: true }),
    supabase.from('agent_score_model_family_v1').select('agent_id', { count: 'exact', head: true }),
    supabase.from('agent_score_tokenized_v1').select('agent_id', { count: 'exact', head: true }),
    supabase.from('agent_score_service_v1').select('agent_id', { count: 'exact', head: true }),
  ])

  const categoryData = [
    { cat: CATEGORIES[0], rows: devEnriched,  evidenceCount: devCount || 0,  totalCount: devTotal || 0  },
    { cat: CATEGORIES[1], rows: mfEnriched,   evidenceCount: mfCount || 0,   totalCount: mfTotal || 0   },
    { cat: CATEGORIES[2], rows: tokEnriched,  evidenceCount: tokCount || 0,  totalCount: tokTotal || 0  },
    { cat: CATEGORIES[3], rows: svcEnriched,  evidenceCount: svcCount || 0,  totalCount: svcTotal || 0  },
  ]

  const totalEvidenceRanked = (devCount || 0) + (mfCount || 0) + (tokCount || 0) + (svcCount || 0)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: '#e91e80' }}>RANKINGS</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(233,30,128,0.2)' }} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-michroma,'Michroma',sans-serif)" }}>
          The <span style={{ color: '#e91e80' }}>4 Rankings</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          {totalEvidenceRanked} evidence-ranked agents across 4 category methodologies ·{' '}
          <Link href="/methodology" className="text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">
            how rankings work →
          </Link>
        </p>
      </div>

      {/* ── 2×2 Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {categoryData.map(({ cat, rows, evidenceCount, totalCount }) => (
          <CategoryTile
            key={cat.id}
            cat={cat}
            rows={rows}
            evidenceCount={evidenceCount}
            totalCount={totalCount}
          />
        ))}
      </div>

      {/* ── Agent Payments Stack callout (Phase 3.5 Week 1) ─────────────── */}
      <Link
        href="/rankings/agent-payments-stack"
        className="group block mb-8 rounded-lg border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.05] to-transparent hover:border-emerald-400/40 transition-colors px-5 py-4"
      >
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-300">NEW · CROSS-CATEGORY</span>
          <span className="font-mono text-[9px] text-white/30">v1.0-aps</span>
          <span className="ml-auto font-mono text-[10px] text-white/40 group-hover:text-white/70 transition-colors">open →</span>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-bold text-white text-base">The Agent Payments Stack</span>
          <span className="text-xs text-white/45">6 layers · projects ranked by stack coverage</span>
        </div>
        <p className="mt-2 text-xs text-white/55 leading-relaxed max-w-3xl">
          Settlement · Wallets · Routing · Protocol · Governance · Application. Live map of who covers what — Coinbase + Stripe each span 5/6 layers. Sourced from the Keyrock &quot;Who Pays The Agent?&quot; report (May 2026) + AgentCrush evidence ranking.
        </p>
      </Link>

      {/* ── Cross-index movers + narrative ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Biggest movers (cross-index) */}
        {(biggestMovers || []).length > 0 && (
          <div className="relative rounded-lg border border-white/[0.08] bg-[#0a0a14] overflow-hidden">
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(57,255,20,0.3)]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(57,255,20,0.3)]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(57,255,20,0.3)]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(57,255,20,0.3)]" />
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] font-bold" style={{ color: '#39ff14' }}>↑</span>
              <span className="font-mono text-xs font-bold text-white">CROSS-INDEX BIGGEST MOVERS</span>
              <span className="ml-auto font-mono text-[9px] text-white/20">7d delta</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {(biggestMovers || []).map((agent) => {
                const avatarUrl = toPublicImageUrl(agent.custom_background_url || agent.avatar_url)
                const displayName = agent.display_name || agent.handle || '?'
                return (
                  <Link key={agent.id} href={`/agent/${encodeURIComponent(agent.handle)}`}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.025] transition-colors">
                    <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.08] flex items-center justify-center text-[8px] font-bold font-mono ${!avatarUrl ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                      {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : displayName[0].toUpperCase()}
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-white/85 truncate flex-1 min-w-0">{displayName}</span>
                    {agent.archetype && (
                      <span className="font-mono text-[9px] text-white/30 shrink-0">{agent.archetype}</span>
                    )}
                    <span className="shrink-0 rounded border border-[rgba(57,255,20,0.25)] bg-[rgba(57,255,20,0.06)] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums" style={{ color: '#39ff14' }}>
                      +{agent.weekly_delta}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly narrative */}
        <div className="relative rounded-lg border border-[rgba(233,30,128,0.12)] bg-[#0a0a14] overflow-hidden">
          <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(233,30,128,0.3)]" />
          <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(233,30,128,0.3)]" />
          <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(233,30,128,0.3)]" />
          <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(233,30,128,0.3)]" />
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] font-bold text-[#e91e80]">◆</span>
            <span className="font-mono text-xs font-bold text-white">THIS WEEK'S INDICES</span>
          </div>
          <div className="px-3 py-3 space-y-3">
            {categoryData.map(({ cat, evidenceCount }) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold w-28 shrink-0" style={{ color: cat.color }}>
                  {cat.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (evidenceCount / 100) * 100)}%`,
                      background: cat.color,
                      boxShadow: `0 0 6px ${cat.color}66`,
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-white/50 tabular-nums shrink-0 w-12 text-right">
                  {evidenceCount} ranked
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-white/[0.04] font-mono text-[10px] text-white/30 leading-relaxed">
              Multi-signal scoring inverts single-source rankings. Different signals tell different stories — this is the defensible value.{' '}
              <Link href="/methodology" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">
                Read methodology →
              </Link>
            </div>
          </div>
        </div>

      </div>

    </main>
  )
}
