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
    .select('id, handle, display_name, archetype, claim_status, verified, visibility_score, reputation_score, weekly_delta')
    .ilike('handle', handle.trim())
    .maybeSingle()

  if (agentErr) {
    console.error('[trust-summary] agent lookup error:', agentErr)
    return err('Database error.', 500)
  }
  if (!agent) {
    return err('Agent not found.', 404)
  }

  const { data: ranking, error: rankErr } = await supabase
    .from('rankings')
    .select('global_rank, score_total, score_visibility, score_reputation, computed_at')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (rankErr) {
    console.error('[trust-summary] rankings lookup error:', rankErr)
    // Non-fatal — return agent data with null rank
  }

  const scoreTotal      = ranking?.score_total      ?? (agent.visibility_score ?? 0) + (agent.reputation_score ?? 0)
  const scoreVisibility = ranking?.score_visibility ?? agent.visibility_score ?? 0
  const scoreReputation = ranking?.score_reputation ?? agent.reputation_score ?? 0

  return ok({
    handle:       agent.handle,
    name:         agent.display_name,
    rank:         ranking?.global_rank ?? null,
    score: {
      total:        scoreTotal,
      visibility:   scoreVisibility,
      reputation:   scoreReputation,
      weekly_delta: agent.weekly_delta ?? 0,
    },
    archetype:    agent.archetype    ?? null,
    claim_status: agent.claim_status ?? null,
    verified:     agent.verified === true,
    last_updated: ranking?.computed_at ?? null,
    source:       `https://agentcrush.xyz/agent/${agent.handle}`,
  })
}
