import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: req, error: fetchErr } = await supabase
    .from('claim_requests')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !req) return NextResponse.json({ error: 'Claim request not found' }, { status: 404 })
  if (req.status !== 'pending') return NextResponse.json({ error: `Already ${req.status}` }, { status: 409 })

  const { error } = await supabase
    .from('claim_requests')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
