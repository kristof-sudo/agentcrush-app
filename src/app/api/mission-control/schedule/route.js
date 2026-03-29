import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FIELDS = `id, created_at, run_at, approved, status, payload, approval_token, approval_requested_at`

export async function GET() {
  try {
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const [scheduledRes, awaitingRes] = await Promise.all([
      // Approved, queued, run_at within next 24h — next to publish first
      supabase
        .from('scheduled_posts')
        .select(FIELDS)
        .eq('approved', true)
        .eq('status', 'queued')
        .gte('run_at', now.toISOString())
        .lte('run_at', in24h.toISOString())
        .order('run_at', { ascending: true }),

      // Not yet approved, waiting for action
      supabase
        .from('scheduled_posts')
        .select(FIELDS)
        .eq('approved', false)
        .eq('status', 'queued')
        .not('approval_requested_at', 'is', null)
        .order('approval_requested_at', { ascending: false })
        .limit(20),
    ])

    if (scheduledRes.error) throw scheduledRes.error
    if (awaitingRes.error) throw awaitingRes.error

    return Response.json({
      scheduled: scheduledRes.data || [],
      awaiting: awaitingRes.data || [],
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to load schedule' }, { status: 500 })
  }
}
