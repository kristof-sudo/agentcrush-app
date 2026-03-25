#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {
    return null
  }
}

function writeJSON(p, data) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
}

function writeMD(p, content) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, content)
}

const taskFile = process.argv[2]
if (!taskFile) {
  console.error('Missing task file')
  process.exit(1)
}

const task = JSON.parse(fs.readFileSync(taskFile, 'utf-8'))

const runsDir = task.runs_dir
if (!runsDir || !fs.existsSync(runsDir)) {
  console.error('Runs dir missing')
  process.exit(1)
}

const files = fs.readdirSync(runsDir)
  .filter(f => f.endsWith('.json'))
  .map(f => path.join(runsDir, f))

const runs = files
  .map(f => ({ file: f, data: readJSONSafe(f) }))
  .filter(r => r.data)
  .sort((a, b) => {
    const at = fs.statSync(a.file).mtimeMs
    const bt = fs.statSync(b.file).mtimeMs
    return bt - at
  })

const limited = runs.slice(0, task.limit || 20)

const summary = limited.map(r => {
  const d = r.data
  return {
    file: path.basename(r.file),
    status: d.status,
    failed_stage: d.failed_stage || null,
    commit_sha: d.commit_sha || d.release_sha || null,
    timestamp: fs.statSync(r.file).mtime,
  }
})

writeJSON(task.output_json, summary)

let md = '# Executor Summary\n\n'

for (const item of summary) {
  md += `## ${item.file}\n`
  md += `- status: ${item.status}\n`
  if (item.failed_stage) md += `- failed_stage: ${item.failed_stage}\n`
  if (item.commit_sha) md += `- commit: ${item.commit_sha}\n`
  md += `- time: ${item.timestamp}\n\n`
}

writeMD(task.output_md, md)

console.log('Step F summary generated')
