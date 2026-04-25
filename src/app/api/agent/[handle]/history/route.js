import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function ok(data) {
  return NextResponse.json(data, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}

function err(message, status) {
  return NextResponse.json({ error: message }, { status })
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(_req, context) {
  const { handle } = await context.params

  if (!handle || typeof handle !== 'string' || handle.trim() === '') {
    return err('Missing agent handle.', 400)
  }

  const supabase = getSupabase()
  if (!supabase) return err('Server is missing Supabase configuration.', 500)

  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier')
    .ilike('handle', handle.trim())
    .maybeSingle()

  if (agentErr) {
    console.error('[history] agent lookup error:', agentErr)
    return err('Database error.', 500)
  }
  if (!agent) {
    return err('Agent not found.', 404)
  }

  const since = new Date()
  since.setDate(since.getDate() - 30)

  // Note: agent_daily_snapshots does not exist in this schema.
  // History is sourced from the rankings table via computed_at timestamps.
  const { data: rows, error: rankErr } = await supabase
    .from('rankings')
    .select('global_rank, score_total, score_visibility, score_reputation, computed_at')
    .eq('agent_id', agent.id)
    .gte('computed_at', since.toISOString())
    .order('computed_at', { ascending: true })

  if (rankErr) {
    console.error('[history] rankings lookup error:', rankErr)
    return err('Database error fetching history.', 500)
  }

  // Deduplicate to one entry per calendar day — rows are ASC so later entries
  // overwrite earlier ones for the same date, keeping the most recent per day.
  const byDate = {}
  for (const row of rows ?? []) {
    const date = row.computed_at.slice(0, 10) // YYYY-MM-DD
    byDate[date] = row
  }

  const history = Object.keys(byDate)
    .sort()
    .map((date) => {
      const row = byDate[date]
      return {
        date,
        rank:             row.global_rank      ?? null,
        score_total:      row.score_total      ?? 0,
        score_visibility: row.score_visibility ?? 0,
        score_reputation: row.score_reputation ?? 0,
        weekly_delta:     0, // not stored per rankings entry; see agents.weekly_delta for current value
      }
    })

  const first = history[0]                   ?? null
  const last  = history[history.length - 1]  ?? null

  const score30dAgo  = first?.score_total ?? 0
  const scoreCurrent = last?.score_total  ?? 0

  let trend = 'flat'
  if (score30dAgo > 0) {
    if (scoreCurrent > score30dAgo * 1.05)      trend = 'rising'
    else if (scoreCurrent < score30dAgo * 0.95) trend = 'falling'
  }

  return ok({
    handle: agent.handle,
    name:   agent.display_name,
    tier:   agent.tier ?? null,
    history,
    summary: {
      days_tracked:  history.length,
      rank_30d_ago:  first?.rank ?? null,
      rank_current:  last?.rank  ?? null,
      score_30d_ago: score30dAgo,
      score_current: scoreCurrent,
      trend,
    },
    source: `https://agentcrush.xyz/agent/${agent.handle}`,
  })
}
