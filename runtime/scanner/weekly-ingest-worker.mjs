/**
 * Weekly Agent Ingest Worker
 *
 * Step 1 — Discovery: fetch new agent repos from GitHub → github_raw_agents
 * Step 2 — Select batch: top 25 unimported candidates by stars
 * Step 3 — Normalize + insert into agents (with github_full_name set)
 * Step 4 — Telegram notification to ops channel
 * Step 5 — Append summary to /opt/agentcrush/logs/weekly-ingest.log
 *
 * Flags:
 *   --dry-run  Runs steps 1–2 only. Prints what would be inserted.
 *              No DB writes beyond the github_raw_agents upsert in step 1.
 *              No Telegram message sent.
 *
 * Usage:
 *   node /opt/agentcrush/scanner/weekly-ingest-worker.mjs [--dry-run]
 */

import { fetchAgentRepos, normalizeRepo } from './github-client.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN    = process.argv.includes('--dry-run');
const BATCH_LIMIT = 25;
const MIN_STARS   = 10;
const LOG_PATH    = '/opt/agentcrush/logs/weekly-ingest.log';
const TELEGRAM_BASE = 'https://api.telegram.org';

// Load order matters: copydesk first (has Supabase + Telegram),
// then scanner (has GITHUB_TOKEN). Already-set vars are never overwritten.
const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

// ── Env loading ───────────────────────────────────────────────────────────────

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

async function loadEnvFiles(paths) {
  for (const p of paths) {
    try {
      const text = await fs.readFile(p, 'utf8');
      for (const [k, v] of Object.entries(parseEnv(text))) {
        if (!process.env[k]) process.env[k] = v;
      }
    } catch {
      // File absent in some environments — silently skip
    }
  }
}

// ── Skip filter (mirrors github-indexer-worker.mjs, min stars raised to 10) ──

const SKIP_KEYWORDS = [
  'tutorial', 'for-beginners', 'beginners', 'learn-', 'learn', 'hello-agents',
  'awesome-list', 'awesome list', 'collection', 'cheatsheet',
  'cheat sheet', 'course', 'bootcamp', 'learning', 'book', 'reading',
  'notes', 'template', 'boilerplate', 'starter kit', 'sample', 'example',
  'demo', 'playground', 'study', 'exercises', 'interview', 'quiz',
  'dataset', 'benchmark', 'survey', 'paper', 'arxiv',
  'chattts', 'tts', 'text-to-speech',
  'fine-tuning', 'fine_tuning', 'training', 'chinese',
];

const MAX_STARS = 200_000;

function shouldSkip(repo) {
  if (!repo.description || repo.description.length < 10) return true;
  if (repo.stars < MIN_STARS) return true;
  if (repo.stars > MAX_STARS) return true;
  const desc = repo.description.toLowerCase();
  const name = repo.name.toLowerCase();
  for (const kw of SKIP_KEYWORDS) {
    if (desc.includes(kw) || name.includes(kw)) return true;
  }
  return false;
}

// ── Normalization (mirrors normalize-github-agents.mjs) ──────────────────────

