import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: failedWorkflows, error: wfErr }, { data: rejectedReviews, error: rvErr }] =
    await Promise.all([
      supabase
        .from('workflows')
        .select('workflow_id, status, created_at')
        .in('status', ['failed', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('workflow_reviews')
        .select('review_id, workflow_id, trace_id, review_status, created_at')
        .eq('review_status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  if (wfErr) return NextResponse.json({ error: wfErr.message }, { status: 500 })
  if (rvErr) return NextResponse.json({ error: rvErr.message }, { status: 500 })

  // Merge and sort by created_at desc, keep latest 20
  const items = [
    ...(failedWorkflows || []).map((w) => ({
      type: 'workflow',
      workflow_id: w.workflow_id,
      trace_id: null,
      status: w.status,
      created_at: w.created_at,
    })),
    ...(rejectedReviews || []).map((r) => ({
      type: 'review',
      workflow_id: r.workflow_id,
      trace_id: r.trace_id,
      status: r.review_status,
      created_at: r.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20)

  return NextResponse.json({ items })
}
