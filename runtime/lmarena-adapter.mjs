/**
 * LMArena adapter v0
 *
 * Read-only fetcher. Pulls the canonical LMArena (Chatbot Arena)
 * Bradley-Terry leaderboard from the public HuggingFace dataset
 * `lmarena-ai/leaderboard-dataset` (config=text, split=latest),
 * normalizes each row, and upserts into the `lmarena_models` table.
 *
 * Step (c.1) of the Category Index Pivot. Highest-leverage signal for the
 * `model_family` agent category — feeds the `lmarena_score` column in
 * `agent_score_model_family_v1`. Promotion / linkage to the `agents` table
 * is a SEPARATE downstream migration (see runtime/README.md).
 *
 * Usage:
 *   node runtime/lmarena-adapter.mjs --dry-run               # fetch + summary
 *   node runtime/lmarena-adapter.mjs --write                 # upsert into Supabase
 *   node runtime/lmarena-adapter.mjs --dry-run --max 100     # cap items
 *
 * Idempotent. PK is normalized `model_name`. Re-runs bump `last_seen_at`
 * and overwrite normalized columns. `first_seen_at` preserved across runs.
 *
 * Soft-remove: rows present in DB but absent from this fetch get `removed_at`
 * set; reappearance clears it.
 *
 * Source:
 *   https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=text&split=latest
 *   - latest split = current published leaderboard
 *   - multiple rows per model (one per category: overall, hard, coding,
 *     vision, style_control, etc.)
 *   - we collapse on model_name; canonical arena_score/rank/votes come from
 *     the "overall" category row, others stored in category_ranks JSONB.
 *
 * Auth: anonymous (HF datasets-server is open). No token required.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
 *   Same .env loading conventions as runtime/hf-models-adapter.mjs.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');
const maxIdx = args.indexOf('--max');
const MAX_ITEMS = maxIdx !== -1 ? (parseInt(args[maxIdx + 1], 10) || Infinity) : Infinity;

const DATASET = 'lmarena-ai/leaderboard-dataset';
const CONFIG = 'text';
const SPLIT = 'latest';
const PAGE_SIZE = 100; // HF datasets-server max length per call
const PAGE_DELAY_MS = 1100; // HF datasets-server rate-limits aggressively; ~1 req/sec is safe

const ENDPOINT_ROWS = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}`;
const ENDPOINT_INFO = `https://datasets-server.huggingface.co/info?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}`;

if (!isDryRun && !isWrite) {
  console.error('[lmarena-adapter] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[lmarena-adapter] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[lmarena-adapter] Mode: ${MODE}`);
console.log(`[lmarena-adapter] Source: HF dataset ${DATASET} (config=${CONFIG}, split=${SPLIT})`);
if (MAX_ITEMS !== Infinity) console.log(`[lmarena-adapter] Cap: ${MAX_ITEMS} rows`);

// ── Env loading ───────────────────────────────────────────────────────────────

const ENV_CANDIDATES = [
  '/opt/agentcrush/scanner/.env',
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

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

async function loadEnvFiles() {
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
    console.log(`[lmarena-adapter] Loaded env from ${envPath}`);
  }
}

await loadEnvFiles();

let supabase = null;
if (isWrite) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[lmarena-adapter] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
  return out;
}

function hashPayload(obj) {
  const canonical = JSON.stringify(canonicalize(obj));
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalize a model name for joining/dedup.
 * - lowercase
 * - trim
 * - strip trailing date stamps like "-2024-08-06", "_20240806", "-20240806"
 *   (common in OpenAI/Anthropic family-versioning that LMArena publishes)
 * - collapse repeated separators
 */
function normalizeModelName(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().toLowerCase();
  // Strip trailing date suffixes: -YYYY-MM-DD, _YYYY-MM-DD, -YYYYMMDD, _YYYYMMDD
  s = s.replace(/[-_](20\d{2})[-_]?(\d{2})[-_]?(\d{2})$/u, '');
  // Strip a stray trailing date even if not at end (e.g. "-20240806-thinking" -> "-thinking")
  s = s.replace(/[-_](20\d{2})(\d{2})(\d{2})(?=[-_])/u, '');
  // Collapse repeated separators
  s = s.replace(/[-_]{2,}/g, '-');
  // Trim leading/trailing separators
  s = s.replace(/^[-_]+|[-_]+$/g, '');
  return s || null;
}

