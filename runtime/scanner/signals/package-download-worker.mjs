/**
 * Package download signal worker.
 *
 * Reads high_auto mappings from agent_package_mapping_signals, fetches
 * weekly download counts from npm and PyPI, and writes results to
 * agent_package_download_signals.
 *
 * Modes:
 *   --dry-run   Fetch downloads, print report, no writes. (default)
 *   --write     Upsert rows into agent_package_download_signals.
 *   --limit N   Max mappings to process (default 50, max 200).
 *   --window W  Download window: only 'weekly' supported (default).
 *
 * Trust policy:
 *   Only mapping_status='high_auto' AND confidence>=95 are processed.
 *   good_warn, manual_review, rejected, hard_reject are never fetched.
 *
 * Never modifies: agents, rankings, ecosystem_signals, agent_daily_snapshots,
 *   github_repo_snapshots, agent_package_mapping_signals, or any RPC.
 * Writes only to: agent_package_download_signals.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

const DEFAULT_LIMIT  = 50;
const MAX_LIMIT      = 200;
const USER_AGENT     = 'AgentCrush-Download-Worker/1.0 (agentcrush.com)';
const NPM_DELAY_MS       = 500;
const PYPI_DELAY_MS      = 6_000;
const PYPI_RETRY_WAIT_MS = 75_000;   // used when Retry-After header is absent

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: true, write: false, limit: DEFAULT_LIMIT, window: 'weekly' };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') { args.dryRun = true;  args.write = false; continue; }
    if (arg === '--write')   { args.write  = true;  args.dryRun = false; continue; }

    if (arg === '--limit') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --limit');
      args.limit = parseLimit(raw);
      i++;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      args.limit = parseLimit(arg.slice('--limit='.length));
      continue;
    }

    if (arg === '--window') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --window');
      args.window = parseWindow(raw);
      i++;
      continue;
    }
    if (arg.startsWith('--window=')) {
      args.window = parseWindow(arg.slice('--window='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.dryRun && args.write) {
    throw new Error('Cannot use --dry-run and --write together. Pick one.');
  }

  return args;
}

function parseLimit(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a positive integer');
  return Math.min(n, MAX_LIMIT);
}

function parseWindow(raw) {
  if (raw === 'weekly') return 'weekly';
  throw new Error(`Unsupported --window value: "${raw}". Only "weekly" is supported.`);
}

// ─── Env loading ──────────────────────────────────────────────────────────────

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadEnvFiles(paths) {
  for (const path of paths) {
    try {
      const text = await fs.readFile(path, 'utf8');
      for (const [key, value] of Object.entries(parseEnv(text))) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional — files vary by deployment.
    }
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function fetchTrustedMappings(supabase, limit) {
  const { data, error } = await supabase
    .from('agent_package_mapping_signals')
    .select(
      'agent_id, registry, package_name, mapping_status, confidence, snapshot_date, github_full_name'
    )
    .eq('mapping_status', 'high_auto')
    .gte('confidence', 95)
    .order('snapshot_date', { ascending: false });

  if (error) throw error;

  // Deduplicate to latest snapshot per agent_id + registry + package_name.
  const seen = new Map();
  for (const row of (data || [])) {
    const key = `${row.agent_id}|${row.registry}|${row.package_name}`;
    if (!seen.has(key)) seen.set(key, row);
  }

  return [...seen.values()].slice(0, limit);
}

async function upsertDownloadSignals(supabase, rows) {
  const { error, count } = await supabase
    .from('agent_package_download_signals')
    .upsert(rows, {
      onConflict: 'agent_id,registry,package_name,download_window,period_start,period_end',
      count: 'exact',
    });
  if (error) throw error;
  return count ?? rows.length;
}

// ─── Download fetching ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchNpmDownloads(packageName) {
  const encoded = encodeURIComponent(packageName);
  const url = `https://api.npmjs.org/downloads/point/last-week/${encoded}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: `npm API ${res.status} for ${packageName}`,
      sourceUrl: url,
    };
  }

  const json = await res.json();
  // Shape: { downloads, start, end, package }
  if (typeof json.downloads !== 'number') {
    return {
      ok: false,
      error: `npm API unexpected response shape: ${JSON.stringify(Object.keys(json))}`,
      sourceUrl: url,
      raw: json,
    };
  }

  return {
    ok: true,
    downloads: json.downloads,
    periodStart: json.start,
    periodEnd: json.end,
    sourceUrl: url,
    raw: json,
  };
}

async function fetchPypiDownloads(packageName) {
  const encoded = encodeURIComponent(packageName);
  const url = `https://pypistats.org/api/packages/${encoded}/recent`;

  const doFetch = async () => fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  let res = await doFetch();

  if (res.status === 429) {
    // Honour Retry-After if present; fall back to PYPI_RETRY_WAIT_MS.
    const retryAfterSec = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
    const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
      ? Math.min(retryAfterSec * 1000, 120_000)
      : PYPI_RETRY_WAIT_MS;
    process.stdout.write(`[429→wait ${Math.round(waitMs / 1000)}s] `);
    await sleep(waitMs);
    res = await doFetch();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      ok: false,
      error: `pypistats ${res.status} for ${packageName}: ${body.slice(0, 120)}`,
      sourceUrl: url,
    };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `pypistats non-JSON response for ${packageName}`, sourceUrl: url };
  }

  // Shape: { data: { last_day, last_week, last_month }, package, type }
  if (!json.data || typeof json.data.last_week !== 'number') {
    return {
      ok: false,
      error: `pypistats unexpected shape; keys=${JSON.stringify(Object.keys(json))} data_keys=${JSON.stringify(Object.keys(json.data ?? {}))}`,
      sourceUrl: url,
      raw: json,
    };
  }

  // PyPI doesn't return exact dates — compute from today.
  const today = new Date();
  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const periodEnd   = today.toISOString().slice(0, 10);
  const periodStart = sixDaysAgo.toISOString().slice(0, 10);

  return {
    ok: true,
    downloads: json.data.last_week,
    periodStart,
    periodEnd,
    sourceUrl: url,
    raw: json,
  };
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildDownloadRow(mapping, result, window, now) {
  const snapshotDate = now.slice(0, 10);
  return {
    agent_id:          mapping.agent_id,
    registry:          mapping.registry,
    package_name:      mapping.package_name,
    download_window:   window,
    period_start:      result.periodStart ?? null,
    period_end:        result.periodEnd   ?? null,
    downloads:         result.downloads   ?? null,
    source_url:        result.sourceUrl   ?? null,
    mapping_confidence: mapping.confidence,
    mapping_status:    mapping.mapping_status,
    raw:               result.raw ?? {},
    observed_at:       now,
    snapshot_date:     snapshotDate,
    updated_at:        now,
  };
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function printReport(mappings, results, args, mode) {
  const successes = results.filter(r => r.result.ok);
  const failures  = results.filter(r => !r.result.ok);
  const npmRows   = successes.filter(r => r.mapping.registry === 'npm');
  const pypiRows  = successes.filter(r => r.mapping.registry === 'pypi');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Package Download Worker — ${mode.toUpperCase()} — window=${args.window}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  mappings_checked        ${mappings.length}`);
  console.log(`  downloads_found         ${successes.length}`);
  console.log(`  npm                     ${npmRows.length}`);
  console.log(`  pypi                    ${pypiRows.length}`);
  console.log(`  failures                ${failures.length}`);
  console.log('');

  // Top 20 by downloads.
  const top = successes
    .sort((a, b) => b.result.downloads - a.result.downloads)
    .slice(0, 20);

  console.log('  Top 20 packages by weekly downloads:');
  console.log('  ─────────────────────────────────────────────────────────────');
  for (const { mapping, result } of top) {
    const tag = `[${mapping.registry}]`.padEnd(7);
    const pkg = mapping.package_name.padEnd(28);
    const dl  = result.downloads.toLocaleString().padStart(12);
    console.log(`  ${tag} ${pkg} ${dl}  (${result.periodStart} → ${result.periodEnd})`);
  }

  if (failures.length > 0) {
    console.log('');
    console.log('  Failures:');
    for (const { mapping, result } of failures) {
      console.log(`  [${mapping.registry}] ${mapping.package_name}: ${result.error}`);
    }
  }

  console.log('');
}

function printWriteSummary(upsertCount, results) {
  const successes = results.filter(r => r.result.ok);
  console.log('  ─────────────────────────────────────────────────────────────');
  console.log(`  rows_inserted_or_updated  ${upsertCount}`);
  console.log(`  rows_with_downloads       ${successes.length}`);
  console.log('  Write complete.');
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Usage: package-download-worker.mjs [--dry-run|--write] [--limit N] [--window weekly]');
    process.exit(1);
  }

  await loadEnvFiles(ENV_PATHS);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Loading trusted mappings (high_auto, confidence>=95, limit=${args.limit})…`);
  const mappings = await fetchTrustedMappings(supabase, args.limit);
  console.log(`Found ${mappings.length} mappings to process.`);

  if (mappings.length === 0) {
    console.log('Nothing to fetch. Exiting.');
    return;
  }

  const results = [];
  const npmMappings  = mappings.filter(m => m.registry === 'npm');
  const pypiMappings = mappings.filter(m => m.registry === 'pypi');

  // Fetch npm downloads.
  if (npmMappings.length > 0) {
    console.log(`\nFetching npm downloads (${npmMappings.length} packages)…`);
    for (const mapping of npmMappings) {
      process.stdout.write(`  npm/${mapping.package_name}… `);
      const result = await fetchNpmDownloads(mapping.package_name);
      if (result.ok) {
        process.stdout.write(`${result.downloads.toLocaleString()} dl/week\n`);
      } else {
        process.stdout.write(`FAIL: ${result.error}\n`);
      }
      results.push({ mapping, result });
      await sleep(NPM_DELAY_MS);
    }
  }

  // Fetch PyPI downloads.
  if (pypiMappings.length > 0) {
    console.log(`\nFetching PyPI downloads (${pypiMappings.length} packages, inter-request delay=${PYPI_DELAY_MS / 1000}s, retry-wait=${PYPI_RETRY_WAIT_MS / 1000}s)…`);
    for (const mapping of pypiMappings) {
      process.stdout.write(`  pypi/${mapping.package_name}… `);
      const result = await fetchPypiDownloads(mapping.package_name);
      if (result.ok) {
        process.stdout.write(`${result.downloads.toLocaleString()} dl/week\n`);
      } else {
        process.stdout.write(`FAIL: ${result.error}\n`);
      }
      results.push({ mapping, result });
      await sleep(PYPI_DELAY_MS);
    }
  }

  const mode = args.write ? 'write' : 'dry-run';
  printReport(mappings, results, args, mode);

  if (args.write) {
    const now  = new Date().toISOString();
    const rows = results
      .filter(r => r.result.ok)
      .map(({ mapping, result }) => buildDownloadRow(mapping, result, args.window, now));

    if (rows.length === 0) {
      console.log('  No successful fetches to write. Exiting.');
      return;
    }

    console.log(`  Upserting ${rows.length} rows into agent_package_download_signals…`);
    const count = await upsertDownloadSignals(supabase, rows);
    printWriteSummary(count, results);
  } else {
    console.log('  Dry-run complete. No writes made.');
    console.log('  Re-run with --write to persist results.');
    console.log('');
  }
}

main().catch(err => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
