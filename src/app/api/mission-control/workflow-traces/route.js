import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Synthetic workflow_id prefixes — never real runtime or product activity
const SYNTHETIC_PREFIXES = ['wf_val_', 'gt_', 'wf_test_', 'wf_scout_test_']
const SYNTHETIC_EXACT = new Set(['wf_test_001', 'wf_scout_test_001'])

function classifyWorkflow(wfId, eventsForWf) {
  if (SYNTHETIC_EXACT.has(wfId)) return 'SYNTHETIC_TEST'
  if (SYNTHETIC_PREFIXES.some((p) => wfId.startsWith(p))) return 'SYNTHETIC_TEST'

  const roles = new Set((eventsForWf || []).map((e) => e.role))
  if (roles.has('scanner') || roles.has('selector') || roles.has('copydesk')) return 'REAL_RUNTIME'
  if (roles.has('product_executor')) return 'REAL_PRODUCT_STATE'
  if (roles.has('scout') || roles.has('judge')) return 'SYNTHETIC_TEST'
  return 'UNKNOWN'
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: workflows, error: wfErr } = await supabase
    .from('workflows')
    .select('workflow_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (wfErr) return NextResponse.json({ error: wfErr.message }, { status: 500 })

  const ids = (workflows || []).map((w) => w.workflow_id)
  let events = []

  if (ids.length) {
    const { data, error: evErr } = await supabase
      .from('workflow_events')
      .select('workflow_id, trace_id, role, task_type, status, created_at')
      .in('workflow_id', ids)
      .order('created_at', { ascending: true })

    if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })
    events = data || []
  }

  // Group events by workflow for classification
  const eventsByWf = {}
  for (const ev of events) {
    if (!eventsByWf[ev.workflow_id]) eventsByWf[ev.workflow_id] = []
    eventsByWf[ev.workflow_id].push(ev)
  }

  // Annotate each workflow with data_reality and events_all_done flag
  const annotated = (workflows || []).map((wf) => {
    const wfEvents = eventsByWf[wf.workflow_id] || []
    const data_reality = classifyWorkflow(wf.workflow_id, wfEvents)
    // Flag: runtime ran and finished (event done) but workflow status not updated by VPS
    const events_all_done =
      wf.status === 'in_progress' &&
      wfEvents.length > 0 &&
      wfEvents.every((e) => e.status === 'done')
    return { ...wf, data_reality, events_all_done }
  })

  return NextResponse.json({ workflows: annotated, events })
}
