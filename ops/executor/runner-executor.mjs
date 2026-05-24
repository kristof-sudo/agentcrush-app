#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFileSync } from 'child_process'

console.log('EXECUTOR START')

function run(cmd, cwd = null) {
  const parts = cmd.split(' ')
  const command = parts[0]
  const args = parts.slice(1)

  return execFileSync(command, args, {
    cwd: cwd || process.cwd(),
    stdio: 'pipe',
    env: {
      ...process.env,
      PATH: '/usr/bin:/bin:/usr/local/bin'
    }
  }).toString().trim()
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function hashFile(p) {
  const data = fs.readFileSync(p)
  return crypto.createHash('sha256').update(data).digest('hex')
}

function writeReport(baseDir, taskId, stage, payload) {
  const dir = path.join(baseDir, taskId)
  ensureDir(dir)
  const file = path.join(dir, `${stage}.json`)
  fs.writeFileSync(file, JSON.stringify(payload, null, 2))
}

function fail(baseDir, taskId, stage, reason, extra = {}) {
  writeReport(baseDir, taskId, stage, {
    status: 'failed',
    stage,
    reason,
    ...extra
  })
  process.exit(1)
}

function ok(baseDir, taskId, stage, extra = {}) {
  writeReport(baseDir, taskId, stage, {
    status: 'ok',
    stage,
    ...extra
  })
}

function tryRun(cmd, cwd = null) {
  try {
    return { ok: true, output: run(cmd, cwd) }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

const taskFile = process.argv[2]
if (!taskFile) process.exit(1)

const config = JSON.parse(fs.readFileSync('ops/executor/config.v1.json','utf-8'))
const task = JSON.parse(fs.readFileSync(taskFile,'utf-8'))

const reportsRoot = config.report_output_dir
const taskId = task.task_id

console.log('RUNNING STEP A')

// STEP A
try {
  run('git fetch', config.repo_source_path)
  ok(reportsRoot, taskId, 'A')
} catch(e){
  fail(reportsRoot, taskId, 'A', String(e))
}

console.log('RUNNING STEP B')

// STEP B
const workspace = path.join(config.executor_workspace_root, taskId)
try {
  if (fs.existsSync(workspace)) fs.rmSync(workspace,{recursive:true,force:true})
  run(`git clone --branch ${config.allowed_branch} --single-branch ${config.repo_source_path} ${workspace}`)

  const filePath = task.file_path
  const expectedHash = task.expected_hash
  const newContent = task.full_content

  if (!filePath || !expectedHash || !newContent) {
    fail(reportsRoot, taskId, 'B', 'missing file_write fields')
  }

  if (!filePath.startsWith('src/')) {
    fail(reportsRoot, taskId, 'B', 'path not allowed', { filePath })
  }

  const fullPath = path.join(workspace, filePath)

  if (!fs.existsSync(fullPath)) {
    fail(reportsRoot, taskId, 'B', 'file not found', { filePath })
  }

  const currentContent = fs.readFileSync(fullPath, 'utf8')
  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex')

  if (currentHash !== expectedHash) {
    fail(reportsRoot, taskId, 'B', 'hash mismatch', {
      expected: expectedHash,
      actual: currentHash
    })
  }

  fs.writeFileSync(fullPath, newContent, 'utf8')

  ok(reportsRoot, taskId, 'B', { workspace })
} catch(e){ fail(reportsRoot, taskId, 'B', String(e)) }

// STEP C
let commitSha
try {
  run(`git add ${task.file_path}`, workspace)

  run(
    `git -c user.name="executor" -c user.email="executor@local" commit -m "${task.commit_message || 'executor: file update'}"`,
    workspace
  )

  commitSha = run('git rev-parse HEAD', workspace)

  const clean = run('git status --porcelain', workspace)
  if (clean.length) fail(reportsRoot, taskId, 'C', 'workspace not clean after commit', { git_status: clean })

  ok(reportsRoot, taskId, 'C', { commitSha })
} catch(e){ fail(reportsRoot, taskId, 'C', String(e)) }

// STEP D
let releaseSha
try {
  // force correct GitHub remote
  run(`git remote set-url origin https://github.com/kristof-sudo/agentcrush-app.git`, workspace)

  releaseSha = run('git rev-parse HEAD', workspace)

  run(`git push origin HEAD:${config.allowed_branch}`, workspace)

  ok(reportsRoot, taskId, 'D', {
    release_sha: releaseSha,
    pushed_to: config.allowed_branch
  })
} catch(e){ fail(reportsRoot, taskId, 'D', String(e)) }

// STEP E
try {
  const repoFile = path.join(config.repo_source_path, task.target_repo_file)
  const runtimeFile = task.target_runtime_file

  if (!fs.existsSync(repoFile)) fail(reportsRoot, taskId, 'E', 'repo file missing', { repoFile })
  if (!fs.existsSync(runtimeFile)) fail(reportsRoot, taskId, 'E', 'runtime file missing', { runtimeFile })

  const repoHash = hashFile(repoFile)
  const runtimeHash = hashFile(runtimeFile)
  if (repoHash !== runtimeHash) fail(reportsRoot, taskId, 'E', 'file mismatch', { repoHash, runtimeHash })

  const serviceFailed = tryRun(`systemctl is-failed ${task.expected_service}`)
  if (serviceFailed.ok && serviceFailed.output === 'failed') {
    fail(reportsRoot, taskId, 'E', 'service failed', { service: task.expected_service })
  }

  let timerStatus = null
  let serviceStatus = null
  if (task.expected_timer) {
    const timer = tryRun(`systemctl is-active ${task.expected_timer}`)
    if (!timer.ok) fail(reportsRoot, taskId, 'E', 'timer check failed', { error: timer.error })
    timerStatus = timer.output
    if (timerStatus !== 'active') fail(reportsRoot, taskId, 'E', 'timer inactive', { timer: task.expected_timer, timerStatus })

    const svcEnabled = tryRun(`systemctl is-enabled ${task.expected_service}`)
    serviceStatus = svcEnabled.ok ? svcEnabled.output : 'unknown'
  } else {
    const svc = tryRun(`systemctl is-active ${task.expected_service}`)
    if (!svc.ok) fail(reportsRoot, taskId, 'E', 'service check failed', { error: svc.error })
    serviceStatus = svc.output
    if (serviceStatus !== 'active') fail(reportsRoot, taskId, 'E', 'service inactive', { serviceStatus })
  }

  const logs = run(`journalctl -u ${task.expected_service} -n ${task.journal_lines || 100} --no-pager`)
  if (!logs.includes(task.expected_log_evidence)) {
    fail(reportsRoot, taskId, 'E', 'no evidence', { expected: task.expected_log_evidence })
  }

  ok(reportsRoot, taskId, 'E', {
    file_sync: true,
    service_status: serviceStatus,
    timer: task.expected_timer || null,
    timer_status: timerStatus,
    evidence_found: true,
    repo_hash: repoHash,
    runtime_hash: runtimeHash
  })
} catch(e){ fail(reportsRoot, taskId, 'E', String(e)) }

// STEP F
try {
  const dir = path.join(reportsRoot, taskId)
  const files = fs.readdirSync(dir).sort()
  ok(reportsRoot, taskId, 'F', { files })
} catch(e){ fail(reportsRoot, taskId, 'F', String(e)) }

console.log('EXECUTOR COMPLETE')
