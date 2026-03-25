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

function fail(stage, reason, reportPath) {
  writeReport(reportPath, {
    status: 'failed',
    failed_stage: stage,
    reason,
  })
  process.exit(1)
}

function ok(reportPath, extra = {}) {
  writeReport(reportPath, {
    status: 'stepB_success',
    ...extra
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

const reportPath = path.join(config.report_output_dir, `${task.task_id}.json`)

// --- BASIC VALIDATION ---
if (!task.patch_file) fail('patch_apply', 'Missing patch_file', reportPath)
if (!fs.existsSync(task.patch_file)) fail('patch_apply', 'Patch file not found', reportPath)

// --- WORKSPACE SETUP ---
const workspaceDir = path.join(config.executor_workspace_root, task.task_id)

try {
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true })
  }

  ensureDir(config.executor_workspace_root)

  run(`git clone --branch ${config.allowed_branch} --single-branch ${config.repo_source_path} ${workspaceDir}`)
} catch (e) {
  fail('workspace_init', 'Failed to create workspace', reportPath)
}

// --- VERIFY WORKSPACE CLEAN ---
try {
  const status = run('git status --porcelain', workspaceDir)
  if (status.length > 0) {
    fail('workspace_init', 'Workspace not clean after clone', reportPath)
  }
} catch {
  fail('workspace_init', 'Workspace git check failed', reportPath)
}

// --- PATCH VALIDATION ---
const patchContent = fs.readFileSync(task.patch_file, 'utf-8')

const files = [...patchContent.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m => m[1])

if (files.length !== 1) {
  fail('patch_apply', 'Patch must affect exactly one file', reportPath)
}

if (files[0] !== task.target_repo_file) {
  fail('patch_apply', 'Patch file mismatch with target_repo_file', reportPath)
}

// --- APPLY PATCH ---
try {
  run(`git apply ${task.patch_file}`, workspaceDir)
} catch {
  fail('patch_apply', 'git apply failed', reportPath)
}

// --- VERIFY PATCH RESULT ---
try {
  const status = run('git status --porcelain', workspaceDir)

  const changedFiles = status.split('\n').filter(Boolean).map(l => l.slice(3))

  if (changedFiles.length !== 1) {
    fail('patch_apply', 'Unexpected number of changed files after patch', reportPath)
  }

  if (changedFiles[0] !== task.target_repo_file) {
    fail('patch_apply', 'Changed file mismatch after patch', reportPath)
  }
} catch {
  fail('patch_apply', 'Post-patch validation failed', reportPath)
}

ok(reportPath, { workspace: workspaceDir })
