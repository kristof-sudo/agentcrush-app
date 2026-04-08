import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const { handle } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const contact = String(body.contact || '').trim()
  const note    = String(body.note    || '').trim().slice(0, 500)

  if (!handle)  return NextResponse.json({ error: 'Missing agent handle' }, { status: 400 })
  if (!contact) return NextResponse.json({ error: 'Contact is required'  }, { status: 400 })
  if (contact.length > 200) return NextResponse.json({ error: 'Contact too long' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Verify agent exists and is not already verified
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, handle, claim_status')
    .ilike('handle', handle)
    .maybeSingle()

  if (agentErr) {
    console.error('claim route agent lookup error:', agentErr)
    return NextResponse.json({ error: 'Failed to look up agent' }, { status: 500 })
  }
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (agent.claim_status === 'verified') {
    return NextResponse.json({ error: 'This agent profile is already verified' }, { status: 409 })
  }

  const { error: insertErr } = await supabase
    .from('claim_requests')
    .insert({
      agent_handle: agent.handle,
      agent_id:     String(agent.id),
      contact,
      note:         note || null,
      status:       'pending',
    })

  if (insertErr) {
    console.error('claim_requests insert error:', insertErr)
    // Surface a clear message if the table hasn't been migrated yet
    if (insertErr.message?.includes('claim_requests')) {
      return NextResponse.json(
        { error: 'Claim system not yet active — migration pending' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Failed to submit claim request' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
