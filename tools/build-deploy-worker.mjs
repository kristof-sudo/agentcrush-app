#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const ENV_FILES = [
  path.join(ROOT_DIR, '.env'),
  path.join(ROOT_DIR, '.env.local'),
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/selector/.env',
]

function parseEnv(text) {
  const out = {}

  for (const rawLine of String(text || '').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    out[key] = value
  }

  return out
}

async function loadEnv() {
  for (const envPath of ENV_FILES) {
    try {
      const text = await fs.readFile(envPath, 'utf8')
      const parsed = parseEnv(text)

      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    } catch {
      continue
    }
  }
}

function runStage(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim()
    const stdout = String(result.stdout || '').trim()
    throw new Error(stderr || stdout || `${command} ${args.join(' ')} exited with status ${result.status}`)
  }
}

async function pickSubmittedExecutorTask(supabase) {
  const { data, error } = await supabase
    .from('executor_tasks')
    .select('*')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

async function handleSubmittedExecutorTask(supabase, task) {
  const taskId = task.task_id
  const startedAt = new Date().toISOString()

  const { error: runningError } = await supabase
    .from('executor_tasks')
    .update({
      status: 'running',
      started_at: startedAt,
    })
    .eq('task_id', taskId)

  if (runningError) throw runningError

  const runDir = `/opt/agentcrush-executor/tmp/${taskId}`
  await fs.mkdir(runDir, { recursive: true })

const taskFile = path.join(runDir, 'task.execute.json')
const patchFile = path.join(runDir, 'task.patch')

await fs.writeFile(patchFile, task.patch, 'utf8')

const taskPayload = {
  task_id: task.task_id,
  task_type: task.task_type,
  target_file: task.target_file,
  patch_file: patchFile,
  expected_html_string: task.result?.expected_html_string || null,
}

await fs.writeFile(taskFile, JSON.stringify(taskPayload, null, 2), 'utf8')

  try {
    runStage('node', [path.join(ROOT_DIR, 'ops/executor/runner-executor.mjs'), taskFile])
  } catch {
    // executor writes stage reports; final status is derived from F.json below
  }

  const reportBase = `/opt/agentcrush-executor/runs/${taskId}`
  let commitSha = null
  let failureStage = null
  let failureReason = null
  let status = 'passed'

  try {
    const cStageRaw = await fs.readFile(path.join(reportBase, 'C.json'), 'utf8')
    const cStage = JSON.parse(cStageRaw)
    commitSha = cStage?.commit_sha || null
  } catch {}

  try {
    const fStageRaw = await fs.readFile(path.join(reportBase, 'F.json'), 'utf8')
    const fStage = JSON.parse(fStageRaw)

    if (!fStage.ok) {
      status = 'failed'
      failureStage = fStage.failure_stage || null
      failureReason = fStage.failure_reason || null
    }
  } catch {
    status = 'failed'
    failureStage = 'unknown'
    failureReason = 'missing_report'
  }

  const finishedAt = new Date().toISOString()

  const { error: finalUpdateError } = await supabase
    .from('executor_tasks')
    .update({
      status,
      commit_sha: commitSha,
      report_path: reportBase,
      failure_stage: failureStage,
      failure_reason: failureReason,
      finished_at: finishedAt,
    })
    .eq('task_id', taskId)

  if (finalUpdateError) throw finalUpdateError
}

async function main() {
  await loadEnv()

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const submittedTask = await pickSubmittedExecutorTask(supabase)
  if (submittedTask) {
    await handleSubmittedExecutorTask(supabase, submittedTask)
    return
  }

  const { data: jobs, error: loadError } = await supabase
    .from('build_deploy_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)

  if (loadError) throw loadError

  const job = jobs?.[0]
  if (!job) return

  const runningAt = new Date().toISOString()

  const { error: runningError } = await supabase
    .from('build_deploy_jobs')
    .update({
      status: 'running',
      updated_at: runningAt,
    })
    .eq('id', job.id)

  if (runningError) throw runningError

  let deployResult = null
  let healthResult = null

  try {
    runStage('bash', ['deploy/deploy-prod.sh'])
    deployResult = { ok: true }

    runStage('bash', ['ops/health-check.sh'])
    healthResult = { ok: true }

    const finishedAt = new Date().toISOString()

    const { error: jobUpdateError } = await supabase
      .from('build_deploy_jobs')
      .update({
        status: 'shipped',
        deploy_result: deployResult,
        health_result: healthResult,
        error: null,
        updated_at: finishedAt,
      })
      .eq('id', job.id)

    if (jobUpdateError) throw jobUpdateError

    const { error: approvalUpdateError } = await supabase
      .from('build_approvals')
      .update({
        status: 'shipped',
        deploy_result: deployResult,
        health_result: healthResult,
      })
      .eq('id', job.build_approval_id)

    if (approvalUpdateError) throw approvalUpdateError
  } catch (error) {
    const failedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : String(error)

    const { error: jobUpdateError } = await supabase
      .from('build_deploy_jobs')
      .update({
        status: 'failed',
        deploy_result: deployResult,
        health_result: healthResult,
        error: message,
        updated_at: failedAt,
      })
      .eq('id', job.id)

    if (jobUpdateError) throw jobUpdateError

    const { error: approvalUpdateError } = await supabase
      .from('build_approvals')
      .update({
        status: 'failed',
        deploy_result: deployResult,
        health_result: healthResult,
      })
      .eq('id', job.build_approval_id)

    if (approvalUpdateError) throw approvalUpdateError

    throw error
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
