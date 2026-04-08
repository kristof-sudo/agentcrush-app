import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('claim_requests')
    .select('id, agent_handle, agent_id, contact, note, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    // Table may not be migrated yet — return empty rather than crashing the panel
    if (error.message?.includes('claim_requests')) {
      return NextResponse.json({ requests: [], migration_pending: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data || [] })
}
