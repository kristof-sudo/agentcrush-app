import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SELECTOR_THRESHOLD_MIN = 10
const COPYDESK_THRESHOLD_MIN = 10
const PUBLISH_THRESHOLD_MIN = 5

function minutesAgo(min) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - min)
  return d.toISOString()
}

export async function GET() {
  try {

    const [selectorRes, copydeskRes, publishRes] = await Promise.all([

      supabase
        .from('interaction_jobs')
        .select('id, created_at, status')
        .eq('status', 'pending')
        .lt('created_at', minutesAgo(SELECTOR_THRESHOLD_MIN)),

      supabase
        .from('copydesk_jobs')
        .select('id, created_at, status')
        .in('status', ['queued','processing'])
        .lt('created_at', minutesAgo(COPYDESK_THRESHOLD_MIN)),

      supabase
        .from('scheduled_posts')
        .select('id, run_at, status')
        .eq('status','approved')
        .lt('run_at', minutesAgo(PUBLISH_THRESHOLD_MIN))

    ])

    const selector = selectorRes.data || []
    const copydesk = copydeskRes.data || []
    const publish = publishRes.data || []

    return Response.json({
      selector_stuck: selector.length,
      copydesk_stuck: copydesk.length,
      publish_stuck: publish.length,
      total_alerts: selector.length + copydesk.length + publish.length
    })

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
