/**
 * GET /api/agent/[handle]/llm-summary
 *
 * Free flat JSON for retrieval-LLM clients. Returns a single agent's full
 * scoring breakdown across all categories the agent qualifies for + identity
 * signals + source URLs + limitations.
 *
 * No auth, no payment. Cached 2 min.
 */

import { createClient } from '@supabase/supabase-js'

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
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
}

const CATEGORY_VIEW = {
  model_family: 'agent_score_model_family_v1',
  tokenized:    'agent_score_tokenized_v1',
  service:      'agent_score_service_v1',
}

const METHODOLOGY_VERSION = {
  model_family: 'v1.4-with-deployment',
  tokenized:    'v1.1-tokenized-tvl',
  service:      'v1.1-service-forks',
  developer:    'v2.c-public',
}

function sanitizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

async function fuzzySuggest(supabase, q, limit = 5) {
  if (!q || q.length < 2) return []
  const safe = String(q).replace(/[%_'"\\]/g, '').slice(0, 100)
  const { data } = await supabase
    .from('agents')
    .select('handle, display_name')
    .or(`handle.ilike.%${safe}%,display_name.ilike.%${safe}%`)
    .limit(limit)
  return (data || []).map(r => ({ handle: r.handle, name: r.display_name || r.handle }))
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}

export async function GET(req, { params }) {
  const raw = (await params).handle
  const handle = sanitizeHandle(raw)
  if (!handle) {
    return Response.json({ error: 'invalid_handle', message: 'Handle parameter is required and must be alphanumeric / hyphen / underscore.' }, { status: 400, headers: HEADERS })
  }

  try {
    const supabase = db()
    const { data: agent } = await supabase
      .from('agents')
      .select('id, handle, display_name, tier, archetype, bio, tagline, primary_category, secondary_categories, ecosystem_layer, verified, identity_status, hf_author, lmarena_model_keys, semantic_scholar_paper_ids, virtuals_id, agentverse_id, github_full_name, github_url, website_url, socially_visible')
      .ilike('handle', handle)
      .maybeSingle()

    if (!agent) {
      const suggestions = await fuzzySuggest(supabase, handle)
      return Response.json({
        error: 'agent_not_found',
        message: `No agent found with handle "${handle}".`,
        suggestions,
        hint: suggestions.length > 0
          ? 'Did you mean one of the suggestions? Try GET /api/agent/{suggested_handle}/llm-summary.'
          : 'Use GET /api/agent-economy/llm-summary or the MCP search_agents tool for discovery.',
        source_urls: ['https://agentcrush.xyz/explore'],
      }, { status: 404, headers: HEADERS })
    }

    // Collect category scores
    const categoriesToCheck = new Set([agent.primary_category, ...(agent.secondary_categories || [])])
    const categoryScores = {}

    for (const cat of categoriesToCheck) {
      if (cat === 'developer') continue
      const view = CATEGORY_VIEW[cat]
      if (!view) continue
      const { data } = await supabase.from(view).select('*').eq('agent_id', agent.id).maybeSingle()
      if (data) categoryScores[cat] = {
        methodology_version: METHODOLOGY_VERSION[cat],
        composite_score: data.model_family_score ?? data.tokenized_score ?? data.service_score ?? null,
        rank: data.rank_in_model_family ?? data.rank_in_tokenized ?? data.rank_in_service ?? null,
        signals_available: data.signals_available_count ?? null,
        evidence_ready: data.evidence_ready_for_public_rank ?? false,
        sub_scores: {
          ...(data.hf_score          !== undefined ? { hf_score: data.hf_score } : {}),
          ...(data.lmarena_score     !== undefined ? { lmarena_score: data.lmarena_score } : {}),
          ...(data.derivatives_score !== undefined ? { derivatives_score: data.derivatives_score } : {}),
          ...(data.citations_score   !== undefined ? { citations_score: data.citations_score } : {}),
          ...(data.deployment_score  !== undefined ? { deployment_score: data.deployment_score } : {}),
          ...(data.market_cap_score  !== undefined ? { market_cap_score: data.market_cap_score } : {}),
          ...(data.liquidity_volume_score !== undefined ? { liquidity_volume_score: data.liquidity_volume_score } : {}),
          ...(data.holders_basket_score !== undefined ? { holders_basket_score: data.holders_basket_score } : {}),
          ...(data.price_momentum_score !== undefined ? { price_momentum_score: data.price_momentum_score } : {}),
          ...(data.tvl_score         !== undefined ? { tvl_score: data.tvl_score } : {}),
          ...(data.adoption_score    !== undefined ? { adoption_score: data.adoption_score } : {}),
          ...(data.source_quality_score !== undefined ? { source_quality_score: data.source_quality_score } : {}),
          ...(data.activity_score    !== undefined ? { activity_score: data.activity_score } : {}),
          ...(data.protocol_breadth_score !== undefined ? { protocol_breadth_score: data.protocol_breadth_score } : {}),
          ...(data.forks_score       !== undefined ? { forks_score: data.forks_score } : {}),
          ...(data.social_score      !== undefined ? { social_score: data.social_score } : {}),
        },
      }
    }

    if (categoriesToCheck.has('developer')) {
      const { data } = await supabase
        .from('agent_score_v2_top50_public_candidate')
        .select('rank_v2_c_public, score_v2_c_public_candidate, active_weight_total, coverage_tier, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score, trust_score, evidence_ready_for_public_rank')
        .eq('handle', agent.handle)
        .maybeSingle()
      if (data) categoryScores.developer = {
        methodology_version: METHODOLOGY_VERSION.developer,
        composite_score: data.score_v2_c_public_candidate ?? null,
        rank: data.rank_v2_c_public ?? null,
        active_weight_total: data.active_weight_total ?? null,
        coverage_tier: data.coverage_tier ?? null,
        evidence_ready: data.evidence_ready_for_public_rank ?? false,
        sub_scores: {
          github_score: data.github_score,
          package_usage_score: data.package_usage_score,
          dependency_score: data.dependency_score,
          ecosystem_score: data.ecosystem_score,
          docs_quality_score: data.docs_quality_score,
          hn_score: data.hn_score,
          trust_score: data.trust_score,
        },
      }
    }

    return Response.json({
      type: 'agent_llm_summary',
      handle: agent.handle,
      name: agent.display_name || agent.handle,
      url: `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
      primary_category: agent.primary_category,
      secondary_categories: agent.secondary_categories || [],
      summary: agent.bio || agent.tagline || `${agent.display_name || agent.handle} is indexed by AgentCrush.`,
      tier: agent.tier,
      archetype: agent.archetype,
      ecosystem_layer: agent.ecosystem_layer,
      verified: Boolean(agent.verified || agent.identity_status === 'verified'),
      erc8004_registered: agent.identity_status === 'verified',
      socially_visible: agent.socially_visible || false,
      identity: {
        hf_author: agent.hf_author || null,
        lmarena_model_keys: agent.lmarena_model_keys || [],
        semantic_scholar_paper_ids: agent.semantic_scholar_paper_ids || [],
        virtuals_id: agent.virtuals_id || null,
        agentverse_id: agent.agentverse_id || null,
        github_full_name: agent.github_full_name || null,
        github_url: agent.github_url || null,
        website_url: agent.website_url || null,
      },
      scores_by_category: categoryScores,
      limitations: [
        'AgentCrush tracks public evidence only.',
        'Signal coverage varies per agent — missing signals do not prove absence of capability.',
        'Methodology versions evolve. Scores are valid for the methodology version shown.',
        'Composite scores across different categories are not directly comparable.',
      ],
      methodology_url: 'https://agentcrush.xyz/methodology',
      last_updated: new Date().toISOString(),
      source_urls: [
        `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
        'https://agentcrush.xyz/methodology',
      ],
    }, { headers: HEADERS })

  } catch (e) {
    return Response.json({
      error: 'temporary_unavailable',
      message: 'Agent summary temporarily unavailable.',
      fallback_url: `https://agentcrush.xyz/agent/${encodeURIComponent(handle)}`,
    }, { status: 503, headers: HEADERS })
  }
}
