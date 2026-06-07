export const metadata = {
  title: 'MCP Server Rankings · AgentCrush',
  description: 'Evidence-ranked Model Context Protocol servers. Tool count, registry listings, install popularity, and real-world adoption across Smithery, mcp.so, and the official MCP registry.',
  alternates: { canonical: 'https://agentcrush.xyz/rankings/mcp-servers' },
  openGraph: {
    title: 'MCP Server Rankings · AgentCrush',
    description: 'Top MCP servers ranked by tool count, GitHub stars, registry listings, and install popularity.',
    url: 'https://agentcrush.xyz/rankings/mcp-servers',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/api/og?title=MCP%20Server%20Rankings&kicker=MCP&subtitle=Tool%20count%2C%20registry%20listings%2C%20install%20popularity', width: 1200, height: 630, alt: 'MCP Server Rankings — AgentCrush' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP Server Rankings · AgentCrush',
    description: 'Top MCP servers ranked by tool count, GitHub stars, registry listings, and install popularity.',
    images: ['https://agentcrush.xyz/api/og?title=MCP%20Server%20Rankings&kicker=MCP&subtitle=Tool%20count%2C%20registry%20listings%2C%20install%20popularity'],
  },
}

import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Colour accent for MCP category — orange/amber */
const MCP_COLOR = '#f97316'
const MCP_GLOW  = 'rgba(249,115,22,0.5)'
const MCP_DIM   = 'rgba(249,115,22,0.25)'

function CornerAccent() {
  return (
    <>
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: MCP_DIM }} />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: MCP_DIM }} />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: MCP_DIM }} />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: MCP_DIM }} />
    </>
  )
}

/** Registry pill */
function RegistryPill({ name }) {
  const labels = {
    official:  { label: 'Official', color: '#00d4ff' },
    smithery:  { label: 'Smithery', color: '#a78bfa' },
    mcp_so:    { label: 'mcp.so',   color: '#4ade80' },
    glama:     { label: 'Glama',    color: '#fb923c' },
    continue:  { label: 'Continue', color: '#60a5fa' },
  }
  const cfg = labels[name] || { label: name, color: '#ffffff60' }
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border"
      style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.color + '10' }}
    >
      {cfg.label}
    </span>
  )
}

/** Transport badge */
function TransportBadge({ type }) {
  const colors = { http: '#00d4ff', stdio: '#a78bfa', sse: '#4ade80' }
  const c = colors[type] || '#ffffff60'
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] border"
      style={{ color: c, borderColor: c + '40', background: c + '10' }}
    >
      {type}
    </span>
  )
}

