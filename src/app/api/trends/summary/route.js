/**
 * GET /api/trends/summary
 *
 * LLM-readable summary of the AgentCrush ecosystem dashboard at /trends.
 * Free, no auth, 10-minute cache.
 *
 * Strategy: brain Decisions/2026-06-06-agent-native-strategy.md (R-4.4)
 */

import { createClient } from '@supabase/supabase-js'
import { apiOk, apiError, corsPreflight } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ENDPOINT_URL = 'https://agentcrush.xyz/api/trends/summary'
const SOURCE_URL = 'https://agentcrush.xyz/trends'

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export async function OPTIONS() { return corsPreflight() }

export async function GET() {
  try {
    const supabase = db()

    // Counts
    const { count: total }           = await supabase.from('agents').select('id', { count: 'exact', head: true })
    const { count: evidenceRanked }  = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'evidence_ranked')
    const { count: indexed }         = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'indexed')
    const { count: archived }        = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'archived')

    // Category mix
    const cats = ['model_family', 'tokenized', 'service', 'developer']
    const categoryMix = {}
    for (const c of cats) {
      const { count } = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('primary_category', c)
      categoryMix[c] = count || 0
    }

    // Snapshots per day, last 30
    const { data: snapshots } = await supabase
      .from('agent_snapshots')
      .select('snapshot_date')
      .gte('snapshot_date', new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10))
    const dailyCounts = {}
    for (const r of (snapshots || [])) {
      dailyCounts[r.snapshot_date] = (dailyCounts[r.snapshot_date] || 0) + 1
    }

    // Movers
    const { data: topUp } = await supabase
      .from('agents')
      .select('handle, display_name, weekly_delta, tier, primary_category')
      .not('weekly_delta', 'is', null)
      .order('weekly_delta', { ascending: false })
      .limit(10)
    const { data: topDown } = await supabase
      .from('agents')
      .select('handle, display_name, weekly_delta, tier, primary_category')
      .not('weekly_delta', 'is', null)
      .lt('weekly_delta', 0)
      .order('weekly_delta', { ascending: true })
      .limit(10)

    const summaryLine = `AgentCrush tracks ${total?.toLocaleString() || '0'} agents (${evidenceRanked || 0} evidence-ranked, ${indexed || 0} indexed, ${archived || 0} archived). Daily snapshot pipeline ran ${Object.keys(dailyCounts).length} times in the last 30 days, capturing ${(Object.values(dailyCounts).reduce((a, b) => a + b, 0)).toLocaleString()} per-agent rows. Top mover this week: ${topUp?.[0]?.display_name || topUp?.[0]?.handle || 'n/a'} (+${topUp?.[0]?.weekly_delta ?? 0}).`

    return apiOk({
      type: 'ecosystem_trends_summary',
      url: SOURCE_URL,
      summary: summaryLine,
      totals: { total: total || 0, evidence_ranked: evidenceRanked || 0, indexed: indexed || 0, archived: archived || 0 },
      category_mix: categoryMix,
      daily_snapshots: {
        window: '30d',
        days_covered: Object.keys(dailyCounts).length,
        per_day: dailyCounts,
        total_rows: Object.values(dailyCounts).reduce((a, b) => a + b, 0),
      },
      top_weekly_movers: {
        up: (topUp || []).map(a => ({
          handle: a.handle, name: a.display_name || a.handle,
          weekly_delta: a.weekly_delta, tier: a.tier, primary_category: a.primary_category,
          profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}`,
        })),
        down: (topDown || []).map(a => ({
          handle: a.handle, name: a.display_name || a.handle,
          weekly_delta: a.weekly_delta, tier: a.tier, primary_category: a.primary_category,
          profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}`,
        })),
      },
      limitations: [
        'weekly_delta started populating 2026-06-02; full-week data lands ~2026-06-09.',
        'Snapshot pipeline targets 1,000 rows/night; days with fewer indicate fetcher issues.',
        'Tier transitions are gated by methodology rules — not all rank changes flip tier.',
      ],
      methodology_url: 'https://agentcrush.xyz/methodology',
      last_updated: new Date().toISOString(),
    }, {
      sourceUrl: SOURCE_URL,
      methodologyUrl: 'https://agentcrush.xyz/methodology',
      endpointUrl: ENDPOINT_URL,
      headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=300' },
    })

  } catch (e) {
    return apiError({
      status: 503,
      code: 'temporary_unavailable',
      message: 'Trends summary temporarily unavailable.',
      hint: 'Retry after 30 seconds.',
      suggest: { docs_url: SOURCE_URL, example_request: ENDPOINT_URL },
      sourceUrl: SOURCE_URL,
      endpointUrl: ENDPOINT_URL,
    })
  }
}
