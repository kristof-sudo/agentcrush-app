/**
 * Virtuals Protocol agents adapter v0
 *
 * Read-only fetcher. Pulls the full public Virtuals Protocol agent index
 * (https://api.virtuals.io/api/virtuals), normalizes each item, and upserts
 * into the `virtuals_agents` table.
 *
 * No scoring impact. No agent-facing surface. Just a normalized source table.
 *
 * Usage:
 *   node runtime/virtuals-agents-adapter.mjs --dry-run                 # fetch + print summary, no DB writes
 *   node runtime/virtuals-agents-adapter.mjs --write                   # upsert into Supabase
 *   node runtime/virtuals-agents-adapter.mjs --dry-run --max 200       # cap total items
 *   node runtime/virtuals-agents-adapter.mjs --dry-run --limit-pages 3 # cap pages fetched
 *
 * Idempotent. PK is `virtuals_id`. Re-runs bump last_seen_at and overwrite
 * the normalized columns. `first_seen_at` is preserved across runs via the
 * upsert (DB default fires only on insert).
 *
 * NOTE on denomination: Virtuals reports market_cap / TVL / token price in
 * their native VIRTUAL token (mcapInVirtual, virtualTokenValue,
 * totalValueLocked). Those land in *_virtual columns. `liquidityUsd` and
 * `volume24h` are assumed USD-denominated (matches the Virtuals UI).
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
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
const limitPagesIdx = args.indexOf('--limit-pages');
const LIMIT_PAGES = limitPagesIdx !== -1 ? (parseInt(args[limitPagesIdx + 1], 10) || Infinity) : Infinity;
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 1000; // 1s between page fetches
const ENDPOINT = 'https://api.virtuals.io/api/virtuals';

if (!isDryRun && !isWrite) {
  console.error('[virtuals-adapter] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[virtuals-adapter] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[virtuals-adapter] Mode: ${MODE}  Endpoint: ${ENDPOINT}`);
if (MAX_ITEMS !== Infinity) console.log(`[virtuals-adapter] Capping at ${MAX_ITEMS} items`);
if (LIMIT_PAGES !== Infinity) console.log(`[virtuals-adapter] Capping at ${LIMIT_PAGES} pages`);

// ── Env loading (write mode only) ─────────────────────────────────────────────

const ENV_CANDIDATES = [
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
      console.log(`[virtuals-adapter] Loaded env from ${envPath}`);
      return;
    }
  }
  throw new Error(
    `[virtuals-adapter] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in:\n  ${ENV_CANDIDATES.join('\n  ')}`
  );
}

let supabase = null;
if (isWrite) {
  await loadSupabaseEnv();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[virtuals-adapter] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
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

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v) {
  const n = toNumberOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function pickTwitterUrl(socials) {
  if (!socials || typeof socials !== 'object') return null;
  if (typeof socials.x === 'string') return socials.x;
  if (typeof socials.TWITTER === 'string') return socials.TWITTER;
  const verified = socials.VERIFIED_LINKS;
  if (verified && typeof verified.TWITTER === 'string') return verified.TWITTER;
  return null;
}

function pickWebsiteUrl(item) {
  // No explicit website field in the public API; fall back to app.virtuals.io link.
  if (item?.id != null) return `https://app.virtuals.io/virtuals/${item.id}`;
  return null;
}

function chainLabel(raw) {
  if (typeof raw !== 'string' || !raw) return 'base';
  return raw.toLowerCase();
}

function normalize(item) {
  return {
    virtuals_id: item.id,
    uid: item.uid ?? null,
    name: item.name ?? null,
    ticker: item.symbol ?? null,
    description: item.description ?? null,
    token_address: item.tokenAddress ?? null,
    chain: chainLabel(item.chain),
    status: item.status ?? null,

    token_price_virtual: toNumberOrNull(item.virtualTokenValue),
    market_cap_virtual: toNumberOrNull(item.mcapInVirtual),
    fdv_virtual: toNumberOrNull(item.fdvInVirtual),
    tvl_virtual: toNumberOrNull(item.totalValueLocked),

    token_price_usd: null,
    market_cap_usd: null,
    tvl_usd: null,
    liquidity_usd: toNumberOrNull(item.liquidityUsd),
    volume_24h_usd: toNumberOrNull(item.volume24h),

    holders: toIntOrNull(item.holderCount),
    top10_holder_pct: toNumberOrNull(item.top10HolderPercentage),
    price_change_pct_24h: toNumberOrNull(item.priceChangePercent24h),
    net_volume_24h: toNumberOrNull(item.netVolume24h),

    category: item.category ?? null,
    archetype: item.role ?? null,

    image_url: item?.image?.url ?? null,
    website_url: pickWebsiteUrl(item),
    twitter_url: pickTwitterUrl(item.socials),
    github_url: null, // not exposed by Virtuals public API

    raw_payload: item,
    payload_hash: hashPayload(item),
  };
}

async function fetchAllAgents() {
  let page = 1;
  let pagesFetched = 0;
  const all = [];
  let reportedTotal = null;
  let reportedPageCount = null;

  while (true) {
    const url = `${ENDPOINT}?pagination%5Bpage%5D=${page}&pagination%5BpageSize%5D=${PAGE_SIZE}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`[virtuals-adapter] HTTP ${res.status} from ${url}`);
    }
    const body = await res.json();
    if (!Array.isArray(body?.data)) {
      throw new Error(`[virtuals-adapter] Unexpected response shape — missing data[]`);
    }
    reportedTotal = body?.meta?.pagination?.total ?? reportedTotal;
    reportedPageCount = body?.meta?.pagination?.pageCount ?? reportedPageCount;
    all.push(...body.data);
    pagesFetched += 1;

    if (body.data.length === 0) break;
    if (pagesFetched >= LIMIT_PAGES) {
      console.log(`[virtuals-adapter] Hit --limit-pages ${LIMIT_PAGES}, stopping pagination`);
      break;
    }
    if (all.length >= MAX_ITEMS) {
      console.log(`[virtuals-adapter] Hit --max ${MAX_ITEMS} cap, stopping pagination`);
      break;
    }
    if (reportedPageCount != null && page >= reportedPageCount) break;

    page += 1;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  return { items: all.slice(0, MAX_ITEMS), reportedTotal, reportedPageCount, pagesFetched };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[virtuals-adapter] Fetching…`);
  const t0 = Date.now();
  const { items, reportedTotal, reportedPageCount, pagesFetched } = await fetchAllAgents();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[virtuals-adapter] Fetched ${items.length} items across ${pagesFetched} pages ` +
    `(Virtuals reports total=${reportedTotal}, pageCount=${reportedPageCount}) in ${elapsed}s`
  );

  // Normalize
  const records = [];
  const skipped = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'number') {
      skipped.push(item);
      continue;
    }
    records.push(normalize(item));
  }
  // Dedupe on virtuals_id within this fetch (keep last occurrence)
  const byId = new Map();
  for (const r of records) byId.set(r.virtuals_id, r);
  const unique = Array.from(byId.values());

  console.log(`[virtuals-adapter] Normalized: ${unique.length} unique (skipped ${skipped.length} malformed)`);

  if (isDryRun) {
    const sample = unique.slice(0, 2).map((r) => ({
      virtuals_id: r.virtuals_id,
      name: r.name,
      ticker: r.ticker,
      token_address: r.token_address,
      chain: r.chain,
      status: r.status,
      market_cap_virtual: r.market_cap_virtual,
      tvl_virtual: r.tvl_virtual,
      liquidity_usd: r.liquidity_usd,
      volume_24h_usd: r.volume_24h_usd,
      holders: r.holders,
      price_change_pct_24h: r.price_change_pct_24h,
      category: r.category,
      archetype: r.archetype,
      twitter_url: r.twitter_url,
      website_url: r.website_url,
      payload_hash: r.payload_hash.slice(0, 12) + '…',
    }));
    console.log(`[virtuals-adapter] Sample (first 2):`);
    console.log(JSON.stringify(sample, null, 2));
    console.log(`[virtuals-adapter] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE path
  const now = new Date().toISOString();
  const upserts = unique.map((r) => ({
    virtuals_id: r.virtuals_id,
    uid: r.uid,
    name: r.name,
    ticker: r.ticker,
    description: r.description,
    token_address: r.token_address,
    chain: r.chain,
    status: r.status,
    token_price_virtual: r.token_price_virtual,
    market_cap_virtual: r.market_cap_virtual,
    fdv_virtual: r.fdv_virtual,
    tvl_virtual: r.tvl_virtual,
    token_price_usd: r.token_price_usd,
    market_cap_usd: r.market_cap_usd,
    tvl_usd: r.tvl_usd,
    liquidity_usd: r.liquidity_usd,
    volume_24h_usd: r.volume_24h_usd,
    holders: r.holders,
    top10_holder_pct: r.top10_holder_pct,
    price_change_pct_24h: r.price_change_pct_24h,
    net_volume_24h: r.net_volume_24h,
    category: r.category,
    archetype: r.archetype,
    image_url: r.image_url,
    website_url: r.website_url,
    twitter_url: r.twitter_url,
    github_url: r.github_url,
    payload_hash: r.payload_hash,
    raw_payload: r.raw_payload,
    last_seen_at: now,
  }));

  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('virtuals_agents')
      .upsert(batch, { onConflict: 'virtuals_id' });
    if (error) throw new Error(`[virtuals-adapter] Upsert batch ${i} failed: ${error.message}`);
  }

  console.log(`[virtuals-adapter] Summary:`);
  console.log(`  fetched (unique): ${unique.length}`);
  console.log(`  pages:            ${pagesFetched}`);
  console.log(`  upserted:         ${upserts.length}`);
}

main().catch((err) => {
  console.error('[virtuals-adapter] FATAL:', err.message);
  process.exit(1);
});
