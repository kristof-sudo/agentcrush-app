#!/usr/bin/env node
/**
 * ERC-8004 AgentRegistry daily on-chain sync
 *
 * Enumerates the full ERC-8004 IdentityRegistry on Base mainnet
 * (proxy: 0x8004a169fb4a3325136eb29fa0ceb6d2e539a432) and persists every
 * token's metadata so we can answer "how many agents registered this week?"
 * and surface protocol-level discovery signals.
 *
 * Discovery strategy:
 *   The deployed contract is an EIP-1967 proxy over IdentityRegistryUpgradeable.
 *   It does NOT implement ERC-721 Enumerable — there is no totalSupply() or
 *   tokenByIndex(uint256). Token IDs are non-sequential. To enumerate, we
 *   query Transfer(from=address(0)) mint logs in block-range windows, dedupe
 *   token IDs, then for each ID call ownerOf(uint256) + tokenURI(uint256)
 *   and fetch the off-chain metadata JSON.
 *
 * Read-only on-chain (eth_call / eth_getLogs only). No private keys.
 *
 * Usage:
 *   node runtime/erc8004-registry-sync.mjs --dry-run [--max N] [--rpc URL]
 *   node runtime/erc8004-registry-sync.mjs --write   [--max N] [--rpc URL]
 *
 * Optional flags:
 *   --from-block N   Lower bound for log scan (default: contract creation
 *                    or, in write mode, the lowest registered_at-mapped block)
 *   --window N       Block window per eth_getLogs call (default: 50000)
 *   --skip-metadata  Skip off-chain tokenURI fetch (faster, leaves metadata
 *                    fields null; used for the cron's quick "new tokens" pass)
 *
 * Idempotent — safe to re-run. RPC rate-limited to ≤50 reads/sec.
 *
 * Env (write mode only): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   Loaded with the same fallback list as runtime/bazaar-resources-adapter.mjs.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_ADDRESS = '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432';
const CHAIN_NAME = 'base';
const DEFAULT_RPC = 'https://base-rpc.publicnode.com';
const RATE_LIMIT_PER_SEC = 50;
const MIN_INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT_PER_SEC); // 20ms
const DEFAULT_WINDOW = 50000;
// Approx Base block where ERC-8004 went live (Jan 2026); conservative lower bound.
// First registration block can be tightened later via checkpoint.
const DEFAULT_FROM_BLOCK = 26000000;

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_TOPIC     = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Standard ERC-721 selectors used by IdentityRegistryUpgradeable
const SELECTOR_OWNER_OF  = '0x6352211e';                  // ownerOf(uint256)
const SELECTOR_TOKEN_URI = '0xc87b56dd';                  // tokenURI(uint256)

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite  = args.includes('--write');
const skipMetadata = args.includes('--skip-metadata');

function argValue(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1];
}

const MAX_TOKENS = (() => {
  const v = argValue('--max');
  if (!v) return Infinity;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
})();
const RPC_URL = argValue('--rpc', DEFAULT_RPC);
const FROM_BLOCK = (() => {
  const v = argValue('--from-block');
  if (!v) return DEFAULT_FROM_BLOCK;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : DEFAULT_FROM_BLOCK;
})();
const BLOCK_WINDOW = (() => {
  const v = argValue('--window');
  if (!v) return DEFAULT_WINDOW;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW;
})();

if (!isDryRun && !isWrite) {
  console.error('[erc8004-sync] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[erc8004-sync] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[erc8004-sync] Mode: ${MODE}`);
console.log(`[erc8004-sync] Contract: ${CONTRACT_ADDRESS} (${CHAIN_NAME})`);
console.log(`[erc8004-sync] RPC: ${RPC_URL}`);
console.log(`[erc8004-sync] from-block: ${FROM_BLOCK}  window: ${BLOCK_WINDOW}`);
if (MAX_TOKENS !== Infinity) console.log(`[erc8004-sync] Capping at ${MAX_TOKENS} tokens`);
if (skipMetadata) console.log(`[erc8004-sync] --skip-metadata: tokenURI/metadata fetch disabled`);

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
      console.log(`[erc8004-sync] Loaded env from ${envPath}`);
      return;
    }
  }
  throw new Error(
    `[erc8004-sync] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in:\n  ${ENV_CANDIDATES.join('\n  ')}`
  );
}

let supabase = null;
if (isWrite) {
  await loadSupabaseEnv();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[erc8004-sync] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

let lastCallAt = 0;
async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
  return out;
}

function hashJson(obj) {
  const canonical = JSON.stringify(canonicalize(obj));
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function encodeUint256(n) {
  const bn = typeof n === 'bigint' ? n : BigInt(n);
  return bn.toString(16).padStart(64, '0');
}

function decodeAddress(hex) {
  const h = hex.replace(/^0x/, '').padStart(64, '0');
  return '0x' + h.slice(24).toLowerCase();
}

function decodeString(hex) {
  // ABI: offset (32) | length (32) | data (padded)
  const h = hex.replace(/^0x/, '');
  if (h.length < 128) return '';
  const len = Number(BigInt('0x' + h.slice(64, 128)));
  if (len === 0) return '';
  const dataHex = h.slice(128, 128 + len * 2);
  return Buffer.from(dataHex, 'hex').toString('utf8');
}

// ── RPC ───────────────────────────────────────────────────────────────────────

let rpcId = 1;
async function rpcCall(method, params) {
  await throttle();
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`RPC error: ${JSON.stringify(body.error)}`);
  return body.result;
}

async function ethCall(data) {
  return rpcCall('eth_call', [{ to: CONTRACT_ADDRESS, data }, 'latest']);
}

async function readOwnerOf(tokenId) {
  const data = SELECTOR_OWNER_OF + encodeUint256(tokenId);
  return decodeAddress(await ethCall(data));
}

async function readTokenURI(tokenId) {
  const data = SELECTOR_TOKEN_URI + encodeUint256(tokenId);
  return decodeString(await ethCall(data));
}

async function getBlockNumber() {
  const hex = await rpcCall('eth_blockNumber', []);
  return parseInt(hex, 16);
}

async function getMintLogs(fromBlock, toBlock) {
  const params = [{
    address: CONTRACT_ADDRESS,
    topics: [TRANSFER_TOPIC, ZERO_TOPIC],
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + toBlock.toString(16),
  }];
  return rpcCall('eth_getLogs', params);
}

// ── Enumerate token IDs via mint logs ─────────────────────────────────────────

async function enumerateTokenIds(fromBlock, latestBlock) {
  const ids = new Set();
  let from = fromBlock;
  while (from <= latestBlock) {
    let to = Math.min(from + BLOCK_WINDOW - 1, latestBlock);
    let attempt = 0;
    while (true) {
      try {
        const logs = await getMintLogs(from, to);
        for (const log of logs) {
          // topic3 (4th topic) is tokenId for ERC-721 Transfer
          if (log.topics && log.topics.length >= 4) {
            ids.add(BigInt(log.topics[3]).toString());
          }
        }
        process.stdout.write(`[erc8004-sync] logs ${from}..${to}: +${logs.length}  total ids: ${ids.size}\r`);
        break;
      } catch (err) {
        attempt++;
        const msg = err.message || String(err);
        // Some RPCs (incl. publicnode) return "range too large" — halve the window.
        if (attempt <= 6 && (msg.includes('too large') || msg.includes('limit') || msg.includes('exceed'))) {
          const newTo = from + Math.max(1, Math.floor((to - from) / 2));
          to = newTo;
          continue;
        }
        throw err;
      }
    }
    from = to + 1;
    if (ids.size >= MAX_TOKENS) break;
  }
  console.log(''); // newline after \r progress
  return Array.from(ids).map((s) => BigInt(s)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ── Metadata fetch ────────────────────────────────────────────────────────────

async function fetchMetadata(uri) {
  if (!uri) return null;
  let resolvedUri = uri;
  if (resolvedUri.startsWith('ipfs://')) {
    const cid = resolvedUri.replace(/^ipfs:\/\//, '');
    resolvedUri = `https://ipfs.io/ipfs/${cid}`;
  }
  if (resolvedUri.startsWith('data:application/json')) {
    const comma = resolvedUri.indexOf(',');
    if (comma === -1) return null;
    const payload = resolvedUri.slice(comma + 1);
    const isBase64 = resolvedUri.slice(0, comma).includes(';base64');
    try {
      const text = isBase64
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
      return JSON.parse(text);
    } catch { return null; }
  }
  if (!/^https?:\/\//i.test(resolvedUri)) return null;
  try {
    const res = await fetch(resolvedUri, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AgentCrush-ERC8004-Sync/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function extractEndpoints(meta) {
  if (!meta || typeof meta !== 'object') return null;
  if (Array.isArray(meta.endpoints)) return meta.endpoints;
  if (Array.isArray(meta.supported_protocols)) return meta.supported_protocols;
  if (meta.endpoint && typeof meta.endpoint === 'string') return [meta.endpoint];
  return null;
}

function extractX402Supported(meta, endpoints) {
  if (!meta) return false;
  if (typeof meta.x402_supported === 'boolean') return meta.x402_supported;
  if (typeof meta.x402Supported === 'boolean') return meta.x402Supported;
  if (Array.isArray(endpoints)) {
    return endpoints.some((e) => typeof e === 'string' && e.toLowerCase().includes('x402'));
  }
  if (Array.isArray(meta.supported_protocols)) {
    return meta.supported_protocols.some((p) => typeof p === 'string' && p.toLowerCase().includes('x402'));
  }
  return false;
}

function extractAgentName(meta) {
  if (!meta || typeof meta !== 'object') return null;
  return meta.name || meta.agent_name || meta.agentName || null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const latestBlock = await getBlockNumber();
  console.log(`[erc8004-sync] latest block: ${latestBlock}`);

  console.log(`[erc8004-sync] Enumerating token IDs from mint logs…`);
  const allIds = await enumerateTokenIds(FROM_BLOCK, latestBlock);
  const cap = MAX_TOKENS === Infinity ? allIds.length : Math.min(MAX_TOKENS, allIds.length);
  const ids = allIds.slice(0, cap);
  console.log(`[erc8004-sync] discovered ${allIds.length} unique token IDs (will process ${ids.length})`);

  const rows = [];
  const samples = [];
  let okCount = 0;
  let errCount = 0;

  for (let idx = 0; idx < ids.length; idx++) {
    const id = ids[idx];
    try {
      const owner = await readOwnerOf(id);
      let uri = null;
      let meta = null;
      let endpoints = null;
      let agentName = null;
      let x402 = false;
      let metaHash = null;

      if (!skipMetadata) {
        try { uri = await readTokenURI(id); } catch { uri = null; }
        meta = await fetchMetadata(uri);
        endpoints = extractEndpoints(meta);
        agentName = extractAgentName(meta);
        x402 = extractX402Supported(meta, endpoints);
        metaHash = meta ? hashJson(meta) : null;
      }

      const row = {
        token_id: Number(id), // Postgres BIGINT — safe for typical ERC-8004 ids
        owner_address: owner,
        metadata_uri: uri || null,
        agent_name: agentName,
        endpoints: endpoints,
        x402_supported: x402,
        metadata_hash: metaHash,
        chain: CHAIN_NAME,
      };
      rows.push(row);
      if (samples.length < 3) samples.push(row);
      okCount++;
    } catch (err) {
      errCount++;
      if (errCount <= 5) console.warn(`[erc8004-sync] token ${id}: ${err.message}`);
    }

    if (okCount > 0 && okCount % 100 === 0) {
      console.log(`[erc8004-sync] progress: ${okCount}/${ids.length} tokens read…`);
    }
  }

  console.log(`[erc8004-sync] scan complete: ${okCount} ok, ${errCount} errors`);
  console.log(`[erc8004-sync] sample (first ${samples.length}):`);
  console.log(JSON.stringify(samples, null, 2));

  if (isDryRun) {
    console.log(`[erc8004-sync] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE: pull existing token_id + metadata_hash for change tracking
  const existing = new Map();
  {
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('erc8004_registry')
        .select('token_id,metadata_hash')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`Supabase select failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const r of data) existing.set(r.token_id, r);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const now = new Date().toISOString();
  let newCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;

  const upserts = rows.map((r) => {
    const prev = existing.get(r.token_id);
    if (!prev) newCount++;
    else if (prev.metadata_hash !== r.metadata_hash) changedCount++;
    else unchangedCount++;
    const base = { ...r, last_seen_at: now };
    // Only set registered_at on insert; default fires when omitted on new rows.
    if (!prev) base.registered_at = now;
    return base;
  });

  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('erc8004_registry')
      .upsert(batch, { onConflict: 'token_id' });
    if (error) throw new Error(`Upsert batch ${i} failed: ${error.message}`);
  }

  console.log(`[erc8004-sync] Summary:`);
  console.log(`  discovered:   ${allIds.length}`);
  console.log(`  processed:    ${ids.length}`);
  console.log(`  scanned ok:   ${okCount}`);
  console.log(`  errors:       ${errCount}`);
  console.log(`  new:          ${newCount}`);
  console.log(`  changed:      ${changedCount}`);
  console.log(`  unchanged:    ${unchangedCount}`);
}

main().catch((err) => {
  console.error('[erc8004-sync] FATAL:', err.message);
  process.exit(1);
});
