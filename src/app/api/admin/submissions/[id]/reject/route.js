import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(_req, context) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server is missing Supabase configuration.' },
        { status: 500 }
      )
    }

    const resolvedParams = await context.params
    const submissionId = String(resolvedParams?.id || '').trim()

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission id is missing.' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, status')
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

    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      return NextResponse.json(
        { error: `Reject failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      submission_id: submissionId,
      status: 'rejected',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
