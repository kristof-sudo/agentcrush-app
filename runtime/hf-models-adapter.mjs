/**
 * HuggingFace models adapter v0
 *
 * Read-only fetcher. Pulls the public HuggingFace model index
 * (https://huggingface.co/api/models?full=true&sort=downloads&direction=-1),
 * normalizes each item, and upserts into the `hf_models` table.
 *
 * Step (b) of the Category Index Pivot. Source signal for the `model_family`
 * agent category. Promotion of HF models into the `agents` table is a SEPARATE
 * gated step — this worker only mirrors.
 *
 * Usage:
 *   node runtime/hf-models-adapter.mjs --dry-run                 # fetch + summary, no DB writes
 *   node runtime/hf-models-adapter.mjs --write                   # upsert into Supabase
 *   node runtime/hf-models-adapter.mjs --dry-run --max 500       # cap total items
 *   node runtime/hf-models-adapter.mjs --dry-run --limit-pages 3 # cap pages fetched
 *
 * Idempotent. PK is `model_id` ("owner/name"). Re-runs bump `last_seen_at`
 * and overwrite normalized columns. `first_seen_at` preserved across runs.
 *
 * Soft-remove: rows present in DB but absent from this fetch get `removed_at`
 * set; reappearance clears it.
 *
 * Auth: optional HF_TOKEN env var (HuggingFace API token; anonymous limit is
 * ~30 req/hour, authenticated is 5000/hour). At 1 req/sec we need 100 pages
 * for 10k models — comfortably under the authenticated limit, but anonymous
 * will rate-limit. Highly recommend HF_TOKEN in production.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
 *   HF_TOKEN                                  (optional)
 *   Same .env loading conventions as runtime/virtuals-agents-adapter.mjs.
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
const MAX_ITEMS = maxIdx !== -1 ? (parseInt(args[maxIdx + 1], 10) || Infinity) : 10000;
const limitPagesIdx = args.indexOf('--limit-pages');
const LIMIT_PAGES = limitPagesIdx !== -1 ? (parseInt(args[limitPagesIdx + 1], 10) || Infinity) : Infinity;
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 1000; // 1 req/sec — gentle on HF
const ENDPOINT = 'https://huggingface.co/api/models';

if (!isDryRun && !isWrite) {
  console.error('[hf-adapter] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[hf-adapter] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[hf-adapter] Mode: ${MODE}  Endpoint: ${ENDPOINT}`);
console.log(`[hf-adapter] Target cap: ${MAX_ITEMS === Infinity ? 'unlimited' : MAX_ITEMS} models (top by downloads)`);
if (LIMIT_PAGES !== Infinity) console.log(`[hf-adapter] Capping at ${LIMIT_PAGES} pages`);

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
  // Load all candidate envs we can find — we want HF_TOKEN even in dry-run.
  // In write mode we also require SUPABASE_*.
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
    console.log(`[hf-adapter] Loaded env from ${envPath}`);
  }
}

await loadEnvFiles();

const HF_TOKEN = process.env.HF_TOKEN || null;
console.log(`[hf-adapter] HF API auth: ${HF_TOKEN ? 'authenticated (HF_TOKEN set)' : 'anonymous (no HF_TOKEN — may hit rate limits)'}`);

let supabase = null;
if (isWrite) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[hf-adapter] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
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

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function extractAuthor(modelId) {
  if (typeof modelId !== 'string') return null;
  const slash = modelId.indexOf('/');
  if (slash === -1) return null; // models without an org prefix (rare but exists)
  return modelId.slice(0, slash);
}

function normalize(item) {
  const modelId = item.id || item.modelId;
  return {
    model_id: modelId,
    author: item.author ?? extractAuthor(modelId),
    pipeline_tag: item.pipeline_tag ?? null,
    tags: Array.isArray(item.tags) ? item.tags : null,
    downloads: toIntOrNull(item.downloads),
    likes: toIntOrNull(item.likes),
    library_name: item.library_name ?? null,
    gated: typeof item.gated === 'boolean' ? item.gated : (item.gated ? true : false),
    created_at_hf: toIsoOrNull(item.createdAt),
    last_modified_at: toIsoOrNull(item.lastModified),
    raw_payload: item,
    payload_hash: hashPayload(item),
  };
}

async function fetchPage(url, attempt = 1) {
  const headers = { Accept: 'application/json', 'User-Agent': 'agentcrush-hf-adapter' };
  if (HF_TOKEN) headers.Authorization = `Bearer ${HF_TOKEN}`;
  const res = await fetch(url, { headers });
  if (res.status === 429) {
    if (attempt > 5) throw new Error(`[hf-adapter] HTTP 429 after ${attempt} attempts on ${url}`);
    const backoff = Math.min(60000, 2000 * Math.pow(2, attempt - 1));
    console.warn(`[hf-adapter] 429 rate-limited, backing off ${backoff}ms (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, backoff));
    return fetchPage(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`[hf-adapter] HTTP ${res.status} from ${url}`);
  }
  // HF pagination uses Link header (RFC 5988) with rel="next"
  const linkHeader = res.headers.get('link') || res.headers.get('Link');
  let nextUrl = null;
  if (linkHeader) {
    // e.g. <https://huggingface.co/api/models?...&cursor=xyz>; rel="next"
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (match) nextUrl = match[1];
  }
  const data = await res.json();
  return { data, nextUrl };
}

async function fetchAllModels() {
  let url = `${ENDPOINT}?sort=downloads&direction=-1&limit=${PAGE_SIZE}&full=true`;
  let pagesFetched = 0;
  const all = [];

  while (url) {
    const { data, nextUrl } = await fetchPage(url);
    if (!Array.isArray(data)) {
      throw new Error(`[hf-adapter] Unexpected response shape — expected array, got ${typeof data}`);
    }
    pagesFetched += 1;
    for (const item of data) {
      if (item && item.private === true) continue; // skip private
      all.push(item);
      if (all.length >= MAX_ITEMS) break;
    }

    if (pagesFetched % 10 === 0) {
      console.log(`[hf-adapter] Progress: ${pagesFetched} pages, ${all.length} models collected`);
    }

    if (data.length === 0) break;
    if (all.length >= MAX_ITEMS) {
      console.log(`[hf-adapter] Reached cap ${MAX_ITEMS}, stopping pagination`);
      break;
    }
    if (pagesFetched >= LIMIT_PAGES) {
      console.log(`[hf-adapter] Hit --limit-pages ${LIMIT_PAGES}, stopping pagination`);
      break;
    }
    if (!nextUrl) {
      console.log(`[hf-adapter] No next-page link — reached end of index`);
      break;
    }
    url = nextUrl;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  return { items: all.slice(0, MAX_ITEMS), pagesFetched };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[hf-adapter] Fetching…`);
  const t0 = Date.now();
  const { items, pagesFetched } = await fetchAllModels();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[hf-adapter] Fetched ${items.length} models across ${pagesFetched} pages in ${elapsed}s`);

  // Normalize
  const records = [];
  const skipped = [];
  for (const item of items) {
    if (!item || typeof (item.id || item.modelId) !== 'string') {
      skipped.push(item);
      continue;
    }
    records.push(normalize(item));
  }
  // Dedupe by model_id (keep last)
  const byId = new Map();
  for (const r of records) byId.set(r.model_id, r);
  const unique = Array.from(byId.values());

  console.log(`[hf-adapter] Normalized: ${unique.length} unique (skipped ${skipped.length} malformed)`);

  // Aggregate stats for the summary
  const totalDownloads = unique.reduce((s, r) => s + (r.downloads || 0), 0);
  const totalLikes = unique.reduce((s, r) => s + (r.likes || 0), 0);
  const top3 = unique
    .slice()
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 3)
    .map((r) => ({
      model_id: r.model_id,
      author: r.author,
      pipeline_tag: r.pipeline_tag,
      downloads: r.downloads,
      likes: r.likes,
      gated: r.gated,
    }));

  console.log(`[hf-adapter] Aggregate: total downloads=${totalDownloads.toLocaleString()}, total likes=${totalLikes.toLocaleString()}`);
  console.log(`[hf-adapter] Top 3 by downloads:`);
  console.log(JSON.stringify(top3, null, 2));

  if (isDryRun) {
    console.log(`[hf-adapter] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE path
  // 1. Load existing rows for diff + soft-remove logic
  const existing = new Map();
  {
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('hf_models')
        .select('model_id,payload_hash,removed_at')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`[hf-adapter] Supabase select failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data) existing.set(row.model_id, row);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const now = new Date().toISOString();
  let newCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;
  let revivedCount = 0;
  const upserts = [];
  for (const r of unique) {
    const prev = existing.get(r.model_id);
    if (!prev) newCount += 1;
    else if (prev.payload_hash !== r.payload_hash) changedCount += 1;
    else unchangedCount += 1;
    if (prev?.removed_at) revivedCount += 1;
    upserts.push({
      model_id: r.model_id,
      author: r.author,
      pipeline_tag: r.pipeline_tag,
      tags: r.tags,
      downloads: r.downloads,
      likes: r.likes,
      library_name: r.library_name,
      gated: r.gated,
      created_at_hf: r.created_at_hf,
      last_modified_at: r.last_modified_at,
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
      .from('hf_models')
      .upsert(batch, { onConflict: 'model_id' });
    if (error) throw new Error(`[hf-adapter] Upsert batch ${i} failed: ${error.message}`);
  }

  // Soft-remove rows missing from this fetch
  const seenIds = new Set(unique.map((r) => r.model_id));
  const toRemove = [];
  for (const [id, row] of existing.entries()) {
    if (!seenIds.has(id) && !row.removed_at) toRemove.push(id);
  }
  if (toRemove.length > 0) {
    for (let i = 0; i < toRemove.length; i += batchSize) {
      const batch = toRemove.slice(i, i + batchSize);
      const { error } = await supabase
        .from('hf_models')
        .update({ removed_at: now })
        .in('model_id', batch);
      if (error) throw new Error(`[hf-adapter] Soft-remove batch failed: ${error.message}`);
    }
  }

  console.log(`[hf-adapter] Summary:`);
  console.log(`  fetched (unique):  ${unique.length}`);
  console.log(`  pages:             ${pagesFetched}`);
  console.log(`  new:               ${newCount}`);
  console.log(`  changed:           ${changedCount}`);
  console.log(`  unchanged:         ${unchangedCount}`);
  console.log(`  revived:           ${revivedCount}`);
  console.log(`  soft-removed:      ${toRemove.length}`);
}

main().catch((err) => {
  console.error('[hf-adapter] FATAL:', err.message);
  process.exit(1);
});
