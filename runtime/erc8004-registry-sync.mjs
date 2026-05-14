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

// Same contract address is deployed on Base and Ethereum mainnet.
const CONTRACT_ADDRESS = '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432';

// Per-chain config. AgentCrush is protocol-neutral — we index both chains
// without picking favorites.
const CHAINS = {
  base: {
    name: 'base',
    // RPC failover list — tried in order on hard errors (filter errors, etc.)
    rpcs: [
      'https://base-rpc.publicnode.com',
      'https://base.llamarpc.com',
      'https://1rpc.io/base',
      'https://mainnet.base.org',
    ],
    defaultFromBlock: 26000000,
  },
  ethereum: {
    name: 'ethereum',
    rpcs: [
      'https://ethereum-rpc.publicnode.com',
      'https://eth.llamarpc.com',
      'https://1rpc.io/eth',
      'https://eth.drpc.org',
    ],
    defaultFromBlock: 21500000,
  },
};

const RATE_LIMIT_PER_SEC = 50;
const MIN_INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT_PER_SEC); // 20ms
const DEFAULT_WINDOW = 10000; // publicnode caps eth_getLogs around 10k blocks; can grow via flag

// Per-run mutable: set at the start of each chain's run by runChain().
// The helpers below (rpcCall, etc.) close over these.
let RPC_URL = null;
let CHAIN_NAME = null;
let RPC_LIST = [];       // current chain's failover list
let RPC_INDEX = 0;       // which RPC in RPC_LIST is currently in use

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
const RPC_OVERRIDE = argValue('--rpc', null);
const FROM_BLOCK_OVERRIDE = (() => {
  const v = argValue('--from-block');
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
})();
const BLOCK_WINDOW = (() => {
  const v = argValue('--window');
  if (!v) return DEFAULT_WINDOW;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW;
})();

