/**
 * Ajsa Pipeline Runner
 *
 * Orchestrates ingest → select → brief workers in sequence.
 * Stops on first failure. Never duplicates worker logic.
 *
 * Usage:
 *   node ajsa-run-pipeline.mjs                      -- dry-run (default)
 *   node ajsa-run-pipeline.mjs --dry-run            -- dry-run (explicit)
 *   node ajsa-run-pipeline.mjs --write              -- write ingest+select, dry-run brief
 *   node ajsa-run-pipeline.mjs --send               -- write ingest+select, send brief
 *   node ajsa-run-pipeline.mjs --dry-run --limit 5
 *   node ajsa-run-pipeline.mjs --write   --limit 5
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ── Args ───────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const hasDryRun = args.includes('--dry-run');
const hasWrite  = args.includes('--write');
const hasSend   = args.includes('--send');
const limitIdx  = args.indexOf('--limit');
const limitArg  = limitIdx !== -1 ? args[limitIdx + 1] : null;

// Reject unsafe combinations
if (hasDryRun && (hasWrite || hasSend)) {
  console.error('[ajsa-pipeline] ERROR: --dry-run cannot be combined with --write or --send.');
  process.exit(1);
}
if (hasWrite && hasSend) {
  console.error('[ajsa-pipeline] ERROR: --write and --send cannot be combined. Run one mode at a time.');
  process.exit(1);
}
if (limitArg !== null && !/^\d+$/.test(limitArg)) {
  console.error(`[ajsa-pipeline] ERROR: --limit requires a positive integer, got "${limitArg}".`);
  process.exit(1);
}

// Default to dry-run when no mode flag is given
const MODE = hasSend ? 'send' : hasWrite ? 'write' : 'dry-run';

// ── Worker paths ───────────────────────────────────────────────────────────

const DIR = path.dirname(fileURLToPath(import.meta.url));

const WORKERS = {
  ingest: path.join(DIR, 'ajsa-ingest-worker.mjs'),
  select: path.join(DIR, 'ajsa-select-brief-worker.mjs'),
  brief:  path.join(DIR, 'ajsa-daily-brief-worker.mjs'),
};

// ── Spawn helper ───────────────────────────────────────────────────────────

function runWorker(workerPath, workerArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath, ...workerArgs], {
      stdio: 'inherit',
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// ── Stage definitions ──────────────────────────────────────────────────────

function buildStages(mode, limit) {
  const limitArgs = limit ? ['--limit', limit] : [];

  return [
    {
      label:  '[1/3] Ingest',
      worker: WORKERS.ingest,
      workerArgs: mode === 'dry-run'
        ? ['--dry-run', ...limitArgs]
        : ['--write',   ...limitArgs],
    },
    {
      label:  '[2/3] Select',
      worker: WORKERS.select,
      workerArgs: mode === 'dry-run'
        ? ['--dry-run', ...limitArgs]
        : ['--write',   ...limitArgs],
    },
    {
      label:  '[3/3] Brief',
      worker: WORKERS.brief,
      workerArgs: mode === 'send'
        ? ['--send']
        : ['--dry-run'],
    },
  ];
}

// ── Run ────────────────────────────────────────────────────────────────────

const stages = buildStages(MODE, limitArg);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Ajsa Pipeline — ${MODE.toUpperCase()}`);
if (limitArg) console.log(`  Limit: ${limitArg}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const { label, worker, workerArgs } of stages) {
  console.log('');
  console.log(`${label}  (${path.basename(worker)} ${workerArgs.join(' ')})`);
  console.log('─────────────────────────────────────────────────────────');

  try {
    await runWorker(worker, workerArgs);
    console.log(`${label} — OK`);
  } catch (err) {
    console.error(`${label} — FAILED: ${err.message}`);
    console.error('[ajsa-pipeline] Pipeline stopped. Fix the error above and retry.');
    process.exit(1);
  }
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Ajsa Pipeline complete — ${MODE.toUpperCase()}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