function deriveHandle(owner, name) {
  return `${owner}_${name}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
}

function inferArchetype(topics, description) {
  const text = `${topics} ${description}`.toLowerCase();
  if (/\btrading|crypto|defi|token|blockchain\b/.test(text)) return 'Trader';
  if (/\bcode|coding|developer|engineer|devtool\b/.test(text))  return 'Builder';
  if (/\bresearch|analyt|insight|rag|retrieval\b/.test(text))   return 'Researcher';
  if (/\boperat|automat|workflow|orches\b/.test(text))          return 'Operator';
  if (/\bsocial|content|market|growth\b/.test(text))            return 'Creator';
  return 'Operator';
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegram(token, chatId, text) {
  try {
    const res = await fetch(`${TELEGRAM_BASE}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`  Telegram send failed: ${res.status} — ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn('  Telegram send error:', err.message);
  }
}

// ── Log file ──────────────────────────────────────────────────────────────────

async function appendLog(lines) {
  const ts    = new Date().toISOString();
  const entry = lines.map(l => `[${ts}] ${l}`).join('\n') + '\n';
  try {
    await fs.mkdir('/opt/agentcrush/logs', { recursive: true });
    await fs.appendFile(LOG_PATH, entry, 'utf8');
  } catch (err) {
    console.warn('  Log write failed:', err.message);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await loadEnvFiles(ENV_PATHS);

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    TELEGRAM_OPS_BOT_TOKEN,
    TELEGRAM_OPS_CHAT_ID,
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const runLabel = DRY_RUN ? ' [DRY RUN]' : '';
  console.log(`=== AgentCrush Weekly Ingest${runLabel} ===`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // ── Step 1: Discovery ──────────────────────────────────────────────────────

  console.log('── Step 1: Discovery ──');
  const rawRepos   = await fetchAgentRepos();
  const normalized = [];
  let skippedCount = 0;

  for (const repo of rawRepos) {
    const norm = normalizeRepo(repo);
    if (shouldSkip(norm)) { skippedCount++; continue; }
    normalized.push(norm);
  }

  console.log(`Fetched ${rawRepos.length} repos from GitHub`);
  console.log(`After filter (>=${MIN_STARS} stars, no tutorials/datasets): ${normalized.length} kept, ${skippedCount} skipped`);

  if (normalized.length > 0) {
    // Always upsert discovery results — idempotent, safe in dry-run too
    const { error: upsertErr } = await supabase
      .from('github_raw_agents')
      .upsert(normalized, { onConflict: 'repo_url' });
    if (upsertErr) console.error('  github_raw_agents upsert error:', upsertErr.message);
  }

  console.log(`Discovery complete: ${normalized.length} candidates in github_raw_agents\n`);

  // ── Step 2: Select weekly batch ────────────────────────────────────────────

  console.log('── Step 2: Select weekly batch ──');
  // Fetch a wide pool so we can re-apply shouldSkip() against the full table —
  // older rows inserted by github-indexer-worker.mjs used looser filters and
  // didn't go through shouldSkip(), so they need a second pass here.
  const { data: pool, error: batchErr } = await supabase
    .from('github_raw_agents')
    .select('*')
    .eq('imported', false)
    .order('stars', { ascending: false })
    .limit(BATCH_LIMIT * 10);

  if (batchErr) throw new Error(`Failed to fetch batch: ${batchErr.message}`);

  const batch = pool.filter(raw => !shouldSkip({
    description: raw.description,
    stars:       raw.stars,
    name:        raw.name,
  })).slice(0, BATCH_LIMIT);

  console.log(`Pool: ${pool.length} unimported rows — after re-filter: ${batch.length} candidates\n`);

  // ── Dry run exit ───────────────────────────────────────────────────────────

  if (DRY_RUN) {
    console.log('── DRY RUN: agents that would be inserted ──');
    for (const raw of batch) {
      const handle    = deriveHandle(raw.owner || 'unknown', raw.name);
      const archetype = inferArchetype(raw.topics || '', raw.description || '');
      console.log(`  ${raw.display_name || raw.name} (@${handle}) — ${archetype} — ⭐ ${raw.stars}`);
      console.log(`    github_full_name : ${raw.full_name}`);
      console.log(`    github_repo_url  : ${raw.repo_url}`);
      console.log(`    description      : ${(raw.description || '').slice(0, 80)}`);
    }
    console.log(`\nDry run complete. ${batch.length} agents would be processed (inserts skipped for existing handles).`);
    return;
  }

  // ── Step 3: Normalize + insert into agents ─────────────────────────────────

  console.log('── Step 3: Normalize + insert into agents ──');

  // Build a stars lookup for Telegram message (handle → stars)
  const starsByHandle = new Map();
  const toInsert      = [];
  const rawUrlsToMark = [];

  for (const raw of batch) {
    const handle    = deriveHandle(raw.owner || 'unknown', raw.name);
    const archetype = inferArchetype(raw.topics || '', raw.description || '');
    starsByHandle.set(handle, raw.stars);

    toInsert.push({
      handle,
      display_name:     raw.name,
      bio:              raw.description || '',
      tagline:          (raw.description || '').slice(0, 100),
      archetype,
      entity_type:      'agent',
      ecosystem_layer:  'agent',
      identity_status:  'unverified',
      status:           'active',
      visibility_score: 0,
      reputation_score: 0,
      weekly_delta:     0,
      github_url:       raw.repo_url,
      github_repo_url:  raw.repo_url,
      github_full_name: raw.full_name,   // ← THE FIX: enables snapshot worker to track this agent
      website_url:      raw.homepage_url || null,
      x_handle:         null,
    });
    rawUrlsToMark.push(raw.repo_url);
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('agents')
    .upsert(toInsert, { onConflict: 'handle', ignoreDuplicates: true })
    .select('handle, display_name, archetype');

  if (insertErr) {
    console.error('  agents upsert error:', insertErr.message);
  }

  const insertedCount  = inserted?.length ?? 0;
  const skippedHandles = toInsert.length - insertedCount;
  console.log(`Inserted ${insertedCount} new agents (${skippedHandles} handles already existed — skipped)`);

  // Mark all candidates imported whether or not the agent row was new.
  // Prevents the same repo surfacing in next week's batch.
  if (rawUrlsToMark.length > 0) {
    const { error: markErr } = await supabase
      .from('github_raw_agents')
      .update({ imported: true })
      .in('repo_url', rawUrlsToMark);
    if (markErr) console.error('  Mark imported error:', markErr.message);
    else console.log(`Marked ${rawUrlsToMark.length} rows imported in github_raw_agents`);
  }

  // ── Step 4: Telegram notification ─────────────────────────────────────────

  console.log('\n── Step 4: Telegram notification ──');
  if (TELEGRAM_OPS_BOT_TOKEN && TELEGRAM_OPS_CHAT_ID) {
    const agentLines = (inserted || [])
      .map(a => `• ${a.display_name} (@${a.handle}) — ${a.archetype} — ⭐ ${starsByHandle.get(a.handle) ?? '?'}`)
      .join('\n');

    const message = [
      `✅ <b>Weekly ingest complete</b>: ${insertedCount} new agents added`,
      insertedCount > 0 ? '' : null,
      insertedCount > 0 ? agentLines : '(no new agents this run)',
    ].filter(l => l !== null).join('\n');

    await sendTelegram(TELEGRAM_OPS_BOT_TOKEN, TELEGRAM_OPS_CHAT_ID, message);
    console.log('  Telegram notification sent');
  } else {
    console.warn('  TELEGRAM_OPS_BOT_TOKEN / TELEGRAM_OPS_CHAT_ID not set — skipping');
  }

  // ── Step 5: Log ────────────────────────────────────────────────────────────

  const logLines = [
    `weekly-ingest: ${insertedCount} inserted, ${skippedHandles} handle-conflicts, ${batch.length} total batch`,
    ...(inserted || []).map(a =>
      `  + ${a.display_name} (@${a.handle}) — ${a.archetype} — ⭐ ${starsByHandle.get(a.handle) ?? '?'}`
    ),
  ];
  await appendLog(logLines);
  console.log(`  Appended to ${LOG_PATH}`);

  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
