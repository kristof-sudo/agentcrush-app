#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function writeReport(reportPath, payload) {
  ensureDir(path.dirname(reportPath))
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2))
}

function fail(stage, reason, reportPath, extra = {}) {
  writeReport(reportPath, {
    status: 'failed',
    failed_stage: stage,
    reason,
    ...extra,
  })
  process.exit(1)
}

function ok(reportPath, extra = {}) {
  writeReport(reportPath, {
    status: 'stepD_success',
    ...extra,
  })
  process.exit(0)
}

function run(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim()
}

const taskFile = process.argv[2]
if (!taskFile) {
  console.error('Missing task file')
  process.exit(1)
}

const config = JSON.parse(
  fs.readFileSync(path.resolve('ops/executor/config.v1.json'), 'utf-8')
)
const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'))

if (!config.report_output_dir) {
  console.error('Missing report_output_dir in config')
  process.exit(1)
}

const reportPath = path.join(config.report_output_dir, `${task.task_id}.json`)

// --- WORKSPACE ---
const workspaceTaskId = task.workspace_task_id || task.task_id
const workspaceDir = path.join(config.executor_workspace_root, workspaceTaskId)

if (!fs.existsSync(workspaceDir)) {
  fail('push', 'Workspace missing', reportPath)
}

// --- VERIFY COMMIT EXISTS ---
let commitSha = null
try {
  commitSha = run('git rev-parse HEAD', workspaceDir)
} catch (e) {
  fail('push', 'Cannot resolve commit SHA', reportPath, {
    error: String(e?.message || e),
  })
}

// --- VERIFY REMOTE ---
try {
  const remote = run('git remote -v', workspaceDir)
  if (!remote.includes('origin')) {
    fail('push', 'Missing origin remote', reportPath)
  }
} catch {
  fail('push', 'Remote check failed', reportPath)
}

// --- PUSH ---
try {
  run(`git push origin HEAD:${task.push_branch}`, workspaceDir)
} catch (e) {
  fail('push', 'Push failed', reportPath, {
    error: String(e?.message || e),
  })
}

// --- DEPLOY TRIGGER ---
try {
  run(config.deploy_script_path, config.repo_source_path)
} catch (e) {
  fail('deploy', 'Deploy script failed', reportPath, {
    error: String(e?.message || e),
  })
}

ok(reportPath, {
  workspace: workspaceDir,
  commit_sha: commitSha,
  pushed_to: task.push_branch
})
