import Container from '@/components/ui/Container'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/why-moving'

// ── Helpers ────────────────────────────────────────────────────────────────

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

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/${path}` : null
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

// ── Manifest verbs ─────────────────────────────────────────────────────────

const VERBS = [
  {
    n: '01', verb: 'DISCOVER', color: '#00d4ff',
    tagline: 'Index every AI agent that leaves a public signal.',
    chips: ['GitHub', 'npm', 'PyPI', 'HuggingFace', 'x402', 'ERC-8004', 'Virtuals', 'Agentverse', 'A2A', 'MCP'],
    note: 'Protocol-neutral. We read the registries; we don\'t belong to any of them.',
  },
  {
    n: '02', verb: 'VERIFY', color: '#39ff14',
    tagline: 'Check every claim against its primary source.',
    chips: ['GitHub commits', 'npm downloads', 'on-chain holders', 'Bazaar endpoints', 'A2A stars'],
    note: 'No self-reported data. Every signal has a source URL.',
  },
  {
    n: '03', verb: 'SCORE', color: '#e91e80',
    tagline: 'Rank by evidence, not by who shouted loudest.',
    chips: ['v2.c-public (developer)', 'v1.4 (model families)', 'v1.1-tvl (tokenized)', 'v1.1-forks (service)'],
    note: 'Four separate methodologies. Each one documented, versioned, and publicly auditable.',
  },
  {
    n: '04', verb: 'TRACK', color: '#a78bfa',
    tagline: 'Snapshot every indexed agent daily. Store it forever.',
    chips: ['daily snapshots', 'weekly delta', 'rank history', 'signal history', 'trend detection'],
    note: 'Other directories show today\'s list. We show how rankings change over time.',
  },
  {
    n: '05', verb: 'EXPOSE', color: '#f0a500',
    tagline: 'Make the data callable — by humans and by agents.',
    chips: ['MCP server (free)', 'x402 REST endpoints', 'OpenAPI 3.1', 'JSON-LD', '/llms.txt'],
    note: '$0.02 / call on Base. No API key needed. Your agent can pay with USDC.',
  },
  {
    n: '06', verb: 'PUBLISH', color: '#60a5fa',
    tagline: 'Ship findings in public. Let anyone cite them.',
    chips: ['open methodology', 'versioned diffs', 'citable blog posts', 'weekly digest', 'RSS'],
    note: 'Every methodology change is logged. Every post has a citation block.',
  },
]

// ── Category config (mirrors /rankings hub) ────────────────────────────────

const CATEGORIES = [
  {
    id: 'developer',    label: 'Developer',      href: '/rankings/developer',
    color: '#00d4ff',   colorDim: 'rgba(0,212,255,0.06)',   colorBorder: 'rgba(0,212,255,0.2)',
    methodology: 'v2.c-public',
    scoreKey: 'score_v2_c_public_candidate', rankKey: 'rank_v2_c_public',
    signals: [
      { key: 'github_score',        color: '#00d4ff' },
      { key: 'package_usage_score', color: '#a78bfa' },
      { key: 'ecosystem_score',     color: '#e91e80' },
    ],
  },
  {
    id: 'model-families', label: 'Model Families', href: '/rankings/model-families',
    color: '#a78bfa',   colorDim: 'rgba(167,139,250,0.06)', colorBorder: 'rgba(167,139,250,0.2)',
    methodology: 'v1.4',
    scoreKey: 'model_family_score', rankKey: 'rank_in_model_family',
    signals: [
      { key: 'hf_score',         color: '#a78bfa' },
      { key: 'lmarena_score',    color: '#00d4ff' },
      { key: 'deployment_score', color: '#e91e80' },
    ],
  },
  {
    id: 'tokenized', label: 'Tokenized', href: '/rankings/tokenized-agents',
    color: '#39ff14',   colorDim: 'rgba(57,255,20,0.04)',   colorBorder: 'rgba(57,255,20,0.15)',
    methodology: 'v1.1-tvl',
    scoreKey: 'tokenized_score', rankKey: 'rank_in_tokenized',
    signals: [
      { key: 'market_cap_score',       color: '#39ff14' },
      { key: 'liquidity_volume_score', color: '#00d4ff' },
      { key: 'holders_basket_score',   color: '#a78bfa' },
    ],
  },
  {
    id: 'service', label: 'Service', href: '/rankings/service-agents',
    color: '#f0a500',   colorDim: 'rgba(240,165,0,0.04)',   colorBorder: 'rgba(240,165,0,0.18)',
    methodology: 'v1.1-forks',
    scoreKey: 'service_score', rankKey: 'rank_in_service',
    signals: [
      { key: 'adoption_score',       color: '#f0a500' },
      { key: 'source_quality_score', color: '#a78bfa' },
      { key: 'activity_score',       color: '#39ff14' },
    ],
  },
]

const SIGNAL_EVENT_STYLES = {
  repo_star_growth:      { dot: '#39ff14', kind: 'STAR' },
  audience_spike:        { dot: '#e91e80', kind: 'BUZZ' },
  ranking_jump:          { dot: '#39ff14', kind: 'MOVE' },
  repo_release:          { dot: '#e91e80', kind: 'PUB'  },
  timeline_ping:         { dot: '#a78bfa', kind: 'PRESS' },
  launch_buzz:           { dot: '#00d4ff', kind: 'BUZZ' },
  dev_activity:          { dot: '#60a5fa', kind: 'DEV'  },
  agent_joined:          { dot: '#f0a500', kind: 'INDEX' },
  daily_boost:           { dot: '#39ff14', kind: 'ACTIVE' },
  ecosystem_integration: { dot: '#00d4ff', kind: 'INTEG' },
}

function eventStyle(type) {
  return SIGNAL_EVENT_STYLES[type] || { dot: '#94a3b8', kind: 'SIG' }
}

function eventLabel(event) {
  const meta = event?.metadata || {}
  const n = (...keys) => { for (const k of keys) { const v = Number(meta[k]); if (!isNaN(v) && v > 0) return v } return null }
  const s = (...keys) => { for (const k of keys) { if (typeof meta[k] === 'string' && meta[k].trim()) return meta[k].trim() } return null }
  switch (event?.event_type) {
    case 'repo_star_growth':      return `+${n('stars_gained','star_gain','stars') || '?'} GitHub stars`
    case 'repo_release':          return `released ${s('release_name','version','tag_name') || 'new version'}`
    case 'audience_spike':        return `${n('mention_count','mentions','post_count') || '?'} X mentions`
    case 'ranking_jump':          return `climbed ${n('rank_jump','positions_gained','rank_delta') || '?'} spots`
    case 'timeline_ping':         return `${n('mention_count','mentions') || '?'} ecosystem mentions`
    case 'launch_buzz':           return 'launch buzz'
    case 'dev_activity':          return 'dev activity'
    case 'agent_joined':          return 'joined the index'
    case 'daily_boost':           return 'fresh activity'
    case 'ecosystem_integration': return `integrated ${s('integration_name','partner','framework') || 'new protocol'}`
    default:                      return 'activity'
  }
}

// ── Blog posts (static for now — update when blog grows) ──────────────────

const BLOG_POSTS = [
  {
    slug: 'agent-commerce-readiness-three-audits',
    title: 'Three Agent Commerce Readiness Audits',
    date: '2026-05',
    tag: 'Findings',
    tagColor: '#e91e80',
  },
  {
    slug: 'first-cross-protocol-agent',
    title: 'The First Cross-Protocol Agent',
    date: '2026-05',
    tag: 'Findings',
    tagColor: '#e91e80',
  },
  {
    slug: 'x402-discovery-postmortem',
    title: 'x402 Discovery Post-mortem',
    date: '2026-04',
    tag: 'Update',
    tagColor: '#60a5fa',
  },
]

// ── MCP tools list ─────────────────────────────────────────────────────────

const MCP_TOOLS = [
  'search_agents', 'get_agent_details', 'get_agent_history',
  'compare_agents', 'list_categories', 'get_category_ranking', 'get_methodology',
]

// ── Metadata (updated in Phase 1) ─────────────────────────────────────────

export const metadata = {
  title: 'AgentCrush — The public record of AI agents.',
  description: 'AgentCrush is the public record of AI agents. Independent, cross-protocol, open methodology. Track, compare, and query AI agents across GitHub, npm, HuggingFace, x402, ERC-8004, A2A, MCP, and on-chain registries.',
  openGraph: {
    title: 'AgentCrush — The public record of AI agents.',
    description: 'Independent. Cross-protocol. Open methodology. Machine-callable from your code or your agent.',
    url: 'https://www.agentcrush.xyz',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — The public record of AI agents.' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush — The public record of AI agents.',
    description: 'Independent. Cross-protocol. Open methodology. Machine-callable from your code or your agent.',
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

// ── JSON-LD (updated in Phase 1) ───────────────────────────────────────────

function HomepageJsonLd({ evidenceRankedCount }) {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://www.agentcrush.xyz#org',
      name: 'AgentCrush',
      alternateName: ['Agent Crush', 'agentcrush.xyz'],
      url: 'https://www.agentcrush.xyz',
      logo: 'https://www.agentcrush.xyz/agentcrush-logo.png',
      description: 'AgentCrush is the public record of AI agents. Independent, cross-protocol index tracking AI agents across HuggingFace, LMArena, GitHub, on-chain registries (ERC-8004), tokenized agent protocols (Virtuals), service registries (Agentverse / A2A), and machine-payable endpoints (x402 / CDP Bazaar). Open methodology, machine-callable API. Distinct from "Crush" (Charmbracelet\'s terminal AI coding assistant) and from "Agent Rush" (unrelated service).',
      slogan: 'The public record of AI agents.',
      sameAs: ['https://x.com/agentcrush_xyz', 'https://warpcast.com/agentcrush'],
      contactPoint: { '@type': 'ContactPoint', email: 'contact@agentcrush.xyz', contactType: 'customer service' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://www.agentcrush.xyz#site',
      url: 'https://www.agentcrush.xyz',
      name: 'AgentCrush',
      description: `Evidence-ranked index of AI agents across 4 category methodologies (model families, tokenized, service, developer). ${evidenceRankedCount} evidence-ranked. Live MCP server + free JSON endpoints for LLM retrieval.`,
      publisher: { '@id': 'https://www.agentcrush.xyz#org' },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.agentcrush.xyz/rankings?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      '@id': 'https://www.agentcrush.xyz/methodology',
      name: 'AgentCrush Evidence-Ranked Index',
      description: 'Multi-signal AI agent reputation index. 4 category methodologies with documented weights, formulas, evidence-ready rules, and limitations.',
      url: 'https://www.agentcrush.xyz/methodology',
      creator: { '@id': 'https://www.agentcrush.xyz#org' },
      keywords: ['AI agents', 'agent economy', 'agent ranking', 'multi-signal scoring', 'MCP', 'x402', 'ERC-8004'],
      isAccessibleForFree: true,
      license: 'https://www.agentcrush.xyz/terms',
      distribution: [
        { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://www.agentcrush.xyz/api/agent-economy/llm-summary' },
        { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://www.agentcrush.xyz/.well-known/mcp.json' },
      ],
    },
  ]
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }) } }
  )

  // ── Data fetching ──────────────────────────────────────────────────────

  const [
    { count: agentCount },
    { count: erDeveloper },
    { data: devRows },
    { data: mfRows },
    { data: tokRows },
    { data: svcRows },
    { data: events },
    { count: snapshotCount },
  ] = await Promise.all([
    supabase.from('agents').select('id', { count: 'exact', head: true }),

    supabase.from('agent_score_v2_top50_public_candidate')
      .select('handle', { count: 'exact', head: true })
      .eq('evidence_ready_for_public_rank', true),

    supabase.from('agent_score_v2_top50_public_candidate')
      .select('handle, display_name, score_v2_c_public_candidate, rank_v2_c_public, github_score, package_usage_score, ecosystem_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_v2_c_public', { ascending: true })
      .limit(3),

    supabase.from('agent_score_model_family_v1')
      .select('agent_id, handle, display_name, model_family_score, rank_in_model_family, hf_score, lmarena_score, deployment_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_in_model_family', { ascending: true })
      .limit(3),

    supabase.from('agent_score_tokenized_v1')
      .select('agent_id, handle, display_name, tokenized_score, rank_in_tokenized, market_cap_score, liquidity_volume_score, holders_basket_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_in_tokenized', { ascending: true })
      .limit(3),

    supabase.from('agent_score_service_v1')
      .select('agent_id, handle, display_name, service_score, rank_in_service, adoption_score, source_quality_score, activity_score')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_in_service', { ascending: true })
      .limit(3),

    supabase.from('events')
      .select('id, agent_id, event_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(24),

    supabase.from('agent_daily_snapshots').select('id', { count: 'exact', head: true }),
  ])

  const [erModelFamilies, erTokenized, erService] = await Promise.all([
    supabase.from('agent_score_model_family_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true).then(({ count, error }) => error ? 0 : (count || 0)),
    supabase.from('agent_score_tokenized_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true).then(({ count, error }) => error ? 0 : (count || 0)),
    supabase.from('agent_score_service_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true).then(({ count, error }) => error ? 0 : (count || 0)),
  ])

  const evidenceRankedCount = (erDeveloper ?? 0) + erModelFamilies + erTokenized + erService

  // Enrich category rows with agent avatars/deltas
  const allHandles = [
    ...(devRows || []).map(r => r.handle),
    ...(mfRows  || []).map(r => r.handle),
    ...(tokRows || []).map(r => r.handle),
    ...(svcRows || []).map(r => r.handle),
  ].filter(Boolean)

  const { data: agentsData } = allHandles.length > 0
    ? await supabase.from('agents')
        .select('id, handle, display_name, avatar_url, custom_background_url, weekly_delta')
        .in('handle', allHandles)
    : { data: [] }

  const byHandle = {}
  for (const a of agentsData || []) byHandle[a.handle] = a

  function enrichRows(rows, scoreKey, rankKey) {
    return (rows || []).map(row => ({ ...row, ...(byHandle[row.handle] || {}), [scoreKey]: row[scoreKey], [rankKey]: row[rankKey] }))
  }

  // Enrich events with agent names
  const eventAgentIds = [...new Set((events || []).map(e => e.agent_id).filter(Boolean))]
  const { data: eventAgents } = eventAgentIds.length > 0
    ? await supabase.from('agents').select('id, handle, display_name').in('id', eventAgentIds)
    : { data: [] }
  const eventAgentMap = new Map((eventAgents || []).map(a => [a.id, a]))

  const signalEvents = (events || [])
    .map(e => ({
      ...e,
      agentHandle: eventAgentMap.get(e.agent_id)?.handle || null,
      agentName: eventAgentMap.get(e.agent_id)?.display_name || null,
    }))
    .filter(e => e.agentHandle)
    .slice(0, 8)

  const catRows = [
    { cat: CATEGORIES[0], rows: enrichRows(devRows,  'score_v2_c_public_candidate', 'rank_v2_c_public'),  erCount: erDeveloper ?? 0 },
    { cat: CATEGORIES[1], rows: enrichRows(mfRows,   'model_family_score', 'rank_in_model_family'),       erCount: erModelFamilies },
    { cat: CATEGORIES[2], rows: enrichRows(tokRows,  'tokenized_score', 'rank_in_tokenized'),              erCount: erTokenized },
    { cat: CATEGORIES[3], rows: enrichRows(svcRows,  'service_score', 'rank_in_service'),                 erCount: erService },
  ]

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#08080f] overflow-x-hidden"
      style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <HomepageJsonLd evidenceRankedCount={evidenceRankedCount} />

      {/* Atmosphere */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0c1a] via-[#08080f] to-[#0a0812] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(233,30,128,0.06) 0%, transparent 60%)' }} />

      <div className="relative">

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1 — HERO MANIFEST
        ════════════════════════════════════════════════════════════════ */}
        <section className="border-b border-white/[0.05]">
          <Container>
            <div className="py-10 md:py-14">

              {/* Identity line */}
              <h1 className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight text-white mb-3" style={{ fontFamily: "var(--font-michroma,'Michroma',sans-serif)", fontWeight: 400 }}>
                <span style={{ color: '#e91e80' }}>AgentCrush</span> is the public record of AI agents.
              </h1>

              <p className="font-mono text-sm text-white/50 mb-6 max-w-2xl leading-relaxed">
                Independent. Cross-protocol. Open methodology. Machine-callable from your code or your agent.{' '}
                <span className="text-white/35">Six things we do — in full, in public:</span>
              </p>

              {/* (a) Pipeline strip */}
              <div className="mb-5 overflow-x-auto pb-1">
                <div className="flex items-stretch gap-0 min-w-max">
                  {VERBS.map((v, i) => (
                    <div key={v.n} className="flex items-stretch">
                      <div className="rounded border px-2.5 py-2 text-center"
                        style={{ borderColor: `${v.color}33`, background: `${v.color}08`, minWidth: 110 }}>
                        <div className="font-mono text-[9px] text-white/25 mb-0.5">{v.n}</div>
                        <div className="font-mono text-xs font-bold" style={{ color: v.color }}>{v.verb}</div>
                        <div className="font-mono text-[9px] text-white/35 mt-0.5 leading-tight max-w-[100px]">{v.tagline.split(' ').slice(0, 4).join(' ')}…</div>
                      </div>
                      {i < VERBS.length - 1 && (
                        <div className="flex items-center px-1 text-white/20 font-mono text-sm">→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* (b) Six full-width capability rows */}
              <div className="space-y-0 divide-y divide-white/[0.04] rounded-lg border border-white/[0.07] overflow-hidden">
                {VERBS.map((v) => (
                  <div key={v.n} className="grid grid-cols-[90px_1fr] sm:grid-cols-[120px_1fr] gap-0 hover:bg-white/[0.015] transition-colors">
                    {/* Left: number + verb */}
                    <div className="px-3 py-3 flex flex-col justify-center" style={{ borderRight: `1px solid ${v.color}22`, background: `${v.color}05` }}>
                      <div className="font-mono text-[9px] text-white/20 mb-0.5">{v.n}</div>
                      <div className="font-mono text-base sm:text-lg font-bold tracking-wider leading-none" style={{ color: v.color }}>{v.verb}</div>
                    </div>
                    {/* Right: tagline, chips, note */}
                    <div className="px-3 py-3 sm:py-2.5">
                      <div className="font-mono text-xs font-semibold text-white/80 mb-1.5">{v.tagline}</div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {v.chips.map(c => (
                          <span key={c} className="font-mono text-[9px] text-white/45 rounded px-1.5 py-0.5 border border-white/[0.08] bg-white/[0.025]">{c}</span>
                        ))}
                      </div>
                      <div className="font-mono text-[10px] text-white/30 italic">{v.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2 — WHAT BRINGS YOU HERE?
        ════════════════════════════════════════════════════════════════ */}
        <section className="border-b border-white/[0.05] py-8">
          <Container>
            <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 mb-3">
              What brings you here?
            </div>
            {/* Top 3 large cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Link href="/find"
                className="relative rounded-lg border px-4 py-4 hover:brightness-110 transition-all overflow-hidden group"
                style={{ borderColor: 'rgba(57,255,20,0.3)', background: 'rgba(57,255,20,0.05)' }}>
                <div className="font-mono text-sm font-bold mb-1" style={{ color: '#39ff14' }}>I'm looking for an agent →</div>
                <div className="font-mono text-[11px] text-white/40">Answer 3 questions, get a shortlist of verified, evidence-ranked agents for your use case.</div>
              </Link>
              <Link href="/developers"
                className="relative rounded-lg border px-4 py-4 hover:brightness-110 transition-all overflow-hidden group"
                style={{ borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.05)' }}>
                <div className="font-mono text-sm font-bold mb-1" style={{ color: '#a78bfa' }}>I'm building an agent →</div>
                <div className="font-mono text-[11px] text-white/40">MCP server, x402 REST, OpenAPI 3.1, embed badges, ERC-8004 context — all free to start.</div>
              </Link>
              <Link href="/blog"
                className="relative rounded-lg border px-4 py-4 hover:brightness-110 transition-all overflow-hidden group"
                style={{ borderColor: 'rgba(233,30,128,0.35)', background: 'rgba(233,30,128,0.06)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-mono text-sm font-bold" style={{ color: '#e91e80' }}>I'm researching the ecosystem →</div>
                  <span className="font-mono text-[9px] font-bold text-white/30 border border-white/[0.12] rounded px-1.5 py-0.5 shrink-0">FOR ANALYSTS</span>
                </div>
                <div className="font-mono text-[11px] text-white/40">Case studies, methodology findings, weekly digest. Every post has citation blocks + data downloads.</div>
              </Link>
            </div>
            {/* Bottom 2 smaller cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/agent-economy-index"
                className="rounded-lg border px-4 py-3 hover:brightness-110 transition-all"
                style={{ borderColor: 'rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.03)' }}>
                <div className="font-mono text-[12px] font-bold mb-0.5" style={{ color: '#00d4ff' }}>I want to understand the ecosystem →</div>
                <div className="font-mono text-[10px] text-white/35">Agent Economy Index — which protocols are gaining ground, which are stalling.</div>
              </Link>
              <Link href="/learn"
                className="rounded-lg border px-4 py-3 hover:brightness-110 transition-all"
                style={{ borderColor: 'rgba(240,165,0,0.2)', background: 'rgba(240,165,0,0.03)' }}>
                <div className="font-mono text-[12px] font-bold mb-0.5" style={{ color: '#f0a500' }}>I'm just exploring →</div>
                <div className="font-mono text-[10px] text-white/35">What are AI agents? What do the protocol layers mean? Start here.</div>
              </Link>
            </div>
          </Container>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3 — THE 4 RANKINGS
        ════════════════════════════════════════════════════════════════ */}
        <section className="border-b border-white/[0.05] py-8">
          <Container>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 mb-0.5">Rankings</div>
                <div className="font-mono text-base font-bold text-white">4 rankings — equal peers</div>
              </div>
              <Link href="/rankings" className="font-mono text-[11px] text-[#e91e80] hover:opacity-80 transition-opacity">
                All rankings →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catRows.map(({ cat, rows, erCount }) => (
                <div key={cat.id}
                  className="relative rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${cat.colorBorder}`, background: '#0a0a14' }}>
                  {/* Corner accents */}
                  {['top-0 left-0 border-t border-l','top-0 right-0 border-t border-r','bottom-0 left-0 border-b border-l','bottom-0 right-0 border-b border-r'].map(cls => (
                    <span key={cls} className={`pointer-events-none absolute w-2.5 h-2.5 ${cls}`} style={{ borderColor: cat.colorBorder }} />
                  ))}
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]" style={{ background: cat.colorDim }}>
                    <span className="font-mono text-xs font-bold" style={{ color: cat.color }}>{cat.label}</span>
                    <div className="text-right">
                      <span className="font-mono text-[9px] text-white/30">{erCount} evidence-ranked</span>
                      <span className="mx-1.5 text-white/15">·</span>
                      <span className="font-mono text-[9px] text-white/25">{cat.methodology}</span>
                    </div>
                  </div>
                  {/* Top 3 rows */}
                  <div className="divide-y divide-white/[0.04]">
                    {rows.length === 0 ? (
                      <div className="px-3 py-3 font-mono text-[11px] text-white/20">Populating…</div>
                    ) : rows.map((agent, i) => {
                      const score = Math.round(agent[cat.scoreKey] ?? 0)
                      const avatarUrl = toPublicImageUrl(agent.custom_background_url || agent.avatar_url)
                      const name = agent.display_name || agent.handle || '?'
                      const delta = agent.weekly_delta || 0
                      return (
                        <Link key={agent.handle} href={`/agent/${encodeURIComponent(agent.handle)}`}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.025] transition-colors"
                          style={{ borderLeft: i === 0 ? `2px solid ${cat.color}` : '2px solid transparent' }}>
                          <span className="font-mono text-[9px] tabular-nums w-4 text-right shrink-0"
                            style={{ color: i === 0 ? cat.color : 'rgba(255,255,255,0.25)' }}>{i + 1}</span>
                          <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.08] flex items-center justify-center ${!avatarUrl ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                            {avatarUrl
                              ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                              : <span className="font-mono text-[8px] font-bold">{name[0].toUpperCase()}</span>
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[11px] font-semibold text-white/85 truncate">{name}</div>
                            <div className="mt-0.5 flex gap-1">
                              {cat.signals.map(sig => {
                                const val = Math.min(100, Math.max(0, agent[sig.key] ?? 0))
                                return (
                                  <div key={sig.key} className="flex-1 h-[2px] rounded-full bg-white/[0.06]">
                                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: sig.color }} />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono text-[11px] font-bold tabular-nums text-white/80">{score}</div>
                            {delta !== 0 && (
                              <div className={`font-mono text-[9px] tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {delta > 0 ? '+' : ''}{delta}
                              </div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                  {/* Footer link */}
                  <div className="px-3 py-1.5 border-t border-white/[0.04] text-right">
                    <Link href={cat.href} className="font-mono text-[10px] transition-colors" style={{ color: cat.color }}>
                      Full ranking →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4 — LIVE SIGNAL TICKER (8 cards)
        ════════════════════════════════════════════════════════════════ */}
        {signalEvents.length > 0 && (
          <section className="border-b border-white/[0.05] py-5">
            <Container>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">Live signals</span>
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {signalEvents.map(ev => {
                  const { dot, kind } = eventStyle(ev.event_type)
                  return (
                    <Link key={ev.id} href={`/agent/${encodeURIComponent(ev.agentHandle)}`}
                      className="rounded border border-white/[0.06] bg-[#0a0a14] px-2 py-2 hover:bg-white/[0.04] transition-colors min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot, boxShadow: `0 0 4px ${dot}` }} />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: dot }}>{kind}</span>
                        <span className="ml-auto font-mono text-[9px] text-white/20 shrink-0">{formatRelativeTime(ev.created_at)}</span>
                      </div>
                      <div className="font-mono text-[10px] font-semibold text-white/70 truncate">{ev.agentName}</div>
                      <div className="font-mono text-[9px] text-white/35 truncate">{eventLabel(ev)}</div>
                    </Link>
                  )
                })}
              </div>
            </Container>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SECTION 5 — INTEGRATE & PAY
        ════════════════════════════════════════════════════════════════ */}
        <section className="border-b border-white/[0.05] py-8">
          <Container>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 mb-0.5">Integrate</div>
                <div className="font-mono text-base font-bold text-white">Call it from your code or your agent</div>
              </div>
              <Link href="/developers" className="font-mono text-[11px] text-[#a78bfa] hover:opacity-80 transition-opacity">
                Developer docs →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Free MCP */}
              <div className="rounded-lg border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.03)] p-4">
                <div className="font-mono text-xs font-bold text-[#00d4ff] mb-0.5">Free MCP server</div>
                <div className="font-mono text-[10px] text-white/35 mb-2">7 tools · POST /api/mcp/v1 · no auth · 60 req/min</div>
                <div className="space-y-1">
                  {MCP_TOOLS.map(t => (
                    <div key={t} className="font-mono text-[10px] text-white/50 flex items-center gap-1.5">
                      <span className="text-[#00d4ff]/60">·</span> {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Paid x402 */}
              <div className="rounded-lg border border-[rgba(240,165,0,0.2)] bg-[rgba(240,165,0,0.03)] p-4">
                <div className="font-mono text-xs font-bold text-[#f0a500] mb-0.5">Paid x402 API</div>
                <div className="font-mono text-[10px] text-white/35 mb-2">USDC on Base · no API key · pay per call</div>
                <div className="space-y-2">
                  {[
                    { path: '/api/agent/:handle/trust-summary', price: '$0.02' },
                    { path: '/api/agent/:handle/history',        price: '$0.02' },
                    { path: '/api/agent/:handle/verification-status', price: '$0.005' },
                  ].map(ep => (
                    <div key={ep.path} className="flex items-start gap-2">
                      <span className="font-mono text-[9px] font-bold shrink-0 rounded px-1.5 py-0.5 border border-[rgba(240,165,0,0.3)] bg-[rgba(240,165,0,0.1)]" style={{ color: '#f0a500' }}>{ep.price}</span>
                      <code className="font-mono text-[9px] text-white/40 break-all">{ep.path}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embed badge */}
              <div className="rounded-lg border border-[rgba(57,255,20,0.15)] bg-[rgba(57,255,20,0.02)] p-4">
                <div className="font-mono text-xs font-bold text-[#39ff14] mb-0.5">Embed badge</div>
                <div className="font-mono text-[10px] text-white/35 mb-2">Live SVG · auto-updates · copy into any README</div>
                <code className="block font-mono text-[9px] text-white/45 bg-white/[0.04] rounded px-2 py-1.5 break-all mb-2">
                  {'/embed/{handle}'}
                </code>
                <div className="font-mono text-[9px] text-white/30">Shows rank, score, and evidence badge. Refreshes on every request.</div>
              </div>
            </div>
          </Container>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 6 — FIELD NOTES
        ════════════════════════════════════════════════════════════════ */}
        <section className="border-b border-white/[0.05] py-8">
          <Container>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 mb-0.5">Field notes</div>
                <div className="font-mono text-base font-bold text-white">From the index</div>
              </div>
              <Link href="/blog" className="font-mono text-[11px] text-white/40 hover:text-white/70 transition-colors">
                All posts →
              </Link>
            </div>

            {/* Weekly digest anchor */}
            <div className="relative rounded-lg border border-[rgba(233,30,128,0.2)] bg-[rgba(233,30,128,0.03)] p-4 mb-4 overflow-hidden">
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(233,30,128,0.35)]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(233,30,128,0.35)]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(233,30,128,0.35)]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(233,30,128,0.35)]" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#e91e80]">◆ WEEKLY DIGEST</span>
                    <span className="font-mono text-[9px] text-white/30">W21 · 2026-05-18</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-white/90 mb-2">Promotions · Top movers · New to index · Protocol activity · Editorial</div>
                  <div className="font-mono text-[10px] text-white/40 leading-relaxed">
                    Weekly intelligence roundup. Evidence-ranked moves, new entries, protocol signals, and editorial context — every Friday.
                  </div>
                </div>
                <Link href="/weekly/2026-W21"
                  className="shrink-0 rounded border border-[rgba(233,30,128,0.35)] bg-[rgba(233,30,128,0.08)] px-3 py-1.5 font-mono text-[11px] font-bold text-[#e91e80] hover:bg-[rgba(233,30,128,0.15)] transition-colors">
                  Read →
                </Link>
              </div>
            </div>

            {/* 3-up: latest blog posts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BLOG_POSTS.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`}
                  className="rounded-lg border border-white/[0.07] bg-[#0a0a14] px-4 py-3 hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: post.tagColor, borderColor: `${post.tagColor}44`, background: `${post.tagColor}11` }}>
                      {post.tag}
                    </span>
                    <span className="font-mono text-[9px] text-white/25">{post.date}</span>
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-white/80 leading-snug">{post.title}</div>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 7 — SUBMIT CTA + PROVENANCE
        ════════════════════════════════════════════════════════════════ */}
        <section className="py-8">
          <Container>
            <Link href="/submit"
              className="relative block rounded-lg border border-[rgba(233,30,128,0.4)] bg-[rgba(233,30,128,0.07)] px-5 py-4 hover:bg-[rgba(233,30,128,0.12)] transition-colors overflow-hidden mb-5 group">
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(233,30,128,0.5)]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(233,30,128,0.5)]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(233,30,128,0.5)]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(233,30,128,0.5)]" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-bold text-[#e91e80]">Get your agent indexed →</div>
                  <div className="font-mono text-[11px] text-white/40 mt-0.5">Free. Evidence-based. No pay-to-rank.</div>
                </div>
                <span className="font-mono text-[#e91e80] text-xl group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>

            {/* Provenance line */}
            <p className="text-center font-mono text-[10px] text-white/20">
              Daily snapshots since 2026-04-15{snapshotCount ? ` · ${snapshotCount.toLocaleString()} snapshots` : ''} · updated every 4h · <Link href="/methodology" className="hover:text-white/40 transition-colors underline underline-offset-2">public methodology</Link>
            </p>
          </Container>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.04]">
          <Container>
            <div className="py-3 text-center">
              <p className="font-mono text-[10px] text-white/20">© {new Date().getFullYear()} AgentCrush · The public record of AI agents.</p>
              <div className="mt-1 flex justify-center gap-5">
                <Link href="/about" className="font-mono text-[10px] text-white/20 hover:text-white/40 transition-colors">About</Link>
                <Link href="/terms" className="font-mono text-[10px] text-white/20 hover:text-white/40 transition-colors">Terms</Link>
              </div>
            </div>
          </Container>
        </div>

      </div>
    </div>
  )
}
