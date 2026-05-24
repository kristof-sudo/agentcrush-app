import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, targetId } = body || {}
    const pr = body?.pr || body?.prNumber || body?.pullRequest

    if (!action || !targetId) {
      return Response.json(
        { error: 'Missing action or targetId' },
        { status: 400 }
      )
    }

    if (action === 'cancel_scheduled_post') {
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('Missing Supabase admin env')
      }

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
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('Missing Supabase admin env')
      }

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

    if (action === 'approve_scheduled_post') {
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('Missing Supabase admin env')
      }

      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          approved: true,
          publish_ready: true,
          approved_at: new Date().toISOString(),
          approved_by: 'mission_control',
        })
        .eq('id', targetId)

      if (error) throw error

      // Only trigger ship deploy if a PR number was explicitly provided
      if (pr && process.env.NEXT_SHIP_BASE_URL) {
        const repo = 'kristof-sudo/agentcrush-app'
        const shipRes = await fetch(new URL('/ship', process.env.NEXT_SHIP_BASE_URL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo, pr, approved: true }),
        })
        const shipData = await shipRes.json()
        if (!shipRes.ok) {
          throw new Error(shipData.error || 'Ship trigger failed')
        }
        return Response.json({
          success: true,
          message: 'Post approved and ship triggered',
          ship: shipData,
        })
      }

      return Response.json({ success: true, message: 'Post approved' })
    }

    if (action === 'reject_scheduled_post') {
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('Missing Supabase admin env')
      }

      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          approved: false,
          publish_ready: false,
          approved_at: new Date().toISOString(),
          approved_by: 'mission_control',
          status: 'cancelled',
        })
        .eq('id', targetId)

      if (error) throw error

      return Response.json({
        success: true,
        message: 'Scheduled post rejected',
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
