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
    .select('handle, display_name, tier, verified, claim_status, tier_promoted_at')
    .ilike('handle', handle.trim())
    .maybeSingle()

  if (agentErr) {
    console.error('[verification-status] agent lookup error:', agentErr)
    return err('Database error.', 500)
  }
  if (!agent) {
    return err('Agent not found.', 404)
  }

  let erc8004Registered = false
  try {
    const { count } = await supabase
      .from('agent_erc8004_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('agent_handle', agent.handle)
    erc8004Registered = (count || 0) > 0
  } catch {
    // safe to ignore
  }

  return ok({
    handle:            agent.handle,
    name:              agent.display_name,
    tier:              agent.tier         ?? null,
    verified:          agent.verified === true,
    claim_status:      agent.claim_status ?? null,
    erc8004_registered: erc8004Registered,
    last_updated:      agent.tier_promoted_at ?? null,
    source:            'agentcrush',
  })
}
