/**
 * Agentverse (Fetch.ai) /v1/search/agents adapter v0
 *
 * Read-only fetcher. Pulls the full Agentverse public agent index
 * (POST https://agentverse.ai/v1/search/agents), normalizes each agent,
 * and upserts into the `agentverse_agents` table.
 *
 * No scoring impact. No agent-facing surface. Just a normalized source table.
 *
 * Usage:
 *   node runtime/agentverse-agents-adapter.mjs --dry-run                    # fetch + print summary, no DB writes
 *   node runtime/agentverse-agents-adapter.mjs --write                     # upsert into Supabase
 *   node runtime/agentverse-agents-adapter.mjs --dry-run --max 500         # cap items fetched
 *   node runtime/agentverse-agents-adapter.mjs --dry-run --limit-pages 3   # cap pages fetched
 *
 * Idempotent: unique on agentverse_id. Re-runs bump last_seen_at and
 * overwrite the normalized columns.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
 *   AGENTVERSE_API_KEY                       (optional — public listing is unauthenticated)
 *   Same .env loading conventions as runtime/bazaar-resources-adapter.mjs.
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
const pagesIdx = args.indexOf('--limit-pages');
const MAX_PAGES = pagesIdx !== -1 ? (parseInt(args[pagesIdx + 1], 10) || Infinity) : Infinity;
const PAGE_LIMIT = 100;
const ENDPOINT = 'https://agentverse.ai/v1/search/agents';
const PAGE_DELAY_MS = 1000;

if (!isDryRun && !isWrite) {
  console.error('[agentverse-adapter] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[agentverse-adapter] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[agentverse-adapter] Mode: ${MODE}  Endpoint: ${ENDPOINT}`);
if (MAX_ITEMS !== Infinity) console.log(`[agentverse-adapter] Capping at ${MAX_ITEMS} items`);
if (MAX_PAGES !== Infinity) console.log(`[agentverse-adapter] Capping at ${MAX_PAGES} pages`);

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

async function loadEnv({ requireSupabase }) {
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    const hasSupabase = parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY;
    if (!requireSupabase || hasSupabase) {
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log(`[agentverse-adapter] Loaded env from ${envPath}`);
      if (!requireSupabase) return;
      if (hasSupabase) return;
    }
  }
  if (requireSupabase) {
    throw new Error(
      `[agentverse-adapter] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in:\n  ${ENV_CANDIDATES.join('\n  ')}`
    );
  }
}

let supabase = null;
if (isWrite) {
  await loadEnv({ requireSupabase: true });
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[agentverse-adapter] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
} else {
  // Best-effort env load (e.g. to pick up AGENTVERSE_API_KEY if present), but don't fail.
  try { await loadEnv({ requireSupabase: false }); } catch { /* noop */ }
}

