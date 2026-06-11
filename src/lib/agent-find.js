/**
 * agent-find.js — shared counterparty-discovery query for B11.
 *
 * One implementation, three consumers:
 *   /api/agents/find        (free: top 3 + total count)
 *   /api/agents/find/full   ($0.05 x402 / Pro key: up to 50, full enrichment)
 *   MCP tool find_agents    (free tier shape)
 *
 * "Counterparty-grade" result = ranked candidates with liveness, trust tier,
 * payment rails, and endpoints — the answer to "which agent can I safely pay
 * to do X". Strictly a read-out of existing index data.
 */

import { createClient } from '@supabase/supabase-js'

const ALIVE_WINDOW_DAYS = 30

export const FIND_RAILS = ['x402', 'mcp', 'erc8004', 'ap2', 'erc8183_acp', 'agentic_market_bazaar']

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function livenessOf(agent) {
  if (agent.activity_status === 'active') return 'alive'
  if (agent.last_event_at && Date.now() - new Date(agent.last_event_at).getTime() < ALIVE_WINDOW_DAYS * 86400000) {
    return 'alive'
  }
  return 'ghost'
}

function railsOf(agent) {
  return (agent.payment_rails_supported || [])
    .filter((r) => r && r.rail && r.status !== 'planned')
    .map((r) => ({ rail: r.rail, status: r.status, evidence_tier: r.evidence_tier }))
}

const SELECT_COLS =
  'handle, display_name, tagline, bio, primary_category, secondary_categories, tier, verified, claim_status, activity_status, last_event_at, visibility_score, reputation_score, weekly_delta, payment_rails_supported, website_url, github_url, bot_fetch_friendliness_score'

/**
 * @param {object} opts
 * @param {string}  opts.q         capability keyword (matches name/handle/tagline/bio)
 * @param {string}  [opts.category]  primary_category filter
 * @param {string}  [opts.rails]     payment rail filter (e.g. "x402")
 * @param {boolean} [opts.alive]     only agents alive per the 30-day Ghost Index rule
 * @param {string}  [opts.minTier]   "evidence_ranked" to exclude indexed-only
 * @param {number}  [opts.limit]     max candidates to return (post-filter)
 */
export async function findAgents({ q, category, rails, alive, minTier, limit = 25 }) {
  const supabase = db()
  const needle = String(q || '').slice(0, 100).replace(/[%_,()]/g, ' ').trim()
  if (!needle) return { error: 'q (capability keyword) is required' }

  let query = supabase
    .from('agents')
    .select(SELECT_COLS, { count: 'exact' })
    .or(
      `handle.ilike.%${needle}%,display_name.ilike.%${needle}%,tagline.ilike.%${needle}%,bio.ilike.%${needle}%`
    )

  if (category) query = query.eq('primary_category', category)
  if (minTier === 'evidence_ranked') query = query.eq('tier', 'evidence_ranked')
  if (rails) query = query.contains('payment_rails_supported', JSON.stringify([{ rail: rails }]))

  // PostgREST cannot AND a second or= param onto the text-match or= (returns
  // empty), so liveness is applied in JS over the top-ranked window below.
  const cappedLimit = Math.min(Math.max(limit, 1), 50)
  const fetchLimit = alive ? 50 : cappedLimit

  // evidence_ranked first, then by visibility
  query = query
    .order('tier', { ascending: true }) // 'evidence_ranked' < 'indexed' alphabetically — intentional
    .order('visibility_score', { ascending: false, nullsFirst: false })
    .limit(fetchLimit)

  const { data, count, error } = await query
  if (error) return { error: `find unavailable: ${error.message}` }

  let rows = data || []
  if (alive) rows = rows.filter((a) => livenessOf(a) === 'alive').slice(0, cappedLimit)

  const candidates = rows.map((a, i) => ({
    rank: i + 1,
    handle: a.handle,
    name: a.display_name || a.handle,
    tagline: a.tagline || (a.bio ? a.bio.slice(0, 140) : null),
    primary_category: a.primary_category,
    tier: a.tier,
    verified: !!a.verified,
    claim_status: a.claim_status,
    liveness: livenessOf(a),
    payment_rails: railsOf(a),
    machine_readiness_score: a.bot_fetch_friendliness_score ?? null,
    scores: {
      visibility: a.visibility_score,
      reputation: a.reputation_score,
      weekly_delta: a.weekly_delta,
    },
    profile_url: `https://agentcrush.xyz/agent/${a.handle}`,
    trust_eval_url: `https://agentcrush.xyz/api/trust/evaluate?handle=${a.handle}`,
    website_url: a.website_url || null,
    github_url: a.github_url || null,
  }))

  return {
    query: needle,
    filters: { category: category || null, rails: rails || null, alive: !!alive, min_tier: minTier || null },
    total_matches: count ?? candidates.length,
    ...(alive && { note: `liveness filter applied to the top ${fetchLimit} ranked matches` }),
    candidates,
    methodology_url: 'https://agentcrush.xyz/methodology',
  }
}
