#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function fail(stage, reason, reportPath) {
  const report = {
    status: "failed",
    failed_stage: stage,
    reason
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  process.exit(1)
}

function ok(reportPath) {
  const report = {
    status: "preflight_passed"
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  process.exit(0)
}

const taskFile = process.argv[2]
if (!taskFile) {
  console.error("Missing task file")
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync(path.resolve('ops/executor/config.v1.json'), 'utf-8'))
const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'))

const reportDir = path.resolve('ops/executor/runs')
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })

const reportPath = path.join(reportDir, `${task.task_id}.json`)

// --- PRECHECK TASK FORMAT ---
if (!task.target_repo_file) fail("preflight", "Missing target_repo_file", reportPath)
if (Array.isArray(task.target_repo_file)) fail("preflight", "Multiple repo files not allowed", reportPath)

if (task.release_lane !== config.allowed_release_lane) {
  fail("preflight", "Invalid release lane", reportPath)
}

// --- REPO PATH ---
if (!fs.existsSync(config.repo_source_path)) {
  fail("preflight", "Repo path missing", reportPath)
}

// --- GIT CHECK ---
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: config.repo_source_path }).toString().trim()
  if (branch !== config.allowed_branch) {
    fail("preflight", `Wrong branch: ${branch}`, reportPath)
  }

  const status = execSync('git status --porcelain', { cwd: config.repo_source_path }).toString().trim()
  if (status.length > 0) {
    fail("preflight", "Repo not clean", reportPath)
  }
} catch (e) {
  fail("preflight", "Git check failed", reportPath)
}

// --- RUNTIME PATH ---
if (!fs.existsSync(config.runtime_target_file)) {
  fail("preflight", "Runtime target missing", reportPath)
}

// --- DEPLOY SCRIPT ---
if (!fs.existsSync(config.deploy_script_path)) {
  fail("preflight", "Deploy script missing", reportPath)
}

// --- PROPAGATION COMMAND CHECK ---
if (!config.deploy_propagation_command.includes(task.target_repo_file)) {
  fail("preflight", "Propagation path mismatch", reportPath)
}

// --- WORKSPACE ---
if (!fs.existsSync(config.executor_workspace_root)) {
  fs.mkdirSync(config.executor_workspace_root, { recursive: true })
}

ok(reportPath)
