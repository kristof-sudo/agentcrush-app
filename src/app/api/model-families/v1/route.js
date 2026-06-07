/**
 * GET /api/model-families/v1
 *
 * Ranked model families with composite score, sub-scores, and raw signals.
 * Methodology v1.4-with-deployment: HF (30%) + derivatives (20%) + LMArena
 * (25%) + citations (15%) + deployment (10%). Deployment is the cross-protocol
 * agent-economy moat signal — unique to AgentCrush.
 *
 * Query params:
 *   ?limit=N            — top N rows (default 25, max 100)
 *   ?evidence_only=true — only rows where evidence_ready_for_public_rank = true
 *
 * Backing view: agent_score_model_family_v1_with_confidence
 *
 * Cache: 1h. CORS-open. Intentionally free.
 */

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)
  const evidenceOnly = searchParams.get('evidence_only') === 'true'

  const supabase = db()

  try {
    let q = supabase
      .from('agent_score_model_family_v1_with_confidence')
      .select('*')
      .order('model_family_score', { ascending: false })
      .limit(limit)

    if (evidenceOnly) q = q.eq('evidence_ready_for_public_rank', true)

    const { data, error } = await q
    if (error) throw error

    const rows = (data || []).map((r) => ({
      handle:                 r.handle,
      display_name:           r.display_name,
      rank:                   r.rank_in_model_family,
      score:                  r.model_family_score,
      evidence_ready:         r.evidence_ready_for_public_rank,
      confidence_tier:        r.confidence_tier,
      signals_available:      r.signals_available_count,
      sub_scores: {
        hf:           r.hf_score,
        derivatives:  r.derivatives_score,
        lmarena:      r.lmarena_score,
        citations:    r.citations_score,
        deployment:   r.deployment_score,
      },
      raw: {
        hf_author:                  r.hf_author,
        total_downloads:            r.total_downloads,
        total_likes:                r.total_likes,
        model_count:                r.model_count,
        most_recent_modified:       r.most_recent_modified,
        lmarena_top_score:          r.lmarena_top_arena_score,
        lmarena_total_votes:        r.lmarena_total_votes,
        total_derivatives:          r.total_derivatives,
        total_derivative_downloads: r.total_derivative_downloads,
        total_citations:            r.total_citations,
        total_influential_citations:r.total_influential_citations,
        total_deployments:          r.total_deployments,
        deployments_by_source:      r.deployments_by_source,
      },
      links: {
        profile: `https://agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`,
      },
    }))

    const payload = {
      ranking: rows,
      meta: {
        count:               rows.length,
        evidence_only:       evidenceOnly,
        methodology_version: 'v1.4-with-deployment',
        weights: {
          hf:           0.30,
          derivatives:  0.20,
          lmarena:      0.25,
          citations:    0.15,
          deployment:   0.10,
        },
        confidence_tiers: {
          high:        '5 of 5 signals',
          medium:      '4 of 5 signals',
          low:         '3 of 5 signals (still evidence-ready)',
          provisional: '<3 of 5 signals (not evidence-ready)',
        },
        methodology_url: 'https://agentcrush.xyz/methodology#model-family',
        source_url:      'https://agentcrush.xyz/rankings/model-families',
        note: 'Deployment signal aggregates cross-protocol mentions across agents/bazaar_resources/erc8004_registry/agentverse_agents/virtuals_agents/a2a_agents — unique to AgentCrush. Closed-weights families (OpenAI, Anthropic, xAI) are indexed but currently unranked under v1.4; LMArena + citations + deployment backfill pending.',
      },
      _attribution: {
        index:       'AgentCrush Model Family Ranking',
        version:     '1.4',
        produced_by: 'https://agentcrush.xyz',
        license:     'CC-BY-4.0',
      },
    }

    return Response.json(payload, {
      status: 200,
      headers: { ...CORS, 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    })
  } catch (err) {
    return Response.json(
      { error: err.message, hint: 'View agent_score_model_family_v1_with_confidence may not exist. Apply migrations/20260608_1000_restore_model_family_v14.sql.' },
      { status: 500, headers: CORS }
    )
  }
}
