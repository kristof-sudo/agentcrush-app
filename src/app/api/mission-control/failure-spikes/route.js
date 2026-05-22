import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'build-only'
)

function hoursAgo(hours) {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

export async function GET() {
  try {
    const since = hoursAgo(6)

    const [runsRes, copydeskRes, alertsRes] = await Promise.all([
      supabase
        .from('runs')
        .select('id, runner, status, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),

      supabase
        .from('copydesk_jobs')
        .select('id, status, created_at')
        .gte('created_at', since)
        .eq('status', 'failed'),

      supabase
        .from('alerts')
        .select('id, severity, code, created_at, resolved_at')
        .gte('created_at', since)
        .is('resolved_at', null),
    ])

    if (runsRes.error) throw runsRes.error
    if (copydeskRes.error) throw copydeskRes.error
    if (alertsRes.error) throw alertsRes.error

    const allRuns = runsRes.data || []
    const runFailures = allRuns.filter((row) => {
      const status = String(row.status || '').toLowerCase()
      return status === 'failed' || status === 'error'
    })

    const copydeskFailures = copydeskRes.data || []
    const openAlerts = alertsRes.data || []

    const groupedRuns = {}
    for (const row of runFailures) {
      const key = row.runner || 'unknown'
      groupedRuns[key] = (groupedRuns[key] || 0) + 1
    }

    const issues = []

    for (const [runner, count] of Object.entries(groupedRuns)) {
      if (count >= 2) {
        issues.push({
          type: 'worker_failures',
          label: `${runner} failing repeatedly`,
          description: `${count} failed/error run records in the last 6 hours.`,
          severity: count >= 5 ? 'critical' : 'warning',
        })
      }
    }

    if (copydeskFailures.length >= 3) {
      issues.push({
        type: 'copydesk_failures',
        label: 'CopyDesk failures spiking',
        description: `${copydeskFailures.length} failed CopyDesk jobs in the last 6 hours.`,
        severity: copydeskFailures.length >= 6 ? 'critical' : 'warning',
      })
    }

    if (openAlerts.length > 0) {
      issues.push({
        type: 'open_alerts',
        label: 'Unresolved system alerts',
        description: `${openAlerts.length} unresolved alert(s) in the last 6 hours.`,
        severity: openAlerts.length >= 3 ? 'critical' : 'warning',
      })
    }

    return Response.json({
      issues,
      summary: {
        total_issues: issues.length,
        run_failures: runFailures.length,
        copydesk_failures: copydeskFailures.length,
        open_alerts: openAlerts.length,
      },
    })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to load failure spikes' },
      { status: 500 }
    )
  }
}
