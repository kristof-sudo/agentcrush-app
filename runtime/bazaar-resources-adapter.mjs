/**
 * CDP Bazaar /discovery/resources adapter v0
 *
 * Read-only fetcher. Pulls the full Coinbase CDP Bazaar resources index
 * (https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources),
 * normalizes each item, and upserts into the `bazaar_resources` table.
 *
 * No scoring impact. No agent-facing surface. Just a normalized source table.
 *
 * Usage:
 *   node runtime/bazaar-resources-adapter.mjs --dry-run            # fetch + print summary, no DB writes
 *   node runtime/bazaar-resources-adapter.mjs --write              # upsert into Supabase
 *   node runtime/bazaar-resources-adapter.mjs --dry-run --max 500  # cap pages fetched
 *
 * Idempotent: unique on resource_url. Re-runs bump last_seen_at and
 * overwrite the normalized columns. Rows present in DB but missing from
 * the latest fetch get `removed_at` set (soft-remove); reappearance clears it.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
 *   Same .env loading conventions as runtime/ajsa/ajsa-ingest-worker.mjs.
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
const PAGE_LIMIT = 1000;
const ENDPOINT = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources';

if (!isDryRun && !isWrite) {
  console.error('[bazaar-adapter] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[bazaar-adapter] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[bazaar-adapter] Mode: ${MODE}  Endpoint: ${ENDPOINT}`);
if (MAX_ITEMS !== Infinity) console.log(`[bazaar-adapter] Capping at ${MAX_ITEMS} items`);

// ── Env loading (write mode only) ─────────────────────────────────────────────

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

async function loadSupabaseEnv() {
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY) {
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log(`[bazaar-adapter] Loaded env from ${envPath}`);
      return;
    }
  }
  throw new Error(
    `[bazaar-adapter] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in:\n  ${ENV_CANDIDATES.join('\n  ')}`
  );
}

let supabase = null;
if (isWrite) {
  await loadSupabaseEnv();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[bazaar-adapter] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Canonical JSON for stable hashing — recursively sort object keys.
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

function normalize(item) {
  const bazaarInfo = item?.extensions?.bazaar?.info ?? null;
  const declaredSchema = bazaarInfo?.schema ?? null;
  return {
    resource_url: item.resource,
    type: item.type ?? null,
    x402_version: typeof item.x402Version === 'number' ? item.x402Version : null,
    description: item.description ?? null,
    accepts: Array.isArray(item.accepts) ? item.accepts : [],
    declared_schema: declaredSchema,
    bazaar_info: bazaarInfo,
    quality: item.quality ?? null,
    last_updated_at: item.lastUpdated ?? null,
    raw_payload: item,
    payload_hash: hashPayload(item),
  };
}

async function fetchAllResources() {
  let offset = 0;
  let total = null;
  const all = [];
  while (true) {
    const url = `${ENDPOINT}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`[bazaar-adapter] HTTP ${res.status} from ${url}`);
    }
    const body = await res.json();
    if (!Array.isArray(body.items)) {
      throw new Error(`[bazaar-adapter] Unexpected response shape — missing items[]`);
    }
    total = body.pagination?.total ?? total;
    all.push(...body.items);
    if (body.items.length === 0) break;
    offset += body.items.length;
    if (total != null && offset >= total) break;
    if (all.length >= MAX_ITEMS) {
      console.log(`[bazaar-adapter] Hit --max ${MAX_ITEMS} cap, stopping pagination`);
      break;
    }
  }
  return { items: all.slice(0, MAX_ITEMS), reportedTotal: total };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[bazaar-adapter] Fetching…`);
  const t0 = Date.now();
  const { items, reportedTotal } = await fetchAllResources();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[bazaar-adapter] Fetched ${items.length} items (Bazaar reports total=${reportedTotal}) in ${elapsed}s`);

  if (reportedTotal != null && reportedTotal < 100) {
    console.warn(`[bazaar-adapter] WARNING: reported total < 100 — Bazaar may be degraded.`);
  }

  // Normalize
  const records = [];
  const skipped = [];
  for (const item of items) {
    if (!item || typeof item.resource !== 'string' || !item.resource) {
      skipped.push(item);
      continue;
    }
    records.push(normalize(item));
  }
  // Dedupe on resource_url within this fetch (keep last occurrence)
  const byUrl = new Map();
  for (const r of records) byUrl.set(r.resource_url, r);
  const unique = Array.from(byUrl.values());

  // Quick sanity: AgentCrush endpoints
  const ourEndpoints = unique.filter((r) => r.resource_url.includes('agentcrush'));
  console.log(`[bazaar-adapter] AgentCrush endpoints in Bazaar: ${ourEndpoints.length}`);
  for (const r of ourEndpoints) console.log(`  - ${r.resource_url}`);

  console.log(`[bazaar-adapter] Normalized: ${unique.length} unique (skipped ${skipped.length} malformed)`);

  if (isDryRun) {
    // Print a small preview
    const sample = unique.slice(0, 3).map((r) => ({
      resource_url: r.resource_url,
      type: r.type,
      x402_version: r.x402_version,
      description: r.description?.slice(0, 80) ?? null,
      accept_count: r.accepts.length,
      payload_hash: r.payload_hash.slice(0, 12) + '…',
      last_updated_at: r.last_updated_at,
    }));
    console.log(`[bazaar-adapter] Sample (first 3):`);
    console.log(JSON.stringify(sample, null, 2));
    console.log(`[bazaar-adapter] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE path
  // 1. Load existing rows (resource_url, payload_hash, removed_at) to compute diff.
  const existing = new Map();
  {
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('bazaar_resources')
        .select('resource_url,payload_hash,removed_at')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`[bazaar-adapter] Supabase select failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data) existing.set(row.resource_url, row);
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
    const prev = existing.get(r.resource_url);
    if (!prev) {
      newCount += 1;
    } else if (prev.payload_hash !== r.payload_hash) {
      changedCount += 1;
    } else {
      unchangedCount += 1;
    }
    if (prev?.removed_at) revivedCount += 1;
    upserts.push({
      resource_url: r.resource_url,
      type: r.type,
      x402_version: r.x402_version,
      description: r.description,
      accepts: r.accepts,
      declared_schema: r.declared_schema,
      bazaar_info: r.bazaar_info,
      quality: r.quality,
      last_updated_at: r.last_updated_at,
      raw_payload: r.raw_payload,
      payload_hash: r.payload_hash,
      last_seen_at: now,
      removed_at: null,
    });
  }

  // Upsert in batches
  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('bazaar_resources')
      .upsert(batch, { onConflict: 'resource_url' });
    if (error) throw new Error(`[bazaar-adapter] Upsert batch ${i} failed: ${error.message}`);
  }

  // Soft-remove rows missing from this fetch
  const seenUrls = new Set(unique.map((r) => r.resource_url));
  const toRemove = [];
  for (const [url, row] of existing.entries()) {
    if (!seenUrls.has(url) && !row.removed_at) toRemove.push(url);
  }
  if (toRemove.length > 0) {
    for (let i = 0; i < toRemove.length; i += batchSize) {
      const batch = toRemove.slice(i, i + batchSize);
      const { error } = await supabase
        .from('bazaar_resources')
        .update({ removed_at: now })
        .in('resource_url', batch);
      if (error) throw new Error(`[bazaar-adapter] Soft-remove batch failed: ${error.message}`);
    }
  }

  console.log(`[bazaar-adapter] Summary:`);
  console.log(`  fetched (unique):  ${unique.length}`);
  console.log(`  new:               ${newCount}`);
  console.log(`  changed:           ${changedCount}`);
  console.log(`  unchanged:         ${unchangedCount}`);
  console.log(`  revived:           ${revivedCount}`);
  console.log(`  soft-removed:      ${toRemove.length}`);
  console.log(`  agentcrush rows:   ${ourEndpoints.length}`);
}

main().catch((err) => {
  console.error('[bazaar-adapter] FATAL:', err.message);
  process.exit(1);
});
