#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'

function run(cmd, cwd = null) {
  return execSync(cmd, { cwd: cwd || process.cwd(), stdio: 'pipe' }).toString().trim()
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

const taskFile = process.argv[2]
if (!taskFile) process.exit(1)

const config = JSON.parse(fs.readFileSync('ops/executor/config.v1.json','utf-8'))
const task = JSON.parse(fs.readFileSync(taskFile,'utf-8'))

const reportsRoot = config.report_output_dir
const taskId = task.task_id

// STEP A
try {
  const status = run('git status --porcelain', config.repo_source_path)
  if (status.length) fail(reportsRoot, taskId, 'A', 'repo not clean')
  ok(reportsRoot, taskId, 'A')
} catch(e){ fail(reportsRoot, taskId, 'A', String(e)) }

// STEP B
const workspace = path.join(config.executor_workspace_root, taskId)
try {
  if (fs.existsSync(workspace)) fs.rmSync(workspace,{recursive:true,force:true})
  run(`git clone ${config.repo_source_path} ${workspace}`)
  run(`git apply ${task.patch_file}`, workspace)
  ok(reportsRoot, taskId, 'B', { workspace })
} catch(e){ fail(reportsRoot, taskId, 'B', String(e)) }

// STEP C
let commitSha
try {
  run(`git add ${task.target_repo_file}`, workspace)
  run(`git -c user.name="executor" -c user.email="executor@local" commit -m "${task.commit_message}"`, workspace)
  commitSha = run('git rev-parse HEAD', workspace)
  ok(reportsRoot, taskId, 'C', { commitSha })
} catch(e){ fail(reportsRoot, taskId, 'C', String(e)) }

// STEP D
let releaseSha
try {
  run('git fetch origin', workspace)
  run(`git checkout -B rel origin/${task.push_branch}`, workspace)
  run(`git cherry-pick ${commitSha}`, workspace)
  releaseSha = run('git rev-parse HEAD', workspace)
  run(`git push origin HEAD:${task.push_branch}`, workspace)
  run(`bash ${config.deploy_script_path}`, config.repo_source_path)
  ok(reportsRoot, taskId, 'D', { releaseSha })
} catch(e){ fail(reportsRoot, taskId, 'D', String(e)) }

// STEP E
try {
  const repoFile = path.join(config.repo_source_path, task.target_repo_file)
  const runtimeFile = task.target_runtime_file
  if (hashFile(repoFile) !== hashFile(runtimeFile)) fail(reportsRoot, taskId, 'E', 'file mismatch')
  const timer = run(`systemctl is-active ${task.expected_timer}`)
  if (timer !== 'active') fail(reportsRoot, taskId, 'E', 'timer inactive')
  const logs = run(`journalctl -u ${task.expected_service} -n ${task.journal_lines}`)
  if (!logs.includes(task.expected_log_evidence)) fail(reportsRoot, taskId, 'E', 'no evidence')
  ok(reportsRoot, taskId, 'E')
} catch(e){ fail(reportsRoot, taskId, 'E', String(e)) }

// STEP F
try {
  const dir = path.join(reportsRoot, taskId)
  const files = fs.readdirSync(dir)
  ok(reportsRoot, taskId, 'F', { files })
} catch(e){ fail(reportsRoot, taskId, 'F', String(e)) }

console.log('EXECUTOR COMPLETE')