/** Single MCP server row */
function MCPServerRow({ rank, server }) {
  const isOfficialAnthropicRepo =
    server.github_url?.includes('modelcontextprotocol/servers') ||
    server.github_url?.includes('modelcontextprotocol/server')
  const isAgentCrush = server.handle === 'agentcrush-mcp'

  return (
    <div
      className="relative flex flex-col sm:flex-row sm:items-start gap-3 rounded-lg border border-white/[0.06] bg-[#0a0a14] px-4 py-3 overflow-hidden transition-colors hover:border-white/[0.12]"
      style={isAgentCrush ? { borderColor: MCP_DIM } : {}}
    >
      <CornerAccent />

      {/* Rank */}
      <div className="flex items-center gap-3 sm:gap-4 sm:w-10 shrink-0">
        <span className="font-mono text-xl font-bold tabular-nums" style={{ color: rank <= 3 ? MCP_COLOR : 'rgba(255,255,255,0.25)' }}>
          {rank}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-white/90 text-sm leading-snug">
            {server.name || server.handle}
          </span>
          {isAgentCrush && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border"
              style={{ color: MCP_COLOR, borderColor: MCP_DIM, background: 'rgba(249,115,22,0.08)' }}>
              ★ THIS INDEX
            </span>
          )}
          {isOfficialAnthropicRepo && !isAgentCrush && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border border-[rgba(0,212,255,0.3)] text-[#00d4ff] bg-[rgba(0,212,255,0.06)]">
              Anthropic Official
            </span>
          )}
        </div>

        {/* Description */}
        {server.description && (
          <p className="font-mono text-[11px] text-white/45 leading-relaxed mb-2 line-clamp-2">
            {server.description}
          </p>
        )}

        {/* Signals row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tool count */}
          {server.tool_count != null && (
            <span className="font-mono text-[11px] text-white/50">
              <span className="text-white/70 font-bold">{server.tool_count}</span> tools
            </span>
          )}

          {/* Stars */}
          {server.github_stars != null && (
            <span className="font-mono text-[11px] text-white/50">
              <span className="text-white/70">★</span> {server.github_stars.toLocaleString()}
            </span>
          )}

          {/* Transport types */}
          {server.transport_types?.length > 0 && (
            <div className="flex gap-1">
              {server.transport_types.map(t => <TransportBadge key={t} type={t} />)}
            </div>
          )}

          {/* Registry listings */}
          {server.registry_listings?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {server.registry_listings.map(r => <RegistryPill key={r} name={r} />)}
            </div>
          )}
        </div>
      </div>

      {/* Score + links */}
      <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0">
        {server.score != null && (
          <div className="text-right">
            <div className="font-mono text-lg font-bold tabular-nums" style={{ color: MCP_COLOR, textShadow: `0 0 12px ${MCP_GLOW}` }}>
              {Number(server.score).toFixed(1)}
            </div>
            <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest">score</div>
          </div>
        )}
        <div className="flex gap-2">
          {server.github_url && (
            <a
              href={server.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              GH →
            </a>
          )}
          {server.npx_install && (
            <span
              className="font-mono text-[10px] text-white/25"
              title={`npx ${server.npx_install}`}
            >
              npx
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function MCPServersPage() {
  const supabase = supabaseAnon()

  // Fetch MCP servers from the scoring view (includes metadata join + score calc)
  // Falls back to raw agents query if the view doesn't exist yet (pre-migration)
  let rows = []
  let usingFallback = false

  const { data: viewData, error: viewError } = await supabase
    .rpc('query_mcp_server_ranking')
    .limit(50)

  if (viewError || !viewData) {
    // View doesn't exist yet — fall back to raw agents query
    usingFallback = true
    const { data: fallbackData } = await supabase
      .from('agents')
      .select(`
        handle, name, description, tier,
        github_stars, github_forks, follower_count,
        homepage_url, github_url, updated_at
      `)
      .eq('category', 'mcp_server')
      .order('github_stars', { ascending: false, nullsFirst: false })
      .limit(50)

    rows = (fallbackData || []).map((a, i) => ({
      ...a,
      rank: i + 1,
      score: null,
      tool_count: null,
      transport_types: null,
      registry_listings: null,
      npx_install: null,
    }))
  } else {
    rows = (viewData || []).map((r, i) => ({
      ...r,
      rank: i + 1,
    }))
  }

  // If view fallback also failed, try the scoring view directly
  if (usingFallback) {
    const { data: scoreViewData } = await supabase
      .from('agent_score_mcp_server_v1')
      .select('*')
      .limit(50)

    if (scoreViewData?.length) {
      usingFallback = false
      rows = (scoreViewData || []).map((r, i) => ({
        ...r,
        rank: i + 1,
      }))
    }
  }

  // For each row, fetch mcp_server_metadata if not already joined
  if (rows.length > 0 && !rows[0].tool_count && !rows[0].transport_types) {
    const handles = rows.map(r => r.handle)
    const { data: metaData } = await supabase
      .from('mcp_server_metadata')
      .select('handle, tool_count, transport_types, registry_listings, npx_install')
      .in('handle', handles)

    if (metaData?.length) {
      const metaByHandle = Object.fromEntries(metaData.map(m => [m.handle, m]))
      rows = rows.map(r => ({
        ...r,
        ...(metaByHandle[r.handle] || {}),
      }))
    }
  }

  const evidenceRanked = rows.filter(r => r.tier === 'evidence_ranked')
  const indexed = rows.filter(r => r.tier !== 'evidence_ranked')
  const totalRegistryListings = rows.reduce((acc, r) => acc + (r.registry_listings?.length || 0), 0)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: MCP_COLOR }}>
            MCP INDEX
          </span>
          <div style={{ flex: 1, height: 1, background: MCP_DIM }} />
          <span className="font-mono text-[9px] text-white/25 uppercase tracking-widest">NEW</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-michroma,'Michroma',sans-serif)" }}>
          MCP Server <span style={{ color: MCP_COLOR, textShadow: `0 0 20px ${MCP_GLOW}` }}>Rankings</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          {rows.length} servers indexed ·{' '}
          <span style={{ color: MCP_COLOR }}>{evidenceRanked.length} evidence-ranked</span>
          {' '}·{' '}
          {totalRegistryListings} registry listings ·{' '}
          <Link href="/rankings" className="text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">
            all rankings →
          </Link>
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 font-mono text-[11px]">
        <Link href="/rankings" className="text-white/35 hover:text-white/60 transition-colors">← All rankings</Link>
        <span className="text-white/15">·</span>
        <span className="text-white/50">MCP Servers</span>
      </div>

      {/* Methodology callout */}
      <div
        className="mb-4 rounded-lg border px-4 py-3 font-mono text-[11px] text-white/50 leading-relaxed"
        style={{ borderColor: MCP_DIM, background: 'rgba(249,115,22,0.04)' }}
      >
        <span style={{ color: MCP_COLOR }} className="font-bold">Scoring v1.0:</span>
        {' '}GitHub stars (30%) · Tool count (25%) · Registry listings (20%) · Forks (15%) · Community signal (10%).
        {' '}Only servers with public evidence and at least one registry listing qualify for evidence-ranked tier.
        {' '}<Link href="/methodology" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">Full methodology →</Link>
      </div>

      {/* What is MCP callout */}
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-[#0a0a14] px-4 py-3 font-mono text-[11px] text-white/40 leading-relaxed">
        MCP (Model Context Protocol) servers extend AI capabilities by exposing tools, resources, and prompts to LLMs.
        This index tracks which servers are most adopted, highest quality, and most widely listed — making it the first
        evidence-based ranking for the MCP ecosystem.{' '}
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
          MCP spec →
        </a>
      </div>

      {/* Server list */}
      <div className="space-y-2">
        {rows.map((server, idx) => (
          <MCPServerRow key={server.handle} rank={idx + 1} server={server} />
        ))}

        {rows.length === 0 && (
          <div className="rounded-lg border border-white/[0.06] bg-[#0a0a14] px-4 py-8 text-center font-mono text-sm text-white/30">
            Migration pending — apply{' '}
            <code className="text-white/50">migrations/20260607_0900_mcp_server_category.sql</code>
            {' '}in Supabase to seed the MCP server index.
          </div>
        )}
      </div>

      {/* Submit CTA */}
      <div className="mt-8 rounded-lg border px-4 py-4 text-center" style={{ borderColor: MCP_DIM, background: 'rgba(249,115,22,0.03)' }}>
        <p className="font-mono text-xs text-white/40 mb-2">
          Built an MCP server? Get it indexed and ranked.
        </p>
        <a
          href="/api/agent-feedback?type=mcp_server_submission"
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 font-mono text-xs transition-colors hover:text-white"
          style={{ borderColor: MCP_DIM, color: MCP_COLOR }}
        >
          Submit your MCP server →
        </a>
      </div>

      {/* Machine data */}
      <div className="mt-6 font-mono text-[10px] text-white/20 text-center">
        Machine-readable:{' '}
        <a
          href="/api/agents/dataset?category=mcp_server&format=jsonl"
          className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
        >
          JSONL dataset
        </a>
        {' '}·{' '}
        <a
          href="/api/agents/dataset?category=mcp_server"
          className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
        >
          JSON API
        </a>
        {' '}·{' '}
        <Link
          href="/.well-known/ai-agents.json"
          className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
        >
          ai-agents.json
        </Link>
      </div>
    </main>
  )
}
