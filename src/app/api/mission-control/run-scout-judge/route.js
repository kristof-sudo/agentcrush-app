import { NextResponse } from 'next/server'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../')
const RUNNER = path.join(ROOT, 'tools/run-scout-judge-workflow.mjs')

export async function POST() {
  const result = spawnSync('node', [RUNNER], {
    encoding: 'utf8',
    timeout: 30_000,
  })

  const stdout = String(result.stdout || '').trim()
  const stderr = String(result.stderr || '').trim()

  // Extract workflow_id from first line: "workflow_id: wf_..."
  const workflowId = stdout.match(/workflow_id:\s*(\S+)/)?.[1] ?? null

  if (result.status !== 0 || result.error) {
    const reason = result.error?.message || stderr || `exit status ${result.status}`
    return NextResponse.json({ ok: false, error: reason, stderr, stdout }, { status: 500 })
  }

  return NextResponse.json({ ok: true, workflow_id: workflowId, stdout, stderr })
}
