/**
 * view-contracts.mjs — B21 scoring-view guard.
 *
 * Asserts every database view the product depends on (1) exists, (2) returns
 * the columns its consumers actually select, and (3) has rows where rows are
 * expected. This is the test that makes the model-family-v1.4 incident class
 * (a migration silently replacing a view and breaking a rankings page)
 * impossible to miss.
 *
 * Contracts are derived from consumer code — the columns below are what
 * src/app actually selects. If you change a view, update its consumers AND
 * this contract in the same PR.
 *
 * Runs read-only with the public anon key (publishable by design — it ships
 * in every browser bundle). Zero test-framework dependencies.
 *
 *   node tests/view-contracts.mjs
 */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwkvkfjnffxrfirhkitj.supabase.co'
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SB_KEY) {
  console.error('FAIL: no anon key in env (NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

// view -> { columns: consumer-selected columns, mustHaveRows, optional }
// optional: view ships in a not-yet-applied migration — missing view warns
// instead of failing, but a present view must still honor its contract.
const CONTRACTS = {
  agent_score_v2_top50_public_candidate: {
    mustHaveRows: true,
    columns: ['handle', 'display_name', 'rank_v2_c_public', 'score_v2_c_public_candidate', 'evidence_ready_for_public_rank', 'github_score', 'package_usage_score', 'ecosystem_score', 'dependency_score', 'docs_quality_score', 'hn_score', 'trust_score', 'coverage_tier', 'active_weight_total'],
  },
  agent_score_model_family_v1: {
    mustHaveRows: true,
    columns: ['agent_id', 'handle', 'display_name', 'model_family_score', 'rank_in_model_family', 'hf_score', 'lmarena_score', 'derivatives_score', 'citations_score', 'deployment_score', 'evidence_ready_for_public_rank', 'methodology_version', 'signals_available_count', 'hf_author', 'model_count', 'total_downloads', 'total_derivatives', 'total_citations', 'total_deployments', 'lmarena_top_arena_score'],
  },
  agent_score_tokenized_v1: {
    mustHaveRows: true,
    columns: ['agent_id', 'handle', 'display_name', 'tokenized_score', 'rank_in_tokenized', 'market_cap_score', 'liquidity_volume_score', 'holders_basket_score', 'price_momentum_score', 'tvl_score', 'social_score', 'evidence_ready_for_public_rank', 'methodology_version', 'signals_available_count', 'market_cap_usd', 'liquidity_usd', 'volume_24h_usd', 'holders', 'top10_holder_pct', 'tvl_usd', 'virtuals_name', 'virtuals_ticker', 'primary_category', 'secondary_categories'],
  },
  agent_score_service_v1: {
    mustHaveRows: true,
    columns: ['agent_id', 'handle', 'display_name', 'service_score', 'rank_in_service', 'adoption_score', 'source_quality_score', 'activity_score', 'protocol_breadth_score', 'forks_score', 'social_score', 'evidence_ready_for_public_rank', 'methodology_version', 'signals_available_count', 'a2a_stars', 'a2a_forks', 'av_interactions', 'av_rating', 'agentverse_id', 'github_full_name', 'primary_category', 'secondary_categories'],
  },
  agent_score_mcp_server_v1: { mustHaveRows: true, columns: [] },
  agent_score_model_family_v1_with_confidence: { mustHaveRows: true, columns: [] },
  ghost_index_daily: { mustHaveRows: true, columns: ['snapshot_date', 'liveness_score', 'alive_agents', 'total_agents'] },
  ghost_index_live: { mustHaveRows: true, columns: [] },
  changes_today_v1: { mustHaveRows: false, columns: ['change_type', 'handle', 'display_name', 'primary_category', 'tier', 'detail', 'happened_at'] },
  agent_protocol_compatibility_v1: {
    mustHaveRows: true,
    optional: true, // migration 20260611_2000 pending apply
    columns: ['handle', 'display_name', 'primary_category', 'tier', 'erc8004', 'x402', 'a2a', 'mcp', 'pcs'],
  },
}

async function check(view, spec) {
  const select = spec.columns.length ? spec.columns.join(',') : '*'
  const res = await fetch(`${SB_URL}/rest/v1/${view}?select=${encodeURIComponent(select)}&limit=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
  const body = await res.text()
  if (!res.ok) {
    const missing = res.status === 404 || body.includes('does not exist') || body.includes('schema cache')
    if (missing && spec.optional) return { view, status: 'SKIP', note: 'optional view not applied yet' }
    return { view, status: 'FAIL', note: `HTTP ${res.status}: ${body.slice(0, 160)}` }
  }
  let rows
  try { rows = JSON.parse(body) } catch { return { view, status: 'FAIL', note: 'non-JSON response' } }
  if (spec.mustHaveRows && rows.length === 0) return { view, status: 'FAIL', note: 'view exists but returns zero rows' }
  if (rows.length > 0 && spec.columns.length) {
    const got = Object.keys(rows[0])
    const missingCols = spec.columns.filter((c) => !got.includes(c))
    if (missingCols.length) return { view, status: 'FAIL', note: `missing columns: ${missingCols.join(', ')}` }
  }
  return { view, status: 'PASS', note: `${rows.length} row sampled, ${spec.columns.length || 'all'} columns OK` }
}

const results = await Promise.all(Object.entries(CONTRACTS).map(([v, s]) => check(v, s)))
let failed = 0
for (const r of results) {
  if (r.status === 'FAIL') failed++
  console.log(`${r.status.padEnd(5)} ${r.view} — ${r.note}`)
}
if (failed) {
  console.error(`\n${failed} view contract(s) FAILED. A migration probably broke a page consumer. See docs/migration-safety.md.`)
  process.exit(1)
}
console.log(`\nAll view contracts hold (${results.filter((r) => r.status === 'PASS').length} passed, ${results.filter((r) => r.status === 'SKIP').length} optional skipped).`)
