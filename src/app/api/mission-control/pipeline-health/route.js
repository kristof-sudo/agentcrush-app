import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const THRESHOLDS = {
  selectorMinutes: 10,
  copydeskMinutes: 10,
  approvalMinutes: 30,
  publishMinutes: 5,
}

function minutesAgo(minutes) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - minutes)
  return d.toISOString()
}

export async function GET() {
  try {
    const [
      selectorRes,
      copydeskRes,
      approvalRes,
      publishRes,
    ] = await Promise.all([
      supabase
        .from('interaction_jobs')
        .select('id, created_at, status')
        .eq('status', 'pending')
        .lt('created_at', minutesAgo(THRESHOLDS.selectorMinutes)),

      supabase
        .from('copydesk_jobs')
        .select('id, created_at, status')
        .in('status', ['queued', 'processing'])
        .lt('created_at', minutesAgo(THRESHOLDS.copydeskMinutes)),

      supabase
        .from('scheduled_posts')
        .select('id, approval_requested_at, approved, status')
        .eq('status', 'queued')
        .eq('approved', false)
        .not('approval_requested_at', 'is', null)
        .lt('approval_requested_at', minutesAgo(THRESHOLDS.approvalMinutes)),

      supabase
        .from('scheduled_posts')
        .select('id, run_at, approved, publish_ready, status')
        .eq('status', 'queued')
        .eq('approved', true)
        .eq('publish_ready', true)
        .lt('run_at', minutesAgo(THRESHOLDS.publishMinutes)),
    ])

    if (selectorRes.error) throw selectorRes.error
    if (copydeskRes.error) throw copydeskRes.error
    if (approvalRes.error) throw approvalRes.error
    if (publishRes.error) throw publishRes.error

    const selectorStuck = selectorRes.data || []
    const copydeskStuck = copydeskRes.data || []
    const approvalStuck = approvalRes.data || []
    const publishStuck = publishRes.data || []

    const alerts = []

    if (selectorStuck.length > 0) {
      alerts.push({
        key: 'selector',
        label: 'Selector backlog',
        description: 'Interaction jobs have been waiting too long for decision.',
        count: selectorStuck.length,
        severity: 'warning',
      })
    }

    if (copydeskStuck.length > 0) {
      alerts.push({
        key: 'copydesk',
        label: 'CopyDesk stalled',
        description: 'Writing jobs are queued or processing longer than expected.',
        count: copydeskStuck.length,
        severity: 'warning',
      })
    }

    if (approvalStuck.length > 0) {
      alerts.push({
        key: 'approval',
        label: 'Approval overdue',
        description: 'Posts have been waiting too long for operator approval.',
        count: approvalStuck.length,
        severity: 'warning',
      })
    }

    if (publishStuck.length > 0) {
      alerts.push({
        key: 'publish',
        label: 'Publish overdue',
        description: 'Approved posts missed their intended publishing window.',
        count: publishStuck.length,
        severity: 'critical',
      })
    }

    return Response.json({
      summary: {
        total_alerts: alerts.length,
        selector_stuck: selectorStuck.length,
        copydesk_stuck: copydeskStuck.length,
        approval_stuck: approvalStuck.length,
        publish_stuck: publishStuck.length,
      },
      alerts,
      thresholds: THRESHOLDS,
    })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to load pipeline health' },
      { status: 500 }
    )
  }
}
