/**
 * GET /api/agents/dataset
 *
 * Full agent index export — designed for AI crawlers, training data pipelines,
 * and agents that need the whole dataset rather than one agent at a time.
 *
 * This endpoint is the "give me everything" complement to:
 *   /api/agent/{handle}/llm-summary  — single agent
 *   /api/agents/bulk?handles=a,b     — specific list
 *   /api/mcp/v1                      — tool interface
 *
 * Query params:
 *   format=json (default)  → paginated JSON with metadata envelope + _attribution
 *   format=jsonl           → newline-delimited JSON stream, one agent per line
 *   format=csv             → CSV with header row
 *   page=N                 → page number (1-indexed, default 1)
 *   limit=N                → agents per page (default 500, max 2000)
 *   category=developer|tokenized|service|model_family  → filter
 *   tier=evidence_ranked|indexed|archived              → filter
 *   min_score=N            → only agents with score >= N
 *
 * Headers (all formats):
 *   Access-Control-Allow-Origin: *
 *   X-Total-Count: N
 *   Link: <...?page=2>; rel="next", <...?page=1>; rel="prev"
 *   Last-Modified: <timestamp>
 *   Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=300
 *
 * Attribution:
 *   Every response carries _attribution with cite_as, license (CC-BY-4.0), terms_url.
 *   For JSONL format: first line is the attribution block, subsequent lines are agents.
 *
 * Rate limit: 60 req/min per IP (same as /api/mcp/v1).
 *
 * HuggingFace dataset: huggingface.co/datasets/agentcrush/agents-index (daily export)
 */

import { createClient } from '@supabase/supabase-js'
import { attributionBlock, CORS_HEADERS } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LONG_CACHE = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
}
const HEADERS_JSON = {
  'Content-Type': 'application/json; charset=utf-8',
  ...CORS_HEADERS,
  ...LONG_CACHE,
}
const HEADERS_JSONL = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  ...CORS_HEADERS,
  ...LONG_CACHE,
}
const HEADERS_CSV = {
  'Content-Type': 'text/csv; charset=utf-8',
  'Content-Disposition': 'attachment; filename="agentcrush-agents.csv"',
  ...CORS_HEADERS,
  ...LONG_CACHE,
}

const VALID_CATEGORIES = ['developer', 'tokenized', 'service', 'model_family', 'mcp_server']
const VALID_TIERS = ['evidence_ranked', 'indexed', 'archived', 'virtuals_economic', 'agentverse_service']

const CSV_FIELDS = [
  'handle', 'name', 'category', 'tier', 'score', 'rank',
  'github_stars', 'github_forks', 'follower_count', 'weekly_delta',
  'erc8004_verified', 'x402_enabled', 'identity_type', 'claim_status',
  'homepage_url', 'updated_at',
]

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

function agentToRecord(agent) {
  return {
    handle: agent.handle,
    name: agent.name || null,
    description: agent.description ? agent.description.slice(0, 400) : null,
    category: agent.category || null,
    tier: agent.tier || null,
    score: agent.score != null ? Number(agent.score) : null,
    rank: agent.rank != null ? Number(agent.rank) : null,
    github_stars: agent.github_stars != null ? Number(agent.github_stars) : null,
    github_forks: agent.github_forks != null ? Number(agent.github_forks) : null,
    follower_count: agent.follower_count != null ? Number(agent.follower_count) : null,
    weekly_delta: agent.weekly_delta != null ? Number(agent.weekly_delta) : null,
    erc8004_verified: agent.erc8004_verified ?? false,
    x402_enabled: agent.x402_enabled ?? false,
    identity_type: agent.identity_type || null,
    claim_status: agent.claim_status || null,
    homepage_url: agent.homepage_url || null,
    profile_url: `https://agentcrush.xyz/rankings/${agent.category || 'developer'}/${agent.handle}`,
    updated_at: agent.updated_at || null,
  }
}

