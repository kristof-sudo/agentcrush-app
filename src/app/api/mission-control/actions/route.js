import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

    if (action === 'approve_scheduled_post') {
      const approvedAt = new Date().toISOString()
      const missingSupabaseEnv =
        !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY
      const localTestMode = process.env.NODE_ENV !== "production" && missingSupabaseEnv

      if (!localTestMode) {
        const { error } = await supabase
          .from('scheduled_posts')
          .update({
            approved: true,
            publish_ready: true,
            approved_at: approvedAt,
            approved_by: 'mission_control',
          })
          .eq('id', targetId)

        if (error) throw error
      }

      const repo = 'kristof-sudo/agentcrush-app'
      if (!pr) {
        throw new Error("Missing PR number for ship trigger")
      }

      console.log("APPROVAL → SHIP", {
        repo,
        pr,
        action,
        targetId,
        timestamp: new Date().toISOString()
      })

      const shipRes = await fetch(new URL("/ship", request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, pr, approved: true })
      })

      const shipData = await shipRes.json()

      if (!shipRes.ok) {
        throw new Error(shipData.error || 'Ship trigger failed')
      }

      if (localTestMode) {
        return Response.json({
          success: true,
          local_test_mode: true,
          supabase_skipped: true,
          ship: shipData,
        })
      }

      return Response.json({
        success: true,
        message: 'Scheduled post approved and ship triggered',
        ship: shipData,
      })
    }

    if (action === 'reject_scheduled_post') {
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
