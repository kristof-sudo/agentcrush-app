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

// --- BASIC VALIDATION ---
if (!task.patch_file) fail('patch_apply', 'Missing patch_file', reportPath)
if (!fs.existsSync(task.patch_file)) {
  fail('patch_apply', 'Patch file not found', reportPath)
}
if (!task.target_repo_file) {
  fail('patch_apply', 'Missing target_repo_file', reportPath)
}
if (Array.isArray(task.target_repo_file)) {
  fail('patch_apply', 'Multiple target repo files not allowed', reportPath)
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

// --- VERIFY WORKSPACE CLEAN ---
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

// --- PATCH VALIDATION ---
const patchContent = fs.readFileSync(task.patch_file, 'utf-8')
const files = [...patchContent.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1])

if (files.length !== 1) {
  fail('patch_apply', 'Patch must affect exactly one file', reportPath, {
    patch_files: files,
  })
}

if (files[0] !== task.target_repo_file) {
  fail('patch_apply', 'Patch file mismatch with target_repo_file', reportPath, {
    patch_file: files[0],
    target_repo_file: task.target_repo_file,
  })
}

// --- APPLY PATCH ---
try {
  run(`git apply ${task.patch_file}`, workspaceDir)
} catch (e) {
  fail('patch_apply', 'git apply failed', reportPath, {
    error: String(e?.message || e),
  })
}

// --- VERIFY PATCH RESULT ---
try {
  const changedRaw = run('git diff --name-only', workspaceDir)
  const changedFiles = changedRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  if (changedFiles.length !== 1) {
    fail('patch_apply', 'Unexpected number of changed files after patch', reportPath, {
      changed_files: changedFiles,
    })
  }

  if (changedFiles[0] !== task.target_repo_file) {
    fail('patch_apply', 'Changed file mismatch after patch', reportPath, {
      changed_file: changedFiles[0],
      target_repo_file: task.target_repo_file,
    })
  }
} catch (e) {
  fail('patch_apply', 'Post-patch validation failed', reportPath, {
    error: String(e?.message || e),
  })
}

ok(reportPath, { workspace: workspaceDir })
