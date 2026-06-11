/**
 * GET /api/agents/bulk?handles=a,b,c,...
 *
 * Bulk lookup for AI-agent clients that need many agent details at once.
 * Up to 50 handles per call (500 with a Pro API key via X-API-Key header).
 * Returns compact details — for the FULL per-agent breakdown, use
 * /api/agent/{handle}/llm-summary or MCP get_agent_details.
 *
 * Designed for comparison-shopping agents that would otherwise make 50
 * round-trips. Free tier needs no auth or payment. Cached 2 min.
 */

import { createClient } from '@supabase/supabase-js'
import { extractApiKey, validateApiKey } from '@/lib/apiKeys'
import { trackKeyUsage } from '@/lib/telemetry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
}

function sanitizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}

export async function GET(req) {
  const url = new URL(req.url)
  const raw = url.searchParams.get('handles') || ''
  const handles = raw.split(',').map(sanitizeHandle).filter(Boolean)
  const unique = [...new Set(handles)]

  if (unique.length === 0) {
    return Response.json({
      error: 'no_handles',
      message: 'Provide ?handles=a,b,c,... (1-50 handles, comma-separated, alphanumeric/underscore/hyphen)',
      example: '/api/agents/bulk?handles=qwen,gemini,llama,mistral,cohere',
    }, { status: 400, headers: HEADERS })
  }
  if (unique.length > 50) {
    const rawKey = extractApiKey(req)
    const { valid } = await validateApiKey(rawKey)
    if (valid) trackKeyUsage(rawKey.slice(0, 15), '/api/agents/bulk')
    const cap = valid ? 500 : 50
    if (unique.length > cap) {
      return Response.json({
        error: 'too_many_handles',
        message: `Max ${cap} handles per call. You requested ${unique.length}.`,
        hint: valid
          ? 'Split into multiple calls.'
          : 'Split into multiple calls, use /api/rankings/{category}/llm-summary for full category lists, or get a Pro API key (500 handles/call) at https://agentcrush.xyz/pricing.',
      }, { status: 400, headers: HEADERS })
    }
  }

  try {
    const supabase = db()
    const { data: agents } = await supabase
      .from('agents')
      .select('id, handle, display_name, tier, archetype, primary_category, secondary_categories, ecosystem_layer, verified, identity_status, hf_author, github_full_name, virtuals_id, agentverse_id, socially_visible, bio, tagline')
      .in('handle', unique)

    if (!agents || agents.length === 0) {
      return Response.json({
        type: 'agents_bulk_summary',
        count: 0,
        requested: unique.length,
        agents: [],
        not_found: unique,
        hint: 'None of the requested handles matched. Try /api/agent/{handle}/llm-summary for fuzzy suggestions per handle.',
        last_updated: new Date().toISOString(),
      }, { headers: HEADERS })
    }

    // Get composite scores by category for each agent in one query per category
    const agentIds = agents.map(a => a.id)
    const handlesList = agents.map(a => a.handle)

    const [
      { data: mfScores },
      { data: tkScores },
      { data: svcScores },
      { data: devScores },
    ] = await Promise.all([
      supabase.from('agent_score_model_family_v1').select('agent_id, model_family_score, rank_in_model_family, evidence_ready_for_public_rank').in('agent_id', agentIds),
      supabase.from('agent_score_tokenized_v1').select('agent_id, tokenized_score, rank_in_tokenized, evidence_ready_for_public_rank').in('agent_id', agentIds),
      supabase.from('agent_score_service_v1').select('agent_id, service_score, rank_in_service, evidence_ready_for_public_rank').in('agent_id', agentIds),
      supabase.from('agent_score_v2_top50_public_candidate').select('handle, rank_v2_c_public, score_v2_c_public_candidate, evidence_ready_for_public_rank').in('handle', handlesList),
    ])

    const mfByAgent  = Object.fromEntries((mfScores || []).map(r => [r.agent_id, r]))
    const tkByAgent  = Object.fromEntries((tkScores || []).map(r => [r.agent_id, r]))
    const svcByAgent = Object.fromEntries((svcScores || []).map(r => [r.agent_id, r]))
    const devByHandle = Object.fromEntries((devScores || []).map(r => [r.handle, r]))

    const out = agents.map(a => {
      const summary = {
        handle: a.handle,
        name: a.display_name || a.handle,
        url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}`,
        full_summary_url: `https://agentcrush.xyz/api/agent/${encodeURIComponent(a.handle)}/llm-summary`,
        primary_category: a.primary_category,
        secondary_categories: a.secondary_categories || [],
        tier: a.tier,
        archetype: a.archetype,
        ecosystem_layer: a.ecosystem_layer,
        verified: Boolean(a.verified || a.identity_status === 'verified'),
        erc8004_registered: a.identity_status === 'verified',
        socially_visible: a.socially_visible || false,
        bio: (a.bio || a.tagline || '').slice(0, 300),
        scores: {},
      }
      if (mfByAgent[a.id])   summary.scores.model_family = { composite: mfByAgent[a.id].model_family_score, rank: mfByAgent[a.id].rank_in_model_family, evidence_ready: mfByAgent[a.id].evidence_ready_for_public_rank, methodology_version: 'v1.4-with-deployment' }
      if (tkByAgent[a.id])   summary.scores.tokenized    = { composite: tkByAgent[a.id].tokenized_score, rank: tkByAgent[a.id].rank_in_tokenized, evidence_ready: tkByAgent[a.id].evidence_ready_for_public_rank, methodology_version: 'v1.1-tokenized-tvl' }
      if (svcByAgent[a.id])  summary.scores.service      = { composite: svcByAgent[a.id].service_score, rank: svcByAgent[a.id].rank_in_service, evidence_ready: svcByAgent[a.id].evidence_ready_for_public_rank, methodology_version: 'v1.1-service-forks' }
      if (devByHandle[a.handle]) summary.scores.developer = { composite: devByHandle[a.handle].score_v2_c_public_candidate, rank: devByHandle[a.handle].rank_v2_c_public, evidence_ready: devByHandle[a.handle].evidence_ready_for_public_rank, methodology_version: 'v2.c-public' }
      return summary
    })

    const foundHandles = new Set(out.map(a => a.handle.toLowerCase()))
    const notFound = unique.filter(h => !foundHandles.has(h.toLowerCase()))

    return Response.json({
      type: 'agents_bulk_summary',
      count: out.length,
      requested: unique.length,
      agents: out,
      not_found: notFound,
      limitations: [
        'Compact view only — for full per-agent details use /api/agent/{handle}/llm-summary or MCP get_agent_details.',
        'Cross-category composite scores are not directly comparable (different methodology versions per category).',
        'AgentCrush tracks public evidence only.',
      ],
      methodology_url: 'https://agentcrush.xyz/methodology',
      last_updated: new Date().toISOString(),
    }, { headers: HEADERS })

  } catch (e) {
    return Response.json({
      error: 'temporary_unavailable',
      message: 'Bulk agent lookup temporarily unavailable.',
    }, { status: 503, headers: HEADERS })
  }
}
