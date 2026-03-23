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

    if (!row?.repo || !row?.pr_number) {
      return Response.json(
        { error: 'Build approval is missing repo or pr_number' },
        { status: 400 }
      )
    }

    try {
      const shipResult = await mergePullRequest({
        repo: row.repo,
        pr: row.pr_number,
      })

      const { error: queueError } = await supabase
        .from('build_deploy_jobs')
        .insert([{
          status: 'queued',
          build_approval_id: row.id,
          repo: row.repo,
          pr_number: row.pr_number,
          commit_sha: row.commit_sha,
        }])

      if (queueError) throw queueError

      const { data, error } = await supabase
        .from('build_approvals')
        .update({
          status: 'merged',
          ship_result: shipResult,
        })
        .eq('id', row.id)
        .select()
        .single()

      if (error) throw error

      return Response.json(data)
    } catch (error) {
      const shipResult = {
        merged: false,
        deployed: false,
        health: false,
        failed_stage: 'merge',
        error: error.message || 'Merge failed.',
      }

      const { data, error: updateError } = await supabase
        .from('build_approvals')
        .update({
          status: 'failed',
          ship_result: shipResult,
        })
        .eq('id', row.id)
        .select()
        .single()

      if (updateError) throw updateError

      return Response.json(data, { status: 500 })
    }
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to ship build approval' },
      { status: 500 }
    )
  }
}