const AGENTVERSE_API_KEY = process.env.AGENTVERSE_API_KEY || null;
if (AGENTVERSE_API_KEY) {
  console.log('[agentverse-adapter] AGENTVERSE_API_KEY present — will send Authorization header');
} else {
  console.log('[agentverse-adapter] No AGENTVERSE_API_KEY — using public unauthenticated access');
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

function deriveStatus(agent) {
  const base = agent.status ?? null;
  if (base === 'active' && agent.unresponsive === true) return 'unresponsive';
  if (base === 'active' && agent.unresponsive === false) return 'responsive';
  return base;
}

function extractEndpointUrl(agent) {
  const md = agent.metadata;
  if (md && typeof md === 'object') {
    if (typeof md.endpoint === 'string') return md.endpoint;
    if (Array.isArray(md.endpoints) && md.endpoints.length > 0) {
      const first = md.endpoints[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.url === 'string') return first.url;
    }
  }
  return null;
}

function normalize(agent) {
  const successRate = typeof agent.recent_success_rate === 'number'
    ? agent.recent_success_rate
    : null;
  const uptimePct = successRate != null
    ? (successRate <= 1 ? successRate * 100 : successRate)
    : null;
  return {
    agentverse_id: agent.address,
    name: agent.name || null,
    description: agent.description || null,
    category: agent.category ?? null,
    address: agent.address,
    endpoint_url: extractEndpointUrl(agent),
    is_active: agent.status === 'active',
    status: deriveStatus(agent),
    protocols: Array.isArray(agent.protocols) ? agent.protocols : [],
    runtime: agent.type ?? null,
    interactions_count: typeof agent.total_interactions === 'number'
      ? agent.total_interactions
      : null,
    rating: typeof agent.rating === 'number' ? agent.rating : null,
    uptime_pct: uptimePct,
    tags: Array.isArray(agent.system_wide_tags) ? agent.system_wide_tags : [],
    raw_payload: agent,
    payload_hash: hashPayload(agent),
  };
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchAllAgents() {
  let offset = 0;
  let pageNum = 0;
  let reportedTotal = null;
  const all = [];
  while (true) {
    pageNum += 1;
    const body = {
      filters: {},
      sort: 'relevancy',
      direction: 'asc',
      search_text: '',
      offset,
      limit: PAGE_LIMIT,
    };
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (AGENTVERSE_API_KEY) headers.Authorization = `Bearer ${AGENTVERSE_API_KEY}`;

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`[agentverse-adapter] HTTP ${res.status} from ${ENDPOINT} (page ${pageNum}, offset ${offset})`);
    }
    const json = await res.json();
    if (!Array.isArray(json.agents)) {
      throw new Error('[agentverse-adapter] Unexpected response shape — missing agents[]');
    }
    if (reportedTotal == null && typeof json.total === 'number') reportedTotal = json.total;
    all.push(...json.agents);
    console.log(`[agentverse-adapter] page ${pageNum}: fetched ${json.agents.length} (running total ${all.length}, reported total ${reportedTotal})`);

    if (json.agents.length === 0) break;
    if (json.agents.length < PAGE_LIMIT) break;
    if (all.length >= MAX_ITEMS) {
      console.log(`[agentverse-adapter] Hit --max ${MAX_ITEMS} cap, stopping pagination`);
      break;
    }
    if (pageNum >= MAX_PAGES) {
      console.log(`[agentverse-adapter] Hit --limit-pages ${MAX_PAGES} cap, stopping pagination`);
      break;
    }
    offset += json.agents.length;
    await sleep(PAGE_DELAY_MS);
  }
  return { items: all.slice(0, MAX_ITEMS), reportedTotal };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[agentverse-adapter] Fetching…');
  const t0 = Date.now();
  const { items, reportedTotal } = await fetchAllAgents();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[agentverse-adapter] Fetched ${items.length} agents (Agentverse reports total=${reportedTotal}) in ${elapsed}s`);

  // Normalize
  const records = [];
  const skipped = [];
  for (const agent of items) {
    if (!agent || typeof agent.address !== 'string' || !agent.address) {
      skipped.push(agent);
      continue;
    }
    records.push(normalize(agent));
  }
  // Dedupe on address (keep last)
  const byId = new Map();
  for (const r of records) byId.set(r.agentverse_id, r);
  const unique = Array.from(byId.values());

  // Sanity: AgentCrush row
  const ourRows = unique.filter((r) =>
    (r.name && r.name.toLowerCase().includes('agentcrush')) ||
    (r.raw_payload && r.raw_payload.handle === 'agentcrush')
  );
  console.log(`[agentverse-adapter] AgentCrush rows in fetch: ${ourRows.length}`);
  for (const r of ourRows) {
    console.log(`  - ${r.agentverse_id}  name="${r.name}" status=${r.status} runtime=${r.runtime}`);
  }

  console.log(`[agentverse-adapter] Normalized: ${unique.length} unique (skipped ${skipped.length} malformed)`);

  if (isDryRun) {
    const sample = unique.slice(0, 2).map((r) => ({
      agentverse_id: r.agentverse_id,
      name: r.name,
      category: r.category,
      runtime: r.runtime,
      is_active: r.is_active,
      status: r.status,
      interactions_count: r.interactions_count,
      rating: r.rating,
      uptime_pct: r.uptime_pct,
      protocols_count: r.protocols.length,
      description: r.description?.slice(0, 80) ?? null,
      payload_hash: r.payload_hash.slice(0, 12) + '…',
    }));
    console.log('[agentverse-adapter] Sample (first 2):');
    console.log(JSON.stringify(sample, null, 2));
    console.log('[agentverse-adapter] DRY-RUN complete. No DB writes.');
    return;
  }

  // WRITE path
  const now = new Date().toISOString();
  const upserts = unique.map((r) => ({
    agentverse_id: r.agentverse_id,
    name: r.name,
    description: r.description,
    category: r.category,
    address: r.address,
    endpoint_url: r.endpoint_url,
    is_active: r.is_active,
    status: r.status,
    protocols: r.protocols,
    runtime: r.runtime,
    interactions_count: r.interactions_count,
    rating: r.rating,
    uptime_pct: r.uptime_pct,
    tags: r.tags,
    raw_payload: r.raw_payload,
    payload_hash: r.payload_hash,
    last_seen_at: now,
  }));

  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('agentverse_agents')
      .upsert(batch, { onConflict: 'agentverse_id' });
    if (error) throw new Error(`[agentverse-adapter] Upsert batch ${i} failed: ${error.message}`);
  }

  console.log('[agentverse-adapter] Summary:');
  console.log(`  fetched (unique):  ${unique.length}`);
  console.log(`  upserted:          ${upserts.length}`);
  console.log(`  agentcrush rows:   ${ourRows.length}`);
}

main().catch((err) => {
  console.error('[agentverse-adapter] FATAL:', err.message);
  process.exit(1);
});
