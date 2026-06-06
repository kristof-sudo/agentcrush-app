/**
 * GET /api/rankings/[category]/llm-summary
 *
 * Free flat JSON: full ranking for one category.
 * Mirrors MCP get_category_ranking tool for HTTP retrieval clients.
 *
 * Optional query params:
 *   ?evidence_ready_only=true|false (default true)
 *   ?limit=50  (1-100, default 50)
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

import { apiOk, apiError, apiNotFound, corsPreflight } from '@/lib/api-response'

const VALID = ['model_family', 'tokenized', 'service', 'developer']

const CATEGORY_META = {
  model_family: {
    name: 'Model Family',
    version: 'v1.4-with-deployment',
    view: 'agent_score_model_family_v1',
    rank_col: 'rank_in_model_family',
    score_col: 'model_family_score',
    page: '/rankings/model-families',
    select: 'agent_id, handle, display_name, model_family_score, rank_in_model_family, hf_score, lmarena_score, derivatives_score, citations_score, deployment_score, signals_available_count, evidence_ready_for_public_rank, total_derivatives, total_citations, total_deployments, lmarena_top_arena_score',
  },
  tokenized: {
    name: 'Tokenized Agent',
    version: 'v1.1-tokenized-tvl',
    view: 'agent_score_tokenized_v1',
    rank_col: 'rank_in_tokenized',
    score_col: 'tokenized_score',
    page: '/rankings/tokenized-agents',
    select: 'agent_id, handle, display_name, virtuals_ticker, market_cap_usd, liquidity_usd, tvl_usd, tokenized_score, rank_in_tokenized, market_cap_score, liquidity_volume_score, holders_basket_score, price_momentum_score, tvl_score, social_score, signals_available_count, evidence_ready_for_public_rank',
  },
  service: {
    name: 'Service Agent',
    version: 'v1.1-service-forks',
    view: 'agent_score_service_v1',
    rank_col: 'rank_in_service',
    score_col: 'service_score',
    page: '/rankings/service-agents',
    select: 'agent_id, handle, display_name, github_full_name, a2a_stars, a2a_forks, av_interactions, service_score, rank_in_service, adoption_score, source_quality_score, activity_score, protocol_breadth_score, forks_score, social_score, signals_available_count, evidence_ready_for_public_rank',
  },
  developer: {
    name: 'Developer Agent',
    version: 'v2.c-public',
    view: 'agent_score_v2_top50_public_candidate',
    rank_col: 'rank_v2_c_public',
    score_col: 'score_v2_c_public_candidate',
    page: '/rankings',
    select: 'handle, rank_v2_c_public, score_v2_c_public_candidate, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score, trust_score, coverage_tier, active_weight_total, evidence_ready_for_public_rank',
  },
}

function clamp(val, def, min, max) {
  const n = Number(val)
  if (!Number.isFinite(n)) return def
  return Math.min(Math.max(Math.floor(n), min), max)
}

export async function OPTIONS() { return corsPreflight() }

export async function GET(req, { params }) {
  const raw = (await params).category
  const category = typeof raw === 'string' ? raw.toLowerCase() : ''
  const endpointUrl = `https://agentcrush.xyz/api/rankings/${encodeURIComponent(category || raw || '')}/llm-summary`

  if (!VALID.includes(category)) {
    return apiNotFound({
      resource: 'Category',
      requested: category || raw,
      validValues: VALID,
      docsUrl: 'https://agentcrush.xyz/methodology',
      exampleRequest: 'https://agentcrush.xyz/api/rankings/model_family/llm-summary',
      sourceUrl: 'https://agentcrush.xyz/methodology',
      endpointUrl,
    })
  }

  const meta = CATEGORY_META[category]
  const url = new URL(req.url)
  const evidenceReadyOnly = url.searchParams.get('evidence_ready_only') !== 'false' // default true
  const limit = clamp(url.searchParams.get('limit'), 50, 1, 100)

  try {
    const supabase = db()
    let q = supabase.from(meta.view).select(meta.select).order(meta.rank_col, { ascending: true }).limit(limit)
    if (evidenceReadyOnly) q = q.eq('evidence_ready_for_public_rank', true)
    const { data, error } = await q
    if (error) throw error

    const ranking = (data || []).map((r) => ({
      handle: r.handle,
      name: r.display_name || r.handle,
      rank: r[meta.rank_col] ?? null,
      composite_score: r[meta.score_col] ?? null,
      evidence_ready: r.evidence_ready_for_public_rank ?? false,
      signals_available: r.signals_available_count ?? null,
      profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`,
      // Category-specific sub-scores
      sub_scores: Object.fromEntries(
        Object.entries(r).filter(([k]) =>
          k.endsWith('_score') && k !== meta.score_col
        )
      ),
      // Category-specific raw data
      raw: Object.fromEntries(
        Object.entries(r).filter(([k]) =>
          k.startsWith('total_') || k === 'market_cap_usd' || k === 'liquidity_usd' || k === 'tvl_usd' || k === 'a2a_stars' || k === 'a2a_forks' || k === 'av_interactions' || k === 'virtuals_ticker' || k === 'lmarena_top_arena_score' || k === 'github_full_name' || k === 'coverage_tier' || k === 'active_weight_total'
        )
      ),
    }))

    return apiOk({
      type: 'category_ranking_llm_summary',
      category,
      name: meta.name,
      methodology_version: meta.version,
      methodology_url: `https://agentcrush.xyz/methodology#${category}`,
      ranking_page_url: `https://agentcrush.xyz${meta.page}`,
      filter: { evidence_ready_only: evidenceReadyOnly, limit },
      count: ranking.length,
      ranking,
      limitations: [
        'Per-category methodology. Scores in different categories are not directly comparable.',
        'Signal coverage varies per agent.',
        'Methodology version may evolve. Scores valid for the methodology version shown.',
      ],
      last_updated: new Date().toISOString(),
      source_urls: [
        `https://agentcrush.xyz${meta.page}`,
        `https://agentcrush.xyz/methodology#${category}`,
      ],
    }, {
      sourceUrl: `https://agentcrush.xyz${meta.page}`,
      methodologyUrl: `https://agentcrush.xyz/methodology#${category}`,
      endpointUrl,
    })

  } catch (e) {
    return apiError({
      status: 503,
      code: 'temporary_unavailable',
      message: 'Category ranking summary temporarily unavailable.',
      hint: 'Retry after 30 seconds.',
      suggest: { docs_url: `https://agentcrush.xyz${meta.page}`, example_request: endpointUrl },
      sourceUrl: `https://agentcrush.xyz${meta.page}`,
      endpointUrl,
    })
  }
}
