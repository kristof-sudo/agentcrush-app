import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

async function mergePullRequest({ repo, pr }) {
  const token = process.env.GITHUB_TOKEN || process.env.AGENTCRUSH_GITHUB_TOKEN

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN.')
  }

  const [owner, name] = String(repo || '').split('/')

  if (!owner || !name) {
    throw new Error(`Invalid repo: ${repo}`)
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}/pulls/${pr}/merge`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'agentcrush-build-approval-ship',
      },
      body: JSON.stringify({ merge_method: 'squash' }),
    }
  )

  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.merged) {
    throw new Error(payload?.message || `GitHub merge failed with status ${response.status}.`)
  }

  return {
    merged: true,
    deployed: false,
    health: false,
    failed_stage: null,
    ...payload,
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      throw new Error('Missing Supabase admin env')
    }

    const body = await request.json()
    const { id } = body || {}

    const { data: row, error: loadError } = await supabase
      .from('build_approvals')
      .select('*')
      .eq('id', id)
      .single()

    if (loadError) throw loadError

    if (row?.status !== 'approved') {
      return Response.json(
        { error: 'Build approval must be approved before shipping' },
        { status: 400 }
      )
    }

    // Phase 4: hard gate — require an approved workflow_review for the exact step
    // trace_id is deterministic: same formula used in create and approve routes
    const workflowId = `wf_ba_${id}`
    const traceId = `tr_${workflowId}_01`

    const { data: reviews, error: reviewErr } = await supabase
      .from('workflow_reviews')
      .select('review_id, review_status')
      .eq('workflow_id', workflowId)
      .eq('trace_id', traceId)
      .eq('review_status', 'approved')

    // Fail closed on any error or ambiguity
    if (reviewErr) {
      console.error('[workflow] review gate query failed:', reviewErr.message)
      return Response.json(
        { error: 'Review gate query failed. Deploy blocked.' },
        { status: 500 }
      )
    }
    if (!reviews || reviews.length === 0) {
      return Response.json(
        { error: 'No approved review for this step. Deploy blocked.' },
        { status: 400 }
      )
    }
    if (reviews.length > 1) {
      console.error('[workflow] ambiguous review state: multiple approved reviews for', workflowId, traceId)
      return Response.json(
        { error: 'Ambiguous review state. Deploy blocked.' },
        { status: 400 }
      )
    }
    // reviews[0] is the single approved review — event linkage is guaranteed by FK in schema

if (!row?.repo) {
  return Response.json(
    { error: 'Build approval is missing repo' },
    { status: 400 }
  )
}

if (!row?.pr_number) {
  const { error: queueError } = await supabase
    .from('build_deploy_jobs')
    .insert([{
      status: 'queued',
      build_approval_id: row.id,
      repo: row.repo,
      pr_number: null,
      commit_sha: row.commit_sha,
    }])

  if (queueError) throw queueError

  const { data, error } = await supabase
    .from('build_approvals')
    .update({
      status: 'merged',
      ship_result: {
        merged: true,
        deployed: false,
        health: false,
        failed_stage: null,
        message: 'No PR number present; queued direct commit deploy.',
      },
    })
    .eq('id', row.id)
    .select()
    .single()

  if (error) throw error

  // Phase 4: mark workflow completed
  try {
    await supabase
      .from('workflows')
      .update({ status: 'completed' })
      .eq('workflow_id', workflowId)
  } catch (wfErr) {
    console.error('[workflow] complete failed:', wfErr?.message ?? wfErr)
  }

  return Response.json(data)
}
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to ship build approval' },
      { status: 500 }
    )
  }
}
