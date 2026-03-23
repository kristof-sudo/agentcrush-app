import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

function parseScriptResult(stdoutText) {
  const lines = String(stdoutText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index])
    } catch {
      continue
    }
  }

  return null
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

    const scriptPath = path.join(process.cwd(), 'ops', 'ship-approved-task.mjs')
    const args = [scriptPath, '--repo', row.repo, '--pr', String(row.pr_number), '--approved']

    const childEnv = {
      ...process.env,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.AGENTCRUSH_GITHUB_TOKEN,
    }

    const result = spawnSync(process.execPath, args, {
      cwd: process.cwd(),
      env: childEnv,
      encoding: 'utf8',
    })

    const shipResult =
      parseScriptResult(result.stdout) ||
      parseScriptResult(result.stderr) ||
      {
        merged: false,
        deployed: false,
        health: false,
        failed_stage: 'ship',
        error: result.error?.message || 'Ship wrapper failed.',
      }

    const nextStatus = result.status === 0 ? 'shipped' : 'failed'

    const { data, error } = await supabase
      .from('build_approvals')
      .update({
        status: nextStatus,
        ship_result: shipResult,
      })
      .eq('id', row.id)
      .select()
      .single()

    if (error) throw error

    return Response.json(data)
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to ship build approval' },
      { status: 500 }
    )
  }
}
