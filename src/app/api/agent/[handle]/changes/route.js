/**
 * GET /api/agent/[handle]/changes?since=<ISO>&limit=<n>
 *
 * Per-agent change feed. Returns deltas computed from agent_snapshots
 * (nightly per-agent rows) between the `since` cutoff and now.
 *
 * The dependency loop: agents poll this endpoint efficiently — only one
 * round-trip per agent per day to know whether anything they depend on
 * changed. Pair with subscription webhooks (R-4.13) for push semantics.
 *
 * Query params:
 *   since — ISO timestamp; default = 7 days ago. Snapshots dated AFTER this
 *           are compared pairwise. Truncated to date precision (no intra-day).
 *   limit — max number of paired-snapshot deltas to return (default 30)
 *
 * Fields tracked for change detection:
 *   score, rank, visibility, reputation, weekly_delta, github_stars,
 *   github_forks, follower_count, claim_status, identity_type
 *
 * Strategy: brain Decisions/2026-06-06-agent-native-strategy.md (R-4.11)
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

function sanitize(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

const TRACKED_FIELDS = [
  'score', 'rank', 'visibility', 'reputation', 'weekly_delta',
  'github_stars', 'github_forks', 'follower_count',
  'claim_status', 'identity_type',
]

function isMaterialChange(field, oldV, newV) {
  if (oldV === newV) return false
  if (oldV == null && newV == null) return false
  // Numeric: require ≥ 1 unit change for ints, ≥ 0.5 for floats
  if (typeof oldV === 'number' && typeof newV === 'number') {
    return Math.abs(newV - oldV) >= 1
  }
  // String / category change — always material
  return true
}

function summarize(field, oldV, newV) {
  if (typeof oldV === 'number' && typeof newV === 'number') {
    const delta = newV - oldV
    const direction = delta > 0 ? '↑' : '↓'
    return `${field}: ${oldV} → ${newV} (${direction}${Math.abs(delta)})`
  }
  return `${field}: ${oldV ?? 'null'} → ${newV ?? 'null'}`
}

export async function OPTIONS() { return corsPreflight() }

export async function GET(req, { params }) {
  const raw = (await params).handle
  const handle = sanitize(raw)
  const url = new URL(req.url)
  const endpointUrl = `https://agentcrush.xyz/api/agent/${encodeURIComponent(handle || raw || '')}/changes`

  if (!handle) {
    return apiBadRequest({
      message: 'Handle parameter is required.',
      suggest: { example_request: 'https://agentcrush.xyz/api/agent/qwen/changes?since=2026-05-30' },
      sourceUrl: 'https://agentcrush.xyz/explore',
      endpointUrl,
    })
  }

  // Parse since: default 7 days ago
  const sinceRaw = url.searchParams.get('since')
  const sinceDate = (() => {
    if (sinceRaw) {
      const d = new Date(sinceRaw)
      if (!isNaN(d.getTime())) return d
    }
    return new Date(Date.now() - 7 * 24 * 3600 * 1000)
  })()
  const sinceIso = sinceDate.toISOString().slice(0, 10) // truncate to date
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100)

  try {
    const supabase = db()

    // Resolve handle → agent_id
    const { data: agent } = await supabase
      .from('agents')
      .select('id, handle, display_name, tier, primary_category')
      .ilike('handle', handle)
      .maybeSingle()

    if (!agent) {
      return apiNotFound({
        resource: 'Agent',
        requested: handle,
        docsUrl: 'https://agentcrush.xyz/explore',
        exampleRequest: 'https://agentcrush.xyz/api/agent/qwen/changes',
        sourceUrl: 'https://agentcrush.xyz/explore',
        endpointUrl,
      })
    }

    // Fetch snapshots for this agent since the cutoff, ascending by date
    const { data: snapshots, error } = await supabase
      .from('agent_snapshots')
      .select('snapshot_date, score, rank, visibility, reputation, weekly_delta, github_stars, github_forks, follower_count, claim_status, identity_type')
      .eq('agent_id', agent.id)
      .gte('snapshot_date', sinceIso)
      .order('snapshot_date', { ascending: true })
      .limit(limit + 1) // +1 to cover the pair-window

    if (error) throw error

    const rows = snapshots || []
    const changes = []

    // Pairwise delta scan
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]
      const curr = rows[i]
      for (const f of TRACKED_FIELDS) {
        if (isMaterialChange(f, prev[f], curr[f])) {
          changes.push({
            observed_at: curr.snapshot_date,
            previous_date: prev.snapshot_date,
            field: f,
            old: prev[f] ?? null,
            new: curr[f] ?? null,
            summary: summarize(f, prev[f], curr[f]),
          })
        }
      }
      if (changes.length >= limit) break
    }

    return apiOk({
      type: 'agent_change_feed',
      handle: agent.handle,
      name: agent.display_name || agent.handle,
      tier: agent.tier,
      primary_category: agent.primary_category,
      since: sinceIso,
      generated_at: new Date().toISOString(),
      snapshots_examined: rows.length,
      change_count: changes.length,
      changes,
      tracked_fields: TRACKED_FIELDS,
      pagination_hint: changes.length >= limit ? `${limit} changes returned; query with later since= to continue.` : null,
      subscribe_url: `https://agentcrush.xyz/api/subscriptions/agent/${encodeURIComponent(agent.handle)}`, // R-4.13 advert
      profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
    }, {
      sourceUrl: `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
      methodologyUrl: 'https://agentcrush.xyz/methodology',
      endpointUrl,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=120' },
    })

  } catch (e) {
    return apiError({
      status: 503,
      code: 'temporary_unavailable',
      message: 'Change feed temporarily unavailable.',
      hint: 'Retry after 30 seconds.',
      suggest: { docs_url: 'https://agentcrush.xyz/developers', example_request: endpointUrl },
      sourceUrl: `https://agentcrush.xyz/agent/${encodeURIComponent(handle)}`,
      endpointUrl,
    })
  }
}