async function fetchInfo() {
  const res = await fetch(ENDPOINT_INFO, { headers: { Accept: 'application/json', 'User-Agent': 'agentcrush-lmarena-adapter' } });
  if (!res.ok) throw new Error(`[lmarena-adapter] info HTTP ${res.status}`);
  const data = await res.json();
  const total = data?.dataset_info?.splits?.[SPLIT]?.num_examples ?? null;
  return { totalRows: total };
}

async function fetchPage(offset, length, attempt = 1) {
  const url = `${ENDPOINT_ROWS}&offset=${offset}&length=${length}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'agentcrush-lmarena-adapter' } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 5) throw new Error(`[lmarena-adapter] HTTP ${res.status} after ${attempt} attempts on ${url}`);
    const backoff = Math.min(60000, 2000 * Math.pow(2, attempt - 1));
    console.warn(`[lmarena-adapter] HTTP ${res.status}, backing off ${backoff}ms (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, backoff));
    return fetchPage(offset, length, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`[lmarena-adapter] HTTP ${res.status} from ${url}`);
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.rows)) {
    throw new Error(`[lmarena-adapter] Unexpected response shape — missing rows[]`);
  }
  return data.rows.map((r) => r.row);
}

async function fetchAllRows(totalRows) {
  const all = [];
  let offset = 0;
  while (true) {
    const remaining = MAX_ITEMS === Infinity ? PAGE_SIZE : Math.min(PAGE_SIZE, MAX_ITEMS - all.length);
    if (remaining <= 0) break;
    const rows = await fetchPage(offset, remaining);
    if (rows.length === 0) break;
    for (const r of rows) {
      all.push(r);
      if (all.length >= MAX_ITEMS) break;
    }
    offset += rows.length;
    if (all.length % 1000 === 0 || (totalRows && all.length >= totalRows)) {
      console.log(`[lmarena-adapter] Progress: ${all.length}${totalRows ? `/${totalRows}` : ''} rows`);
    }
    if (rows.length < remaining) break; // last page
    if (all.length >= MAX_ITEMS) break;
    if (totalRows && all.length >= totalRows) break;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  return all;
}

/**
 * Collapse rows-per-(model, category) into one row per normalized model_name.
 *  - overall row → canonical arena_score / arena_rank / votes / display_name / org / license / publish_date
 *  - other category rows → category_ranks { <category>: { rating, rank, votes } }
 */
function collapseByModel(rows) {
  const byKey = new Map();
  for (const row of rows) {
    if (!row || typeof row.model_name !== 'string') continue;
    const key = normalizeModelName(row.model_name);
    if (!key) continue;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        model_name: key,
        display_name: row.model_name,
        organization: row.organization ?? null,
        license: row.license ?? null,
        leaderboard_publish_date: row.leaderboard_publish_date ?? null,
        arena_score: null,
        arena_rank: null,
        votes: null,
        category_ranks: {},
        raw_payloads: {}, // per-category raw rows
      };
      byKey.set(key, entry);
    }
    const cat = (row.category || 'overall').toString();
    entry.raw_payloads[cat] = row;
    const rating = toNumOrNull(row.rating);
    const rank = toIntOrNull(row.rank);
    const votes = toIntOrNull(row.vote_count);

    if (cat === 'overall') {
      entry.arena_score = rating;
      entry.arena_rank = rank;
      entry.votes = votes;
      // Prefer overall row metadata
      if (row.organization) entry.organization = row.organization;
      if (row.license) entry.license = row.license;
      if (row.leaderboard_publish_date) entry.leaderboard_publish_date = row.leaderboard_publish_date;
      // display_name from overall is the most canonical
      entry.display_name = row.model_name;
    } else {
      entry.category_ranks[cat] = {
        rating,
        rank,
        votes,
      };
    }
  }
  return Array.from(byKey.values());
}

