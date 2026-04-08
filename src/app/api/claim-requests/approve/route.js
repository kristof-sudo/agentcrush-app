import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch the claim request
  const { data: req, error: fetchErr } = await supabase
    .from('claim_requests')
    .select('id, agent_handle, agent_id, contact, status')
    .eq('id', id)
    .single()

  if (fetchErr || !req) return NextResponse.json({ error: 'Claim request not found' }, { status: 404 })
  if (req.status !== 'pending') return NextResponse.json({ error: `Already ${req.status}` }, { status: 409 })

  // Update claim request status
  const { error: claimErr } = await supabase
    .from('claim_requests')
    .update({ status: 'approved' })
    .eq('id', id)

  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 })

  // Update agent: claim_status → 'claimed', claimed_by → contact
  const agentFilter = req.agent_id
    ? supabase.from('agents').update({ claim_status: 'claimed', claimed_by: req.contact }).eq('id', req.agent_id)
    : supabase.from('agents').update({ claim_status: 'claimed', claimed_by: req.contact }).eq('handle', req.agent_handle)

  const { error: agentErr } = await agentFilter

  if (agentErr) return NextResponse.json({ error: `claim_requests updated but agent update failed: ${agentErr.message}` }, { status: 500 })

  return NextResponse.json({ ok: true })
}
