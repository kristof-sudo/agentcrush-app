#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'

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
    status: 'stepE_success',
    ...extra,
  })
  process.exit(0)
}

function run(cmd, cwd = null) {
  return execSync(cmd, { cwd: cwd || process.cwd(), stdio: 'pipe' }).toString().trim()
}

function fileHash(p) {
  const data = fs.readFileSync(p)
  return crypto.createHash('sha256').update(data).digest('hex')
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

// --- FILE SYNC CHECK ---
const repoFilePath = path.join(config.repo_source_path, task.target_repo_file)
const runtimeFilePath = task.target_runtime_file

if (!fs.existsSync(repoFilePath)) {
  fail('file_sync', 'Repo file missing', reportPath, { repoFilePath })
}

if (!fs.existsSync(runtimeFilePath)) {
  fail('file_sync', 'Runtime file missing', reportPath, { runtimeFilePath })
}

let repoHash, runtimeHash
try {
  repoHash = fileHash(repoFilePath)
  runtimeHash = fileHash(runtimeFilePath)
} catch (e) {
  fail('file_sync', 'Hash computation failed', reportPath, { error: String(e) })
}

if (repoHash !== runtimeHash) {
  fail('file_sync', 'Repo/runtime mismatch', reportPath, {
    repoHash,
    runtimeHash,
  })
}

// --- SERVICE CHECK ---
let serviceStatus
try {
  serviceStatus = run(`systemctl is-active ${task.expected_service}`)
} catch (e) {
  fail('service', 'Service check failed', reportPath, {
    error: String(e),
  })
}

if (serviceStatus !== 'active') {
  fail('service', 'Service not active', reportPath, { serviceStatus })
}

// --- LOG EVIDENCE ---
let logs
try {
  const lines = task.journal_lines || 100
  logs = run(`journalctl -u ${task.expected_service} -n ${lines} --no-pager`)
} catch (e) {
  fail('evidence', 'Failed to read logs', reportPath, {
    error: String(e),
  })
}

const evidenceFound = logs.includes(task.expected_log_evidence)

if (!evidenceFound) {
  fail('evidence', 'Expected log evidence not found', reportPath, {
    expected: task.expected_log_evidence,
  })
}

ok(reportPath, {
  file_sync: true,
  service_status: serviceStatus,
  evidence_found: true,
  repo_hash: repoHash,
  runtime_hash: runtimeHash,
})
