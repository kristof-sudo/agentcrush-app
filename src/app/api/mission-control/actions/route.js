import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, targetId } = body || {}

    if (!action || !targetId) {
      return Response.json(
        { error: 'Missing action or targetId' },
        { status: 400 }
      )
    }

    if (action === 'cancel_scheduled_post') {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          status: 'cancelled',
        })
        .eq('id', targetId)

      if (error) throw error

      return Response.json({
        success: true,
        message: 'Scheduled post cancelled',
      })
    }

    if (action === 'retry_copydesk_job') {
      const { error } = await supabase
        .from('copydesk_jobs')
        .update({
          status: 'queued',
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId)

      if (error) throw error

      return Response.json({
        success: true,
        message: 'CopyDesk job re-queued',
      })
    }

    return Response.json(
      { error: 'Unsupported action' },
      { status: 400 }
    )
  } catch (err) {
    return Response.json(
      { error: err.message || 'Action failed' },
      { status: 500 }
    )
  }
}