function escapeCSV(val) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCSVRow(agent) {
  return CSV_FIELDS.map(f => escapeCSV(agent[f])).join(',')
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const format  = (searchParams.get('format') || 'json').toLowerCase()
    const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit   = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') || '500', 10)))
    const category = searchParams.get('category')
    const tier     = searchParams.get('tier')
    const minScore = searchParams.get('min_score') ? Number(searchParams.get('min_score')) : null

    // Validate params
    if (category && !VALID_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({
        error: { code: 'invalid_category', message: `Unknown category: ${category}`, suggest: { valid_values: VALID_CATEGORIES } },
        _attribution: attributionBlock({ sourceUrl: 'https://agentcrush.xyz/rankings' }),
      }), { status: 400, headers: HEADERS_JSON })
    }
    if (tier && !VALID_TIERS.includes(tier)) {
      return new Response(JSON.stringify({
        error: { code: 'invalid_tier', message: `Unknown tier: ${tier}`, suggest: { valid_values: VALID_TIERS } },
        _attribution: attributionBlock({ sourceUrl: 'https://agentcrush.xyz/methodology' }),
      }), { status: 400, headers: HEADERS_JSON })
    }

    const supabase = db()
    let query = supabase
      .from('agents')
      .select(`
        handle, name, description, category, tier, score, rank,
        github_stars, github_forks, follower_count, weekly_delta,
        erc8004_verified, x402_enabled, identity_type, claim_status,
        homepage_url, updated_at
      `, { count: 'exact' })
      .order('rank', { ascending: true, nullsFirst: false })

    if (category) query = query.eq('category', category)
    if (tier) query = query.eq('tier', tier)
    if (minScore != null) query = query.gte('score', minScore)

    // For JSONL format, fetch up to 5000 at once (full dump)
    if (format === 'jsonl' || format === 'ndjson') {
      query = query.range(0, 4999)
    } else {
      const from = (page - 1) * limit
      query = query.range(from, from + limit - 1)
    }

    const { data, error, count } = await query
    if (error) throw new Error(`Supabase: ${error.message}`)

    const agents = (data || []).map(agentToRecord)
    const totalCount = count ?? agents.length

    // ── JSONL format ──────────────────────────────────────────────────────────
    if (format === 'jsonl' || format === 'ndjson') {
      const attribution = attributionBlock({
        sourceUrl: 'https://agentcrush.xyz/rankings',
        methodologyUrl: 'https://agentcrush.xyz/methodology',
        endpointUrl: 'https://agentcrush.xyz/api/agents/dataset?format=jsonl',
        lastUpdated: new Date().toISOString(),
      })
      // First line: metadata header
      const header = JSON.stringify({
        _type: 'agentcrush_dataset_header',
        total_agents: totalCount,
        exported_at: new Date().toISOString(),
        filters: { category: category || null, tier: tier || null, min_score: minScore },
        _attribution: attribution,
      })
      const lines = [header, ...agents.map(a => JSON.stringify(a))]
      return new Response(lines.join('\n') + '\n', {
        status: 200,
        headers: { ...HEADERS_JSONL, 'X-Total-Count': String(totalCount) },
      })
    }

    // ── CSV format ────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const headerRow = CSV_FIELDS.join(',')
      const rows = agents.map(toCSVRow)
      return new Response([headerRow, ...rows].join('\n') + '\n', {
        status: 200,
        headers: { ...HEADERS_CSV, 'X-Total-Count': String(totalCount) },
      })
    }

    // ── JSON format (default, paginated) ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit)
    const base = `https://agentcrush.xyz/api/agents/dataset`
    const qs = (p) => {
      const parts = [`page=${p}`, `limit=${limit}`]
      if (category) parts.push(`category=${category}`)
      if (tier) parts.push(`tier=${tier}`)
      if (minScore != null) parts.push(`min_score=${minScore}`)
      return parts.join('&')
    }

    const linkParts = []
    if (page < totalPages) linkParts.push(`<${base}?${qs(page + 1)}>; rel="next"`)
    if (page > 1)          linkParts.push(`<${base}?${qs(page - 1)}>; rel="prev"`)
    linkParts.push(`<${base}?${qs(1)}>; rel="first"`)
    if (totalPages > 1)    linkParts.push(`<${base}?${qs(totalPages)}>; rel="last"`)

    const body = {
      meta: {
        total: totalCount,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
        filters: {
          category: category || null,
          tier: tier || null,
          min_score: minScore,
        },
        formats: {
          json: `${base}?format=json`,
          jsonl: `${base}?format=jsonl`,
          csv: `${base}?format=csv`,
          huggingface: 'https://huggingface.co/datasets/agentcrush/agents-index',
        },
      },
      agents,
      _attribution: attributionBlock({
        sourceUrl: 'https://agentcrush.xyz/rankings',
        methodologyUrl: 'https://agentcrush.xyz/methodology',
        endpointUrl: `${base}?${qs(page)}`,
        lastUpdated: new Date().toISOString(),
      }),
    }

    const extraHeaders = {
      'X-Total-Count': String(totalCount),
      'X-Total-Pages': String(totalPages),
      'X-Page': String(page),
    }
    if (linkParts.length) extraHeaders.Link = linkParts.join(', ')

    return new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: { ...HEADERS_JSON, ...extraHeaders },
    })
  } catch (err) {
    console.error('[/api/agents/dataset]', err)
    return new Response(JSON.stringify({
      error: { code: 'internal_error', message: err.message },
      _attribution: attributionBlock({ sourceUrl: 'https://agentcrush.xyz' }),
    }), { status: 500, headers: HEADERS_JSON })
  }
}
