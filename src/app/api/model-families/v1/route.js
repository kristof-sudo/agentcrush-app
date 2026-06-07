/**
 * GET /api/model-families/v1
 *
 * Ranked model families with composite score, sub-scores, and raw signals.
 * Mirrors /api/ghost-index/v1: CORS-open, intentionally free, citation-friendly.
 *
 * Query params:
 *   ?limit=N            — top N rows (default 25, max 100)
 *   ?evidence_only=true — only rows where evidence_ready_for_public_rank = true
 *
 * Backing view: agent_score_model_family_v1 (methodology v1.0-model-family-v0)
 *
 * Cache: 1h (composite score moves with daily snapshot ingestion).
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
      .from('agent_score_model_family_v1')
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
      tier:                   r.tier,
      activity_status:        r.activity_status,
      evidence_ready:         r.evidence_ready_for_public_rank,
      signals_available:      r.signals_available_count,
      sub_scores: {
        expert_visibility:    r.expert_visibility_score,
        github_stars:         r.github_stars_score,
        followers:            r.followers_score,
        reputation:           r.reputation_basket_score,
        recency:              r.recency_score,
      },
      raw: {
        visibility_score:     r.raw_visibility_score,
        reputation_score:     r.raw_reputation_score,
        github_stars:         r.raw_github_stars,
        follower_count:       r.raw_follower_count,
        last_event_at:        r.raw_last_event_at,
        latest_snapshot_date: r.latest_snapshot_date,
      },
      links: {
        profile:  `https://agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`,
        website:  r.website_url,
        github:   r.github_url,
        x:        r.x_handle ? `https://x.com/${r.x_handle}` : null,
      },
      bio: r.bio,
    }))

    const payload = {
      ranking: rows,
      meta: {
        count:                rows.length,
        evidence_only:        evidenceOnly,
        methodology_version:  'v1.0-model-family-v0',
        weights: {
          expert_visibility:  0.40,
          github_stars:       0.20,
          followers:          0.15,
          reputation:         0.15,
          recency:            0.10,
        },
        methodology_url:      'https://agentcrush.xyz/methodology#model-family',
        source_url:           'https://agentcrush.xyz/rankings/model-families',
        note: 'v1.0 anchors on expert_visibility (analyst-curated from HuggingFace downloads, LMSYS Arena rank, derivative model count, and agentic adoption). v1.1 will replace it with ingested sub-signals.',
      },
      _attribution: {
        index:       'AgentCrush Model Family Ranking',
        version:     '1.0',
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
      { error: err.message, hint: 'agent_score_model_family_v1 view may not be migrated yet. Apply migrations/20260608_0920_model_family_scoring_view.sql.' },
      { status: 500, headers: CORS }
    )
  }
}
