/**
 * GET /api/rankings/agent-payments-stack/llm-summary
 *
 * Free flat JSON: the full Agent Payments Stack ranking.
 * Phase 3.5 W2 — LLM Gateway integration for the payments stack category.
 *
 * Methodology: v1.0-aps (6-layer Keyrock-inspired map)
 * Layer weights: L0=4 L1=3 L2=2 L3=4 L4=5 L5=3
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
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
}

const LAYERS = {
  L0: { name: 'Settlement',   weight: 4, description: 'Settlement chain / network — where money actually moves.' },
  L1: { name: 'Wallets',      weight: 3, description: 'Agent key management + policy-gated signing.' },
  L2: { name: 'Routing',      weight: 2, description: 'Cross-chain bridging + abstraction.' },
  L3: { name: 'Protocol',     weight: 4, description: 'How the payment flow is structured (x402, MPP, AP2, etc).' },
  L4: { name: 'Governance',   weight: 5, description: 'Authorisation, compliance, identity — most valuable layer.' },
  L5: { name: 'Application',  weight: 3, description: 'Frameworks, marketplaces, autonomous services.' },
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}

export async function GET() {
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('agent_payments_stack_v1')
      .select('slug, name, description, website_url, x_handle, layers, layer_evidence, layers_spanned, stack_coverage_score, rank_overall, backing_org, funding_usd_millions, acquired_by, evidence_tier, notes, methodology_version')
      .order('rank_overall', { ascending: true })

    if (error) throw error

    const projects = (data || []).map((p) => ({
      rank: p.rank_overall,
      slug: p.slug,
      name: p.name,
      description: p.description,
      website_url: p.website_url,
      x_handle: p.x_handle ?? null,
      layers: p.layers ?? [],
      layers_spanned: p.layers_spanned ?? 0,
      stack_coverage_score: p.stack_coverage_score ?? 0,
      backing_org: p.backing_org ?? null,
      funding_usd_millions: p.funding_usd_millions ?? null,
      acquired_by: p.acquired_by ?? null,
      evidence_tier: p.evidence_tier ?? null,
    }))

    return Response.json({
      type: 'agent_payments_stack_llm_summary',
      category: 'agent_payments_stack',
      name: 'Agent Payments Stack',
      methodology_version: 'v1.0-aps',
      methodology_url: 'https://agentcrush.xyz/methodology#agent_payments_stack',
      ranking_page_url: 'https://agentcrush.xyz/rankings/agent-payments-stack',
      description: 'A 6-layer map of the agent payments ecosystem — from settlement chains to application frameworks. Inspired by Keyrock\'s "Who Pays the Agent?" report (May 2026), kept live and methodology-disclosed.',
      layers: LAYERS,
      scoring: {
        method: 'stack_coverage_score = sum of layer weights for each layer the project covers',
        layer_weights: { L0: 4, L1: 3, L2: 2, L3: 4, L4: 5, L5: 3 },
        rationale: 'Governance (L4) is most valuable — sticky once deployed. Settlement (L0) and Protocol (L3) tie at 4 — both infrastructure-level. Application (L5) and Wallets (L1) at 3 — high but more substitutable. Routing (L2) at 2 — most commoditised.',
      },
      count: projects.length,
      projects,
      limitations: [
        'This is a project taxonomy, not an agent ranking. Projects are companies, protocols, and standards — not individual AI agents.',
        'Layer coverage is determined by documented evidence as of the source date. Projects may cover more layers than currently documented.',
        'Scores within this category are not comparable to scores in model_family, tokenized, service, or developer categories.',
        'Source: Keyrock "Who Pays the Agent?" May 2026, extended by AgentCrush with Fetch Agent Launch, standards bodies, and additional infrastructure players.',
      ],
      last_updated: new Date().toISOString(),
      source_urls: [
        'https://agentcrush.xyz/rankings/agent-payments-stack',
        'https://agentcrush.xyz/agent-payments-stack',
        'https://agentcrush.xyz/methodology#agent_payments_stack',
      ],
    }, { headers: HEADERS })

  } catch (e) {
    return Response.json({
      error: 'temporary_unavailable',
      message: 'Agent Payments Stack summary temporarily unavailable.',
      fallback_url: 'https://agentcrush.xyz/rankings/agent-payments-stack',
    }, { status: 503, headers: HEADERS })
  }
}
