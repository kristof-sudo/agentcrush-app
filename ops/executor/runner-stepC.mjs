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
    status: 'stepC_success',
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
  fs.readFileSync(path.resolve('ops/executor/config.v1.json'), 'utf-8'),
)
const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'))

if (!config.report_output_dir) {
  console.error('Missing report_output_dir in config')
  process.exit(1)
}

const reportPath = path.join(config.report_output_dir, `${task.task_id}.json`)

// --- VALIDATION ---
if (!task.commit_message) {
  fail('commit', 'Missing commit_message', reportPath)
}

const workspaceTaskId = task.workspace_task_id || task.task_id
const workspaceDir = path.join(config.executor_workspace_root, workspaceTaskId)

if (!fs.existsSync(workspaceDir)) {
  fail('commit', 'Workspace does not exist. Step B must run first.', reportPath, {
    workspace_task_id: workspaceTaskId,
  })
}

// --- VERIFY CHANGES EXIST ---
let changedFiles = []
try {
  const changedRaw = run('git diff --name-only', workspaceDir)
  changedFiles = changedRaw.split('\n').map((s) => s.trim()).filter(Boolean)

  if (changedFiles.length !== 1) {
    fail('commit', 'Unexpected changed file count before commit', reportPath, {
      changed_files: changedFiles,
    })
  }

  if (changedFiles[0] !== task.target_repo_file) {
    fail('commit', 'Changed file mismatch before commit', reportPath, {
      changed_file: changedFiles[0],
      target_repo_file: task.target_repo_file,
    })
  }
} catch (e) {
  fail('commit', 'Failed to inspect workspace changes', reportPath, {
    error: String(e?.message || e),
  })
}

// --- COMMIT ---
let commitSha = null
try {
  run(`git add ${task.target_repo_file}`, workspaceDir)
  run(
    `git -c user.name="executor" -c user.email="executor@local" commit -m "${task.commit_message}"`,
    workspaceDir,
  )
  commitSha = run('git rev-parse HEAD', workspaceDir)
} catch (e) {
  fail('commit', 'Commit failed', reportPath, {
    error: String(e?.message || e),
  })
}

// --- VERIFY CLEAN AFTER COMMIT ---
try {
  const status = run('git status --porcelain', workspaceDir)
  if (status.length > 0) {
    fail('commit', 'Workspace not clean after commit', reportPath, {
      git_status: status,
    })
  }
} catch (e) {
  fail('commit', 'Post-commit verification failed', reportPath, {
    error: String(e?.message || e),
  })
}

ok(reportPath, {
  workspace: workspaceDir,
  workspace_task_id: workspaceTaskId,
  commit_sha: commitSha,
  committed_file: task.target_repo_file,
})
