#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

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
    status: 'stepB_success',
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

// --- VALIDATION (NEW CONTRACT) ---
if (!task.file_path || !task.expected_hash || !task.full_content) {
  fail('file_write', 'Missing required file_write fields', reportPath)
}

if (Array.isArray(task.file_path)) {
  fail('file_write', 'Multiple file edits not allowed', reportPath)
}

// --- WORKSPACE SETUP ---
const workspaceDir = path.join(config.executor_workspace_root, task.task_id)

try {
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true })
  }

  ensureDir(config.executor_workspace_root)

  run(
    `git clone --branch ${config.allowed_branch} --single-branch ${config.repo_source_path} ${workspaceDir}`
  )
} catch (e) {
  fail('workspace_init', 'Failed to create workspace', reportPath, {
    error: String(e?.message || e),
  })
}

// --- VERIFY CLEAN ---
try {
  const status = run('git status --porcelain', workspaceDir)
  if (status.length > 0) {
    fail('workspace_init', 'Workspace not clean after clone', reportPath, {
      git_status: status,
    })
  }
} catch (e) {
  fail('workspace_init', 'Workspace git check failed', reportPath, {
    error: String(e?.message || e),
  })
}

// --- FILE WRITE (DETERMINISTIC) ---
try {
  const filePath = task.file_path

  // allowlist (tight)
  if (!filePath.startsWith('src/')) {
    fail('file_write', 'Path not allowed', reportPath, { filePath })
  }

  const fullPath = path.join(workspaceDir, filePath)

  if (!fs.existsSync(fullPath)) {
    fail('file_write', 'Target file does not exist', reportPath, { filePath })
  }

  const currentContent = fs.readFileSync(fullPath, 'utf8')
  const currentHash = sha256(currentContent)

  if (currentHash !== task.expected_hash) {
    fail('file_write', 'Hash mismatch', reportPath, {
      expected: task.expected_hash,
      actual: currentHash,
    })
  }

  fs.writeFileSync(fullPath, task.full_content, 'utf8')

} catch (e) {
  fail('file_write', 'File write failed', reportPath, {
    error: String(e?.message || e),
  })
}

// --- VERIFY CHANGE ---
try {
  const changedRaw = run('git diff --name-only', workspaceDir)
  const changedFiles = changedRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  if (changedFiles.length !== 1) {
    fail('file_write', 'Unexpected number of changed files', reportPath, {
      changed_files: changedFiles,
    })
  }

  if (changedFiles[0] !== task.file_path) {
    fail('file_write', 'Changed file mismatch', reportPath, {
      changed_file: changedFiles[0],
      expected: task.file_path,
    })
  }

} catch (e) {
  fail('file_write', 'Post-write validation failed', reportPath, {
    error: String(e?.message || e),
  })
}

ok(reportPath, { workspace: workspaceDir })