// Which chains to sync. Default: both. --chain base or --chain ethereum to limit.
const CHAIN_FILTER = argValue('--chain', null);
const CHAINS_TO_RUN = CHAIN_FILTER
  ? (CHAINS[CHAIN_FILTER]
      ? [CHAINS[CHAIN_FILTER]]
      : (() => { console.error(`[erc8004-sync] Unknown --chain ${CHAIN_FILTER}. Valid: ${Object.keys(CHAINS).join(', ')}`); process.exit(1); })())
  : Object.values(CHAINS);

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
console.log(`[erc8004-sync] Contract: ${CONTRACT_ADDRESS}`);
console.log(`[erc8004-sync] Chains: ${CHAINS_TO_RUN.map(c => c.name).join(', ')}`);
console.log(`[erc8004-sync] window: ${BLOCK_WINDOW}`);
if (MAX_TOKENS !== Infinity) console.log(`[erc8004-sync] Capping at ${MAX_TOKENS} tokens per chain`);
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
  // Try current RPC, fail over to next on hard errors. Up to RPC_LIST.length attempts.
  let lastErr = null;
  for (let attempt = 0; attempt < RPC_LIST.length; attempt++) {
    await throttle();
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
      });
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
      const body = await res.json();
      if (body.error) throw new Error(`RPC error: ${JSON.stringify(body.error)}`);
      return body.result;
    } catch (err) {
      lastErr = err;
      const msg = String(err.message || '');
      // Hard errors that warrant failover to next RPC endpoint
      const isHard = (
        /internal filter error/i.test(msg) ||
        /method not found/i.test(msg) ||
        /not allowed/i.test(msg) ||
        /forbidden/i.test(msg) ||
        /HTTP 40[0-9]/.test(msg) ||
        /ENOTFOUND/i.test(msg)
      );
      if (isHard && attempt + 1 < RPC_LIST.length) {
        RPC_INDEX = (RPC_INDEX + 1) % RPC_LIST.length;
        RPC_URL = RPC_LIST[RPC_INDEX];
        console.log(`[erc8004-sync][${CHAIN_NAME}] RPC failover -> ${RPC_URL} after: ${msg.slice(0, 80)}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('RPC failed after all failover attempts');
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

// ── Per-chain run ─────────────────────────────────────────────────────────────

async function readCheckpoint(chainName) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('erc8004_sync_state')
    .select('last_scanned_block')
    .eq('chain', chainName)
    .maybeSingle();
  if (error) {
    console.warn(`[erc8004-sync][${chainName}] checkpoint read failed: ${error.message}`);
    return null;
  }
  return data?.last_scanned_block ?? null;
}

async function writeCheckpoint(chainName, contract, rpc, lastScannedBlock, totalTokens, status, errorMsg, durationMs) {
  if (!supabase) return;
  const { error } = await supabase
    .from('erc8004_sync_state')
    .upsert({
      chain: chainName,
      contract_address: contract,
      rpc_url: rpc,
      last_scanned_block: lastScannedBlock,
      total_tokens_seen: totalTokens,
      last_run_at: new Date().toISOString(),
      last_run_status: status,
      last_run_error: errorMsg,
      last_run_duration_ms: durationMs,
    }, { onConflict: 'chain' });
  if (error) {
    console.warn(`[erc8004-sync][${chainName}] checkpoint write failed: ${error.message}`);
  }
}

async function runChain(chainConfig) {
  const startedAt = Date.now();
  CHAIN_NAME = chainConfig.name;
  // Build per-chain RPC failover list. CLI --rpc overrides; if set, it's the
  // only RPC tried.
  RPC_LIST = RPC_OVERRIDE ? [RPC_OVERRIDE] : (chainConfig.rpcs || [chainConfig.rpc]);
  RPC_INDEX = 0;
  RPC_URL = RPC_LIST[0];

  console.log(`\n[erc8004-sync][${CHAIN_NAME}] ── start ──`);
  console.log(`[erc8004-sync][${CHAIN_NAME}] RPC primary: ${RPC_URL}${RPC_LIST.length > 1 ? ` (+${RPC_LIST.length - 1} failovers)` : ''}`);

  // Determine fromBlock priority: --from-block override > checkpoint+1 > default
  let fromBlock;
  if (FROM_BLOCK_OVERRIDE != null) {
    fromBlock = FROM_BLOCK_OVERRIDE;
    console.log(`[erc8004-sync][${CHAIN_NAME}] from-block: ${fromBlock} (override)`);
  } else {
    const checkpoint = await readCheckpoint(CHAIN_NAME);
    if (checkpoint != null) {
      // Resume from one block after the last scanned block. Small safety margin
      // in case of mid-block reorg edge cases.
      fromBlock = Math.max(0, checkpoint - 5);
      console.log(`[erc8004-sync][${CHAIN_NAME}] from-block: ${fromBlock} (resume from checkpoint ${checkpoint})`);
    } else {
      fromBlock = chainConfig.defaultFromBlock;
      console.log(`[erc8004-sync][${CHAIN_NAME}] from-block: ${fromBlock} (default — first run)`);
    }
  }

  let latestBlock;
  try {
    latestBlock = await getBlockNumber();
  } catch (err) {
    console.error(`[erc8004-sync][${CHAIN_NAME}] FATAL fetching latest block: ${err.message}`);
    if (isWrite) {
      await writeCheckpoint(CHAIN_NAME, CONTRACT_ADDRESS, RPC_URL, fromBlock, 0, 'error', err.message, Date.now() - startedAt);
    }
    return { chain: CHAIN_NAME, status: 'error', error: err.message };
  }
  console.log(`[erc8004-sync][${CHAIN_NAME}] latest block: ${latestBlock}`);

  console.log(`[erc8004-sync][${CHAIN_NAME}] Enumerating token IDs from mint logs…`);
  // Enumerate with block tracking so we can record mint_block per token.
  const idToBlock = new Map();
  let allIds;
  try {
    allIds = await enumerateTokenIdsWithBlocks(fromBlock, latestBlock, idToBlock);
  } catch (err) {
    console.error(`[erc8004-sync][${CHAIN_NAME}] enumeration failed: ${err.message}`);
    if (isWrite) {
      await writeCheckpoint(CHAIN_NAME, CONTRACT_ADDRESS, RPC_URL, fromBlock, 0, 'error', err.message, Date.now() - startedAt);
    }
    return { chain: CHAIN_NAME, status: 'error', error: err.message };
  }
  const cap = MAX_TOKENS === Infinity ? allIds.length : Math.min(MAX_TOKENS, allIds.length);
  const ids = allIds.slice(0, cap);
  console.log(`[erc8004-sync][${CHAIN_NAME}] discovered ${allIds.length} unique token IDs (will process ${ids.length})`);

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

      const mintBlock = idToBlock.get(id.toString()) ?? null;

      const row = {
        token_id: Number(id),
        owner_address: owner,
        metadata_uri: uri || null,
        agent_name: agentName,
        endpoints: endpoints,
        x402_supported: x402,
        metadata_hash: metaHash,
        chain: CHAIN_NAME,
        mint_block: mintBlock,
      };
      rows.push(row);
      if (samples.length < 3) samples.push(row);
      okCount++;
    } catch (err) {
      errCount++;
      if (errCount <= 5) console.warn(`[erc8004-sync][${CHAIN_NAME}] token ${id}: ${err.message}`);
    }

    if (okCount > 0 && okCount % 100 === 0) {
      console.log(`[erc8004-sync][${CHAIN_NAME}] progress: ${okCount}/${ids.length} tokens read…`);
    }
  }

  console.log(`[erc8004-sync][${CHAIN_NAME}] scan complete: ${okCount} ok, ${errCount} errors`);
  if (samples.length > 0) {
    console.log(`[erc8004-sync][${CHAIN_NAME}] sample (first ${samples.length}):`);
    console.log(JSON.stringify(samples, null, 2));
  }

  if (isDryRun) {
    console.log(`[erc8004-sync][${CHAIN_NAME}] DRY-RUN complete. No DB writes.`);
    return { chain: CHAIN_NAME, status: 'ok-dryrun', scanned: okCount };
  }

  // WRITE: pull existing token_id + metadata_hash + registered_at for THIS chain only.
  // We need registered_at on existing rows so we can preserve it on upsert
  // (Supabase serializes missing fields as null, violating the NOT NULL constraint).
  const existing = new Map();
  {
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('erc8004_registry')
        .select('token_id,metadata_hash,registered_at')
        .eq('chain', CHAIN_NAME)
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
    // Always include registered_at:
    //   - new rows: now()
    //   - existing rows: the previously-recorded registered_at (so UPDATE doesn't null it)
    const base = {
      ...r,
      last_seen_at: now,
      registered_at: prev?.registered_at || now,
    };
    return base;
  });

  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    let lastErr = null;
    let success = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { error } = await supabase
          .from('erc8004_registry')
          .upsert(batch, { onConflict: 'token_id,chain' });
        if (error) {
          lastErr = new Error(error.message);
        } else {
          success = true;
          break;
        }
      } catch (err) {
        lastErr = err;
      }
      // Backoff: 1s, 2s, 4s, 8s
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`[erc8004-sync][${CHAIN_NAME}] upsert batch ${i} attempt ${attempt + 1}/5 failed: ${lastErr.message.slice(0, 100)} — retrying in ${backoff}ms`);
      await sleep(backoff);
    }
    if (!success) throw new Error(`Upsert batch ${i} failed after 5 attempts: ${lastErr?.message}`);
  }

  // Update checkpoint to latest block scanned successfully.
  await writeCheckpoint(
    CHAIN_NAME,
    CONTRACT_ADDRESS,
    RPC_URL,
    latestBlock,
    okCount,
    errCount > 0 ? 'partial' : 'ok',
    errCount > 0 ? `${errCount} per-token errors` : null,
    Date.now() - startedAt
  );

  console.log(`[erc8004-sync][${CHAIN_NAME}] Summary:`);
  console.log(`  discovered:   ${allIds.length}`);
  console.log(`  processed:    ${ids.length}`);
  console.log(`  scanned ok:   ${okCount}`);
  console.log(`  errors:       ${errCount}`);
  console.log(`  new:          ${newCount}`);
  console.log(`  changed:      ${changedCount}`);
  console.log(`  unchanged:    ${unchangedCount}`);
  console.log(`  checkpoint -> ${latestBlock}`);

  return {
    chain: CHAIN_NAME,
    status: errCount > 0 ? 'partial' : 'ok',
    scanned: okCount,
    errors: errCount,
    newCount,
    changedCount,
    unchangedCount,
  };
}

// Enumerate token IDs while tracking the block each was minted in.
// Returns an array of token IDs (as bigints/strings — same shape as
// enumerateTokenIds) and populates idToBlock map with id->blockNumber.
async function enumerateTokenIdsWithBlocks(fromBlock, latestBlock, idToBlock) {
  const ids = new Set();
  let from = fromBlock;
  let dynamicWindow = BLOCK_WINDOW;
  let consecutiveFailures = 0;

  while (from <= latestBlock) {
    const to = Math.min(from + dynamicWindow - 1, latestBlock);
    let logs;
    try {
      logs = await getMintLogs(from, to);
      consecutiveFailures = 0; // reset on success
    } catch (err) {
      const msg = String(err.message || '');

      // If the RPC declares a hard limit (e.g. "eth_getLogs is limited to 0 - 50 blocks"),
      // and that limit is impractically small (<1000 blocks), failover to next RPC
      // rather than accepting it (50-block windows on 20M-block ranges = 400k calls).
      // For reasonable limits (1000+), adopt them.
      const limitMatch = msg.match(/limited to\s+\d+\s*-?\s*(\d+)\s*blocks?/i);
      if (limitMatch) {
        const declaredLimit = parseInt(limitMatch[1], 10);
        if (declaredLimit < 1000 && RPC_LIST.length > 1) {
          RPC_INDEX = (RPC_INDEX + 1) % RPC_LIST.length;
          RPC_URL = RPC_LIST[RPC_INDEX];
          console.log(`[erc8004-sync][${CHAIN_NAME}] RPC limit too small (${declaredLimit} blocks). Failover -> ${RPC_URL}`);
          await sleep(500);
          continue;
        }
        if (declaredLimit < dynamicWindow) {
          dynamicWindow = Math.max(25, declaredLimit);
          console.log(`[erc8004-sync][${CHAIN_NAME}] RPC declared block limit: ${declaredLimit}. Adopting.`);
          await sleep(500);
          continue;
        }
      }

      // Halve on: explicit range complaints, 5xx, timeouts, generic fetch failures
      const isTransient = (
        /range/i.test(msg) ||
        /50[0-9]/.test(msg) ||
        /timeout/i.test(msg) ||
        /fetch failed/i.test(msg) ||
        /ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(msg) ||
        /limit/i.test(msg)
      );
      if (isTransient && dynamicWindow > 25) {
        dynamicWindow = Math.max(25, Math.floor(dynamicWindow / 2));
        console.log(`[erc8004-sync][${CHAIN_NAME}] window shrunk to ${dynamicWindow} after: ${msg.slice(0, 80)}`);
        await sleep(1000);
        continue;
      }
      if (isTransient) {
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          throw new Error(`Persistent RPC failures after window shrunk to ${dynamicWindow}: ${msg}`);
        }
        console.log(`[erc8004-sync][${CHAIN_NAME}] transient (try ${consecutiveFailures}/5): ${msg.slice(0, 80)} — sleeping 3s`);
        await sleep(3000);
        continue;
      }
      throw err;
    }
    for (const log of logs) {
      const idHex = log.topics?.[3];
      if (!idHex) continue;
      const id = BigInt(idHex).toString();
      ids.add(id);
      const blockNum = parseInt(log.blockNumber, 16);
      if (!idToBlock.has(id) || blockNum < idToBlock.get(id)) {
        idToBlock.set(id, blockNum);
      }
    }
    from = to + 1;
  }

  return [...ids];
}

async function main() {
  const results = [];
  for (const chain of CHAINS_TO_RUN) {
    try {
      const result = await runChain(chain);
      results.push(result);
    } catch (err) {
      console.error(`[erc8004-sync][${chain.name}] runChain crashed: ${err.message}`);
      results.push({ chain: chain.name, status: 'error', error: err.message });
    }
  }

  console.log(`\n[erc8004-sync] ── done ── ${results.length} chain(s)`);
  for (const r of results) {
    console.log(`  ${r.chain}: ${r.status}${r.scanned != null ? ` (${r.scanned} scanned)` : ''}${r.error ? ' — ' + r.error : ''}`);
  }
}

main().catch((err) => {
  console.error('[erc8004-sync] FATAL:', err.message);
  process.exit(1);
});
