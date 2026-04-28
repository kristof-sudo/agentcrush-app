/**
 * AgentCrush MCP Server v0
 *
 * Implements MCP JSON-RPC 2.0 over HTTP (protocol version 2024-11-05).
 * Read-only. No auth required. No write actions.
 *
 * POST /api/mcp  — JSON-RPC endpoint
 * GET  /api/mcp  — server info + tool manifest
 */

import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Supabase — anon key only; read-only by RLS
// ---------------------------------------------------------------------------

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

function sanitizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

function sanitizeSearch(raw) {
  if (typeof raw !== 'string') return ''
  // Strip LIKE wildcards and PostgREST filter chars so user input stays safe
  return raw.replace(/[%_'"\\]/g, '').trim().slice(0, 100)
}

function clampLimit(val, def = 10, max = 20) {
  const n = Number(val)
  if (!Number.isFinite(n) || n < 1) return def
  return Math.min(Math.floor(n), max)
}

function clampDays(val, def = 30, max = 90) {
  const n = Number(val)
  if (!Number.isFinite(n) || n < 1) return def
  return Math.min(Math.floor(n), max)
}

// ---------------------------------------------------------------------------
// Tool definitions (MCP JSON Schema format)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'lookup_agent',
    description:
      'Look up a specific AI agent by handle. Returns rank, score, tier, archetype, and profile data from the AgentCrush evidence-ranked index.',
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'Agent handle slug (e.g. "crewai", "autogpt", "langchain")',
        },
      },
      required: ['handle'],
    },
  },
  {
    name: 'search_agents',
    description:
      'Search AI agents by name or keyword. Returns matching agents with handle, name, tier, and archetype.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword or partial agent name',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (1–20, default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'compare_agents',
    description:
      'Compare two AI agents side-by-side: rank, score, tier, and archetype. Returns both agent profiles and a brief comparison summary.',
    inputSchema: {
      type: 'object',
      properties: {
        handle_a: {
          type: 'string',
          description: 'First agent handle',
        },
        handle_b: {
          type: 'string',
          description: 'Second agent handle',
        },
      },
      required: ['handle_a', 'handle_b'],
    },
  },
  {
    name: 'get_history',
    description:
      'Get rank and score history for an AI agent. Returns daily snapshots for the requested window (default 30 days, max 90).',
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'Agent handle slug',
        },
        days: {
          type: 'number',
          description: 'Days of history to return (1–90, default 30)',
        },
      },
      required: ['handle'],
    },
  },
]

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function lookupAgent(args) {
  const handle = sanitizeHandle(args?.handle)
  if (!handle) return { error: 'handle is required' }

  const supabase = db()

  const { data: agent } = await supabase
    .from('agents')
    .select(
      'id, handle, display_name, archetype, tier, bio, tagline, ' +
        'visibility_score, reputation_score, weekly_delta, ' +
        'ecosystem_layer, verified, identity_status'
    )
    .ilike('handle', handle)
    .maybeSingle()

  if (!agent) return { error: `Agent not found: ${handle}` }

  const { data: ranking } = await supabase
    .from('rankings')
    .select('global_rank, score_total, score_visibility, score_reputation, computed_at')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    handle: agent.handle,
    name: agent.display_name || agent.handle,
    tier: agent.tier || null,
    archetype: agent.archetype || null,
    ecosystem_layer: agent.ecosystem_layer || null,
    verified: agent.verified ?? false,
    erc8004_registered: agent.identity_status === 'verified',
    rank: ranking?.global_rank ?? null,
    scores: ranking
      ? {
          total: ranking.score_total,
          visibility: ranking.score_visibility,
          reputation: ranking.score_reputation,
          as_of: ranking.computed_at,
        }
      : null,
    visibility_score: agent.visibility_score ?? null,
    reputation_score: agent.reputation_score ?? null,
    weekly_delta: agent.weekly_delta ?? null,
    bio: agent.bio || agent.tagline || null,
    profile_url: `https://agentcrush.xyz/agent/${agent.handle}`,
  }
}

async function searchAgents(args) {
  const query = sanitizeSearch(args?.query)
  if (!query) return { error: 'query is required', agents: [] }

  const limit = clampLimit(args?.limit)
  const supabase = db()

  const { data: agents, error } = await supabase
    .from('agents')
    .select('handle, display_name, archetype, tier, ecosystem_layer, visibility_score')
    .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`)
    .order('visibility_score', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return { error: 'Search unavailable', agents: [] }

  return {
    query,
    count: agents?.length ?? 0,
    agents: (agents || []).map((a) => ({
      handle: a.handle,
      name: a.display_name || a.handle,
      tier: a.tier || null,
      archetype: a.archetype || null,
      ecosystem_layer: a.ecosystem_layer || null,
      profile_url: `https://agentcrush.xyz/agent/${a.handle}`,
    })),
  }
}

