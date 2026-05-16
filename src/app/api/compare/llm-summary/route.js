/**
 * GET /api/compare/llm-summary?agents=a,b[,c,d,e]
 *
 * Free flat JSON: multi-agent comparison summary.
 * 2-5 agents. No auth, no payment. Cached 2 min.
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
  'Cache-Control': 'public, max-age=120, s-maxage=120',
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
  const agentsParam = url.searchParams.get('agents') || ''
  const handles = agentsParam.split(',').map(sanitizeHandle).filter(Boolean)
  const unique = [...new Set(handles)]

  if (unique.length < 2) {
    return Response.json({
      error: 'invalid_request',
      message: 'Need 2-5 unique agent handles. Pass ?agents=handle1,handle2[,handle3,...]',
      example: 'GET /api/compare/llm-summary?agents=crewai,langgraph',
    }, { status: 400, headers: HEADERS })
  }
  if (unique.length > 5) {
    return Response.json({
      error: 'too_many_agents',
      message: 'Maximum 5 agents per comparison.',
    }, { status: 400, headers: HEADERS })
  }

  try {
    const supabase = db()

    // Fetch one llm-summary per agent by calling its endpoint logic inline
    const summaries = []
    for (const h of unique) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, handle, display_name, tier, archetype, primary_category, secondary_categories, hf_author, github_full_name, virtuals_id, agentverse_id, bio')
        .ilike('handle', h)
        .maybeSingle()
      if (!agent) {
        summaries.push({ handle: h, error: 'agent_not_found' })
        continue
      }

      // Get the primary-category score as the headline score
      let headlineScore = null
      let methodology = null
      let evidenceReady = false
      let rank = null

      if (agent.primary_category === 'developer') {
        const { data } = await supabase
          .from('agent_score_v2_top50_public_candidate')
          .select('rank_v2_c_public, score_v2_c_public_candidate, evidence_ready_for_public_rank')
          .eq('handle', agent.handle).maybeSingle()
        headlineScore = data?.score_v2_c_public_candidate ?? null
        rank = data?.rank_v2_c_public ?? null
        evidenceReady = data?.evidence_ready_for_public_rank ?? false
        methodology = 'v2.c-public'
      } else if (agent.primary_category === 'model_family') {
        const { data } = await supabase
          .from('agent_score_model_family_v1')
          .select('model_family_score, rank_in_model_family, evidence_ready_for_public_rank')
          .eq('agent_id', agent.id).maybeSingle()
        headlineScore = data?.model_family_score ?? null
        rank = data?.rank_in_model_family ?? null
        evidenceReady = data?.evidence_ready_for_public_rank ?? false
        methodology = 'v1.4-with-deployment'
      } else if (agent.primary_category === 'tokenized') {
        const { data } = await supabase
          .from('agent_score_tokenized_v1')
          .select('tokenized_score, rank_in_tokenized, evidence_ready_for_public_rank')
          .eq('agent_id', agent.id).maybeSingle()
        headlineScore = data?.tokenized_score ?? null
        rank = data?.rank_in_tokenized ?? null
        evidenceReady = data?.evidence_ready_for_public_rank ?? false
        methodology = 'v1.1-tokenized-tvl'
      } else if (agent.primary_category === 'service') {
        const { data } = await supabase
          .from('agent_score_service_v1')
          .select('service_score, rank_in_service, evidence_ready_for_public_rank')
          .eq('agent_id', agent.id).maybeSingle()
        headlineScore = data?.service_score ?? null
        rank = data?.rank_in_service ?? null
        evidenceReady = data?.evidence_ready_for_public_rank ?? false
        methodology = 'v1.1-service-forks'
      }

      summaries.push({
        handle: agent.handle,
        name: agent.display_name || agent.handle,
        url: `https://www.agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
        full_summary_url: `https://www.agentcrush.xyz/api/agent/${encodeURIComponent(agent.handle)}/llm-summary`,
        primary_category: agent.primary_category,
        secondary_categories: agent.secondary_categories || [],
        tier: agent.tier,
        archetype: agent.archetype,
        evidence_ready: evidenceReady,
        composite_score: headlineScore,
        rank,
        methodology_version: methodology,
      })
    }

    // Build a simple comparison summary
    const allSameCategory = summaries.every(s => s.primary_category === summaries[0]?.primary_category)
    const ranked = summaries
      .filter(s => s.composite_score != null)
      .sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0))
    const leader = ranked[0] || null

    const compareUrl = handles.length === 2
      ? `https://www.agentcrush.xyz/compare/${handles[0]}-vs-${handles[1]}`
      : null

    return Response.json({
      type: 'agent_comparison_llm_summary',
      agents: summaries,
      compare_page_url: compareUrl,
      summary:
        leader
          ? `AgentCrush composite-score leader among the ${summaries.length} compared agents: ${leader.name} (${leader.composite_score}) in ${leader.primary_category} category (${leader.methodology_version}).`
          : `${summaries.length} agents compared. Composite scores not available for all.`,
      cross_category_warning: !allSameCategory
        ? 'These agents span multiple primary categories. Composite scores from different categories use different methodologies and are not directly comparable. See methodology_url for each agent.'
        : null,
      limitations: [
        'AgentCrush compares public evidence — no investment, performance, or recommendation guarantee.',
        'Composite scores from different categories are not directly comparable.',
        'Methodology versions differ per category.',
        'Some agents may have null sub-scores for signals not yet measured.',
      ],
      methodology_url: 'https://www.agentcrush.xyz/methodology',
      last_updated: new Date().toISOString(),
      source_urls: summaries.map(s => s.url).filter(Boolean),
    }, { headers: HEADERS })

  } catch (e) {
    return Response.json({
      error: 'temporary_unavailable',
      message: 'Comparison summary temporarily unavailable.',
    }, { status: 503, headers: HEADERS })
  }
}
