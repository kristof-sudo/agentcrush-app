/**
 * GET /weekly/[week]/json — JSON view of any weekly digest.
 *
 * Dynamic. Handles auto-generated weeks (W23+) by querying live data + the
 * brain-written ecosystem section. Special handling for legacy W21 keeps the
 * old structured payload for any consumers that linked to it.
 */

import { createClient } from '@supabase/supabase-js'
import { apiOk, apiNotFound, corsPreflight } from '@/lib/api-response'
import { parseWeekId, currentIsoWeek, formatWeekPeriod, isoWeekStart, isoWeekEnd } from '@/lib/iso-week'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LEGACY = {
  '2026-W21': {
    week: '2026-W21',
    period: 'May 18–24, 2026',
    published: '2026-05-25T00:00:00.000Z',
    url: 'https://agentcrush.xyz/weekly/2026-W21',
    summary: 'Ranking moves across all four category rankings, first multi-protocol agent milestone, x402 payment activity on Base mainnet.',
    stats: { agents_tracked: 1400, evidence_ranked: 138, snapshots: 7, ranking_moves: 40 },
    highlights: [
      'CrewAI remains the only cross-protocol agent (ERC-8004 + x402).',
      'First measurable x402 machine-caller activity on trust-summary endpoint.',
      'Qwen derivative count crossed 1,000 downstream fine-tunes.',
    ],
    categories: [
      { id: 'developer', note: 'Top 10 stable. Mid-table churn in positions 20–40.' },
      { id: 'model_family', note: 'Deployment signal variance drove 3 position swaps in the top 5.' },
      { id: 'tokenized', note: 'Liquidity-driven week. TVL signal moved two agents into evidence-ranked.' },
      { id: 'service', note: 'A2A source refresh. 4 new agents entered the tracked set.' },
    ],
  },
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export async function OPTIONS() { return corsPreflight() }

export async function GET(req, { params }) {
  const { week } = await params
  const endpointUrl = `https://agentcrush.xyz/weekly/${week}/json`

  // Legacy shape for any consumer linked to the hand-curated W21 JSON
  if (LEGACY[week]) {
    return apiOk(LEGACY[week], {
      sourceUrl: `https://agentcrush.xyz/weekly/${week}`,
      endpointUrl,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  }

  const parsed = parseWeekId(week)
  if (!parsed) {
    return apiNotFound({
      resource: 'Week',
      requested: week,
      docsUrl: 'https://agentcrush.xyz/weekly',
      exampleRequest: 'https://agentcrush.xyz/weekly/2026-W23/json',
      sourceUrl: 'https://agentcrush.xyz/weekly',
      endpointUrl,
    })
  }

  const today = currentIsoWeek()
  if (parsed.year * 100 + parsed.week > today.year * 100 + today.week) {
    return apiNotFound({
      resource: 'Week',
      requested: week,
      docsUrl: 'https://agentcrush.xyz/weekly',
      sourceUrl: 'https://agentcrush.xyz/weekly',
      endpointUrl,
    })
  }

  const supabase = db()
  const start = isoWeekStart(parsed.year, parsed.week).toISOString().slice(0, 10)
  const end = isoWeekEnd(parsed.year, parsed.week).toISOString().slice(0, 10)

  const { count: total }   = await supabase.from('agents').select('id', { count: 'exact', head: true })
  const { count: erTotal } = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'evidence_ranked')
  const { count: snap }    = await supabase.from('agent_snapshots').select('id', { count: 'exact', head: true }).gte('snapshot_date', start).lte('snapshot_date', end)

  const { data: topUp } = await supabase
    .from('agents')
    .select('handle, display_name, weekly_delta, tier, primary_category')
    .not('weekly_delta', 'is', null).gt('weekly_delta', 0)
    .order('weekly_delta', { ascending: false }).limit(10)
  const { data: topDown } = await supabase
    .from('agents')
    .select('handle, display_name, weekly_delta, tier, primary_category')
    .not('weekly_delta', 'is', null).lt('weekly_delta', 0)
    .order('weekly_delta', { ascending: true }).limit(10)

  let ecosystem = null
  try {
    const { data } = await supabase.from('weekly_digest_sections').select('ecosystem_section').eq('week_id', week).maybeSingle()
    ecosystem = data?.ecosystem_section || null
  } catch { /* table may not be migrated yet */ }

  return apiOk({
    type: 'weekly_digest_json',
    week,
    period: formatWeekPeriod(parsed.year, parsed.week),
    published: isoWeekEnd(parsed.year, parsed.week).toISOString(),
    url: `https://agentcrush.xyz/weekly/${week}`,
    ecosystem_summary: ecosystem,
    ecosystem_status: ecosystem ? 'present' : 'pending — generator runs Sundays 19:00 UTC',
    stats: {
      total_agents: total || 0,
      evidence_ranked: erTotal || 0,
      snapshots_in_week: snap || 0,
    },
    top_movers: {
      up:   (topUp || []).map(a => ({ handle: a.handle, name: a.display_name || a.handle, weekly_delta: a.weekly_delta, tier: a.tier, primary_category: a.primary_category, profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}` })),
      down: (topDown || []).map(a => ({ handle: a.handle, name: a.display_name || a.handle, weekly_delta: a.weekly_delta, tier: a.tier, primary_category: a.primary_category, profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}` })),
    },
    limitations: [
      'weekly_delta starts populating 2026-06-02; full-week data lands ~2026-06-09.',
      'Ecosystem summary distilled from Ajsa daily briefs via Anthropic Haiku 4.5.',
      'Auto-generated digests do not carry curated editorial; static weekly pages (W21, W22) have manual editorial.',
    ],
  }, {
    sourceUrl: `https://agentcrush.xyz/weekly/${week}`,
    methodologyUrl: 'https://agentcrush.xyz/methodology',
    endpointUrl,
    headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=300' },
  })
}
