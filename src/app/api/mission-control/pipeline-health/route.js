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
        description: `${selectorStuck.length} signal${selectorStuck.length > 1 ? 's' : ''} waiting >${THRESHOLDS.selectorMinutes}min for ranking.`,
        action: 'Run: systemctl start x-selector.service',
        count: selectorStuck.length,
        severity: 'warning',
      })
    }

    if (copydeskStuck.length > 0) {
      alerts.push({
        key: 'copydesk',
        label: 'CopyDesk stalled',
        description: `${copydeskStuck.length} writing job${copydeskStuck.length > 1 ? 's' : ''} stuck >${THRESHOLDS.copydeskMinutes}min.`,
        action: 'Check: journalctl -u copydesk.service -n 20 — then use Retry Job below',
        count: copydeskStuck.length,
        severity: 'warning',
      })
    }

    if (approvalStuck.length > 0) {
      alerts.push({
        key: 'approval',
        label: 'Approval overdue',
        description: `${approvalStuck.length} post${approvalStuck.length > 1 ? 's' : ''} waiting >${THRESHOLDS.approvalMinutes}min for approval.`,
        action: 'Approve or reject posts in the Approval Queue above',
        count: approvalStuck.length,
        severity: 'warning',
      })
    }

    if (publishStuck.length > 0) {
      alerts.push({
        key: 'publish',
        label: 'Publish overdue',
        description: `${publishStuck.length} approved post${publishStuck.length > 1 ? 's' : ''} missed publishing window.`,
        action: 'Run: systemctl start x-publisher.service — check for X API errors',
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