function buildRecord(entry) {
  const payload = {
    model_name: entry.model_name,
    display_name: entry.display_name,
    organization: entry.organization,
    license: entry.license,
    arena_score: entry.arena_score,
    arena_rank: entry.arena_rank,
    votes: entry.votes,
    category_ranks: entry.category_ranks,
    leaderboard_publish_date: entry.leaderboard_publish_date,
    source_rows: entry.raw_payloads,
  };
  return {
    model_name: entry.model_name,
    display_name: entry.display_name,
    organization: entry.organization,
    arena_score: entry.arena_score,
    arena_rank: entry.arena_rank,
    votes: entry.votes,
    license: entry.license,
    model_url: null, // dataset doesn't currently expose URL; reserved for future enrichment
    category_ranks: entry.category_ranks,
    leaderboard_publish_date: entry.leaderboard_publish_date,
    raw_payload: payload,
    payload_hash: hashPayload(payload),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[lmarena-adapter] Fetching dataset info…`);
  const { totalRows } = await fetchInfo();
  console.log(`[lmarena-adapter] Latest split has ${totalRows ?? 'unknown'} rows total (across all categories)`);

  const t0 = Date.now();
  const rows = await fetchAllRows(totalRows);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[lmarena-adapter] Fetched ${rows.length} rows in ${elapsed}s`);

  const entries = collapseByModel(rows);
  console.log(`[lmarena-adapter] Collapsed to ${entries.length} unique models`);

  const records = entries.map(buildRecord);
  // Sort by arena_score for the summary
  const top3 = records
    .filter((r) => r.arena_score !== null)
    .sort((a, b) => (b.arena_score || 0) - (a.arena_score || 0))
    .slice(0, 3)
    .map((r) => ({
      model_name: r.model_name,
      display_name: r.display_name,
      organization: r.organization,
      arena_score: r.arena_score,
      arena_rank: r.arena_rank,
      votes: r.votes,
    }));

  const overallCount = records.filter((r) => r.arena_score !== null).length;
  console.log(`[lmarena-adapter] Models with overall arena_score: ${overallCount}`);
  console.log(`[lmarena-adapter] Top 3 by arena_score:`);
  console.log(JSON.stringify(top3, null, 2));

  if (isDryRun) {
    console.log(`[lmarena-adapter] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE path
  // 1. Load existing for diff + soft-remove
  const existing = new Map();
  {
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('lmarena_models')
        .select('model_name,payload_hash,removed_at')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`[lmarena-adapter] Supabase select failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data) existing.set(row.model_name, row);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const now = new Date().toISOString();
  let newCount = 0, changedCount = 0, unchangedCount = 0, revivedCount = 0;
  const upserts = [];
  for (const r of records) {
    const prev = existing.get(r.model_name);
    if (!prev) newCount += 1;
    else if (prev.payload_hash !== r.payload_hash) changedCount += 1;
    else unchangedCount += 1;
    if (prev?.removed_at) revivedCount += 1;
    upserts.push({
      model_name: r.model_name,
      display_name: r.display_name,
      organization: r.organization,
      arena_score: r.arena_score,
      arena_rank: r.arena_rank,
      votes: r.votes,
      license: r.license,
      model_url: r.model_url,
      category_ranks: r.category_ranks,
      leaderboard_publish_date: r.leaderboard_publish_date,
      raw_payload: r.raw_payload,
      payload_hash: r.payload_hash,
      last_seen_at: now,
      removed_at: null,
    });
  }

  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('lmarena_models')
      .upsert(batch, { onConflict: 'model_name' });
    if (error) throw new Error(`[lmarena-adapter] Upsert batch ${i} failed: ${error.message}`);
  }

  const seen = new Set(records.map((r) => r.model_name));
  const toRemove = [];
  for (const [id, row] of existing.entries()) {
    if (!seen.has(id) && !row.removed_at) toRemove.push(id);
  }
  if (toRemove.length > 0) {
    for (let i = 0; i < toRemove.length; i += batchSize) {
      const batch = toRemove.slice(i, i + batchSize);
      const { error } = await supabase
        .from('lmarena_models')
        .update({ removed_at: now })
        .in('model_name', batch);
      if (error) throw new Error(`[lmarena-adapter] Soft-remove batch failed: ${error.message}`);
    }
  }

  console.log(`[lmarena-adapter] Summary:`);
  console.log(`  fetched rows:        ${rows.length}`);
  console.log(`  unique models:       ${records.length}`);
  console.log(`  with arena_score:    ${overallCount}`);
  console.log(`  new:                 ${newCount}`);
  console.log(`  changed:             ${changedCount}`);
  console.log(`  unchanged:           ${unchangedCount}`);
  console.log(`  revived:             ${revivedCount}`);
  console.log(`  soft-removed:        ${toRemove.length}`);
}

main().catch((err) => {
  console.error('[lmarena-adapter] FATAL:', err.message);
  process.exit(1);
});
