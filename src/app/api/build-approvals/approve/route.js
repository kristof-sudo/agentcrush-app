import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      throw new Error('Missing Supabase admin env')
    }

    const body = await request.json()
    const { id, approved_by } = body || {}

    const { data, error } = await supabase
      .from('build_approvals')
      .update({
        status: 'approved',
        approved_by,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Phase 4: record review decision and advance workflow
    const workflowId = `wf_ba_${id}`
    const traceId = `tr_${workflowId}_01`

    const { error: wfReviewErr } = await supabase.from('workflow_reviews').insert({
      review_id: `rv_${traceId}`,
      workflow_id: workflowId,
      trace_id: traceId,
      reviewer_role: 'reviewer',
      review_status: 'approved',
      review_notes: approved_by ? `Approved by ${approved_by}` : 'Approved',
    })
    if (wfReviewErr) {
      console.error('[workflow] workflow_reviews insert failed:', wfReviewErr.message)
      return Response.json(
        { error: `Workflow review creation failed: ${wfReviewErr.message}` },
        { status: 500 }
      )
    }

    const { error: wfStatusErr } = await supabase
      .from('workflows')
      .update({ status: 'approved' })
      .eq('workflow_id', workflowId)
    if (wfStatusErr) {
      console.error('[workflow] workflows status update failed:', wfStatusErr.message)
      return Response.json(
        { error: `Workflow status update failed: ${wfStatusErr.message}` },
        { status: 500 }
      )
    }

    return Response.json(data)
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to approve build approval' },
      { status: 500 }
    )
  }
}
