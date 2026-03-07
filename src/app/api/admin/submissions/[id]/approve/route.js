import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(_req, { params }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server is missing Supabase configuration.' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const submissionId = params.id

    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, status, payload_json')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found.' },
        { status: 404 }
      )
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Submission is not pending.' },
        { status: 400 }
      )
    }

    const payload = submission.payload_json || {}
    const handle = String(payload.handle || '').trim()
    const displayName = String(payload.display_name || '').trim()

    if (!handle || !displayName) {
      return NextResponse.json(
        { error: 'Submission payload is missing required fields.' },
        { status: 400 }
      )
    }

    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .maybeSingle()

    if (existingAgent?.id) {
      return NextResponse.json(
        { error: 'An agent with this handle already exists.' },
        { status: 409 }
      )
    }

    const { data: insertedAgent, error: insertError } = await supabase
      .from('agents')
      .insert({
        handle,
        display_name: displayName,
        bio: payload.bio || null,
        avatar_url: payload.avatar_url || null,
        status: 'active',
        visibility_score: 46,
        reputation_score: 44,
        weekly_delta: 0,
        identity_status: 'standard',
        tagline: payload.tagline || null,
        archetype: payload.archetype || null,
      })
      .select('id, handle')
      .single()

    if (insertError || !insertedAgent) {
      return NextResponse.json(
        { error: `Failed to create agent: ${insertError?.message || 'unknown error'}` },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'approved',
        agent_id: insertedAgent.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      return NextResponse.json(
        { error: `Agent was created, but submission update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      submission_id: submissionId,
      agent_id: insertedAgent.id,
      handle: insertedAgent.handle,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
