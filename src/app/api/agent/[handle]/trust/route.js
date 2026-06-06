/**
 * GET /api/agent/[handle]/trust
 *
 * Single-call composite trust score (0-100) + classification.
 * Designed for one common scenario: another agent is about to delegate to this
 * agent and needs to decide whether to trust the call. One HTTP GET, no auth,
 * 60-second cache, deterministic output.
 *
 * The trust score blends signals AgentCrush already has:
 *   • confidence_tier from the per-category scoring view (signal coverage)
 *   • tier (evidence_ranked / indexed / archived)
 *   • ERC-8004 verified identity
 *   • risk flags (concentration_risk, dormancy_risk) — via agent_risk_flags_v1
 *   • presence in machine-readable surfaces (MCP, x402, agent.json)
 *
 * Strategy: brain Decisions/2026-06-06-agent-native-strategy.md
 */

import { createClient } from '@supabase/supabase-js'
import { apiOk, apiError, apiBadRequest, apiNotFound, corsPreflight } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

function sanitizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

const CONFIDENCE_BASE = { high: 80, medium: 60, low: 40, provisional: 20 }
const TIER_ADJUST = { evidence_ranked: +10, indexed: 0, virtuals_economic: 0, agentverse_service: 0, archived: -25 }

export async function OPTIONS() { return corsPreflight() }