async function compareAgents(args) {
  const ha = sanitizeHandle(args?.handle_a)
  const hb = sanitizeHandle(args?.handle_b)
  if (!ha || !hb) return { error: 'handle_a and handle_b are required' }
  if (ha === hb) return { error: 'Handles must be different' }

  const [a, b] = await Promise.all([
    lookupAgent({ handle: ha }),
    lookupAgent({ handle: hb }),
  ])

  return {
    compare_url: `https://agentcrush.xyz/compare/${ha}-vs-${hb}`,
    agents: [a, b],
    summary: buildCompareSummary(a, b),
  }
}

function buildCompareSummary(a, b) {
  if (a.error || b.error) return null
  const lines = []

  const ra = a.rank
  const rb = b.rank
  if (ra != null && rb != null) {
    const leader = ra < rb ? a.name : b.name
    lines.push(
      `${leader} ranks higher (#${Math.min(ra, rb)} vs #${Math.max(ra, rb)})`
    )
  }

  const sa = a.scores?.total
  const sb = b.scores?.total
  if (sa != null && sb != null) {
    const leader = sa > sb ? a.name : b.name
    lines.push(
      `${leader} has a higher composite score (${Math.max(sa, sb)} vs ${Math.min(sa, sb)})`
    )
  }

  return lines.length ? lines.join('. ') + '.' : null
}

async function getHistory(args) {
  const handle = sanitizeHandle(args?.handle)
  if (!handle) return { error: 'handle is required', history: [] }

  const days = clampDays(args?.days)
  const supabase = db()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier')
    .ilike('handle', handle)
    .maybeSingle()

  if (!agent) return { error: `Agent not found: ${handle}`, history: [] }

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: rows } = await supabase
    .from('rankings')
    .select('global_rank, score_total, score_visibility, score_reputation, computed_at')
    .eq('agent_id', agent.id)
    .gte('computed_at', since.toISOString())
    .order('computed_at', { ascending: true })

  // Deduplicate to one entry per calendar day
  const byDate = {}
  for (const row of rows ?? []) {
    const date = row.computed_at.slice(0, 10)
    byDate[date] = row
  }

  const history = Object.keys(byDate)
    .sort()
    .map((date) => {
      const row = byDate[date]
      return {
        date,
        rank: row.global_rank ?? null,
        score_total: row.score_total ?? 0,
        score_visibility: row.score_visibility ?? 0,
        score_reputation: row.score_reputation ?? 0,
      }
    })

  const first = history[0] ?? null
  const last = history[history.length - 1] ?? null

  let trend = 'flat'
  const s0 = first?.score_total ?? 0
  const sN = last?.score_total ?? 0
  if (s0 > 0) {
    if (sN > s0 * 1.05) trend = 'rising'
    else if (sN < s0 * 0.95) trend = 'falling'
  }

  return {
    handle: agent.handle,
    name: agent.display_name || agent.handle,
    tier: agent.tier || null,
    days_requested: days,
    snapshot_count: history.length,
    history,
    summary: {
      rank_start: first?.rank ?? null,
      rank_current: last?.rank ?? null,
      score_start: s0,
      score_current: sN,
      trend,
    },
    profile_url: `https://agentcrush.xyz/agent/${agent.handle}`,
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResult(id, result) {
  return Response.json(
    { jsonrpc: '2.0', id: id ?? null, result },
    { headers: CORS }
  )
}

function jsonError(id, code, message) {
  return Response.json(
    { jsonrpc: '2.0', id: id ?? null, error: { code, message } },
    { headers: CORS }
  )
}

async function dispatchTool(id, params) {
  const { name, arguments: args } = params || {}

  let result
  try {
    switch (name) {
      case 'lookup_agent':
        result = await lookupAgent(args)
        break
      case 'search_agents':
        result = await searchAgents(args)
        break
      case 'compare_agents':
        result = await compareAgents(args)
        break
      case 'get_history':
        result = await getHistory(args)
        break
      default:
        return jsonError(id, -32601, `Unknown tool: ${name}`)
    }
  } catch {
    return jsonError(id, -32603, 'Tool execution error')
  }

  return jsonResult(id, {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    isError: Boolean(result?.error),
  })
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  return Response.json(
    {
      name: 'AgentCrush MCP Server',
      version: '1.0.0',
      protocol: 'MCP',
      protocolVersion: '2024-11-05',
      description:
        'Read-only AI agent market intelligence. Evidence-ranked index of the agent economy.',
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      endpoint: 'POST https://agentcrush.xyz/api/mcp',
      docs: 'https://agentcrush.xyz/developers/mcp',
    },
    { headers: CORS }
  )
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonError(null, -32700, 'Parse error: invalid JSON')
  }

  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== '2.0') {
    return jsonError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"')
  }

  switch (method) {
    case 'initialize':
      return jsonResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'AgentCrush', version: '1.0.0' },
      })

    case 'initialized':
      return jsonResult(id, {})

    case 'ping':
      return jsonResult(id, {})

    case 'tools/list':
      return jsonResult(id, { tools: TOOLS })

    case 'tools/call':
      return dispatchTool(id, params)

    default:
      return jsonError(id, -32601, `Method not found: ${method}`)
  }
}