export async function GET(req, { params }) {
  const raw = (await params).handle
  const handle = sanitizeHandle(raw)
  const endpointUrl = `https://agentcrush.xyz/api/agent/${encodeURIComponent(handle || raw || '')}/trust`

  if (!handle) {
    return apiBadRequest({
      message: 'Handle parameter is required.',
      hint: 'Pass a valid handle in the URL path.',
      suggest: { example_request: 'https://agentcrush.xyz/api/agent/qwen/trust' },
      sourceUrl: 'https://agentcrush.xyz/explore',
      endpointUrl,
    })
  }

  try {
    const supabase = db()

    // Core agent record
    const { data: agent } = await supabase
      .from('agents')
      .select('id, handle, display_name, tier, primary_category, secondary_categories, identity_status, verified, github_url, website_url, virtuals_id, agentverse_id')
      .ilike('handle', handle)
      .maybeSingle()

    if (!agent) {
      return apiNotFound({
        resource: 'Agent',
        requested: handle,
        docsUrl: 'https://agentcrush.xyz/explore',
        exampleRequest: 'https://agentcrush.xyz/api/agent/qwen/trust',
        sourceUrl: 'https://agentcrush.xyz/explore',
        endpointUrl,
      })
    }

    // Confidence tier (try all category views — agent may belong to multiple)
    let bestConfidence = null
    const checkViews = [
      { view: 'agent_score_model_family_v1_with_confidence', cat: 'model_family' },
      { view: 'agent_score_tokenized_v1_with_confidence',    cat: 'tokenized' },
      { view: 'agent_score_service_v1_with_confidence',      cat: 'service' },
      { view: 'agent_score_developer_v2c_with_confidence',   cat: 'developer' },
    ]
    const confidenceByCategory = {}
    for (const { view, cat } of checkViews) {
      try {
        const col = cat === 'developer' ? 'handle' : 'agent_id'
        const val = cat === 'developer' ? agent.handle : agent.id
        const { data } = await supabase.from(view).select('confidence_tier').eq(col, val).maybeSingle()
        if (data?.confidence_tier) {
          confidenceByCategory[cat] = data.confidence_tier
          const score = CONFIDENCE_BASE[data.confidence_tier] ?? 0
          if (bestConfidence === null || score > bestConfidence.score) {
            bestConfidence = { tier: data.confidence_tier, category: cat, score }
          }
        }
      } catch (_) { /* view may not exist for some categories — skip */ }
    }

    // Risk flags
    let riskFlags = []
    try {
      const { data } = await supabase
        .from('agent_risk_flags_v1')
        .select('flag_type, severity')
        .eq('agent_id', agent.id)
      if (data) riskFlags = data.map(r => ({ flag: r.flag_type, severity: r.severity }))
    } catch (_) { /* view may not be schema-cache reloaded yet — degrade gracefully */ }

    // Surfaces — does this agent advertise machine-readable trust signals?
    // For now we ONLY have heuristics; real signal comes once a fetcher scans
    // each agent's website for /.well-known/agent.json + MCP discovery.
    const surfaces = {
      erc_8004_verified: agent.identity_status === 'verified',
      verified_flag: Boolean(agent.verified),
      has_github: Boolean(agent.github_url),
      has_website: Boolean(agent.website_url),
      indexed_in_virtuals: Boolean(agent.virtuals_id),
      indexed_in_agentverse: Boolean(agent.agentverse_id),
    }

    // Compose the score
    let score = bestConfidence?.score ?? 30 // unscored agents start low
    const breakdown = []
    breakdown.push({ factor: 'confidence_tier', value: bestConfidence?.tier ?? 'unscored', delta: score, note: bestConfidence ? `Best confidence across categories: ${bestConfidence.tier} (${bestConfidence.category})` : 'No category score yet — unscored agent.' })

    const tierAdj = TIER_ADJUST[agent.tier] ?? 0
    if (tierAdj !== 0) {
      score += tierAdj
      breakdown.push({ factor: 'tier', value: agent.tier, delta: tierAdj, note: `Tier adjustment: ${agent.tier}` })
    }

    if (surfaces.erc_8004_verified) {
      score += 10
      breakdown.push({ factor: 'erc_8004_verified', value: true, delta: +10, note: 'ERC-8004 identity attestation present.' })
    }

    for (const r of riskFlags) {
      const penalty = r.severity === 'high' ? -15 : r.severity === 'medium' ? -10 : -5
      score += penalty
      breakdown.push({ factor: `risk_flag.${r.flag}`, value: r.severity, delta: penalty, note: `Risk flag: ${r.flag} (${r.severity})` })
    }

    // Clamp
    score = Math.max(0, Math.min(100, score))

    // Classification
    let classification
    if (score >= 80) classification = 'verified'
    else if (score >= 60) classification = 'provisional'
    else if (score >= 40) classification = 'unverified'
    else classification = 'low_trust'

    const profileUrl = `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`

    return apiOk({
      type: 'agent_trust_summary',
      handle: agent.handle,
      name: agent.display_name || agent.handle,
      profile_url: profileUrl,
      trust_score: score,
      classification,
      classification_thresholds: { verified: '>=80', provisional: '60-79', unverified: '40-59', low_trust: '<40' },
      factors: {
        confidence_by_category: confidenceByCategory,
        best_confidence: bestConfidence,
        tier: agent.tier,
        primary_category: agent.primary_category,
        secondary_categories: agent.secondary_categories || [],
        risk_flags: riskFlags,
        surfaces,
      },
      score_breakdown: breakdown,
      delegation_hint:
        score >= 80
          ? 'Verified trust signal. Safe to delegate based on indexed evidence. Always validate at call time.'
          : score >= 60
          ? 'Provisional trust — significant signal coverage but some gaps. Verify capabilities + recent activity before high-stakes delegation.'
          : score >= 40
          ? 'Unverified — limited signal. Use only with explicit user confirmation or for low-stakes calls.'
          : 'Low trust — insufficient evidence or active risk flags. Recommend not delegating.',
      limitations: [
        'AgentCrush trust score reflects indexed public evidence at the time of query.',
        'No warranty — operators of downstream agents are responsible for runtime validation.',
        'Score formula evolves; track methodology_url for changelog.',
      ],
      methodology_url: 'https://agentcrush.xyz/methodology',
      full_breakdown_url: `https://agentcrush.xyz/api/agent/${encodeURIComponent(agent.handle)}/llm-summary`,
      last_updated: new Date().toISOString(),
    }, {
      sourceUrl: profileUrl,
      methodologyUrl: 'https://agentcrush.xyz/methodology',
      endpointUrl,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' },
    })

  } catch (e) {
    return apiError({
      status: 503,
      code: 'temporary_unavailable',
      message: 'Trust summary temporarily unavailable.',
      hint: 'Retry after 30 seconds.',
      suggest: { docs_url: `https://agentcrush.xyz/agent/${encodeURIComponent(handle)}`, example_request: endpointUrl },
      sourceUrl: `https://agentcrush.xyz/agent/${encodeURIComponent(handle)}`,
      endpointUrl,
    })
  }
}
