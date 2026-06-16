/**
 * x402 payer scan worker (B23 — step 2).
 *
 * Daily incremental scan of Base USDC Transfer logs for transfers to x402 payTo
 * addresses in the Coinbase CDP Bazaar index. Findings are upserted to the
 * x402_payers table and written to brain/Fetchers/ for the morning brief.
 *
 * Architecture assumption (from topology-checker.mjs): x402 settlement on Base
 * is DIRECT — buyer EOA → payTo via USDC Transfer. Re-run the topology checker
 * if this assumption needs revisiting; if settlement is mediated, the payTo
 * filter changes to the facilitator contract address.
 *
 * Scan is incremental: each run continues from the last scanned block stored
 * in the state file. First run defaults to 1 day back (~43,200 Base blocks).
 *
 * Usage:
 *   node runtime/x402-payer-scan-worker.mjs --dry-run [--days 7]
 *   node runtime/x402-payer-scan-worker.mjs --write
 *   node runtime/x402-payer-scan-worker.mjs --write --days 7   # rescan 7 days
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode: required)
 *   BASE_RPC_URL     — defaults to https://mainnet.base.org
 *   X402_STATE_FILE  — path for scan-state JSON (default: /opt/agentcrush/x402-scan-state.json)
 */

import { createClient }    from '@supabase/supabase-js'
import { createWriteStream } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

// ── Config ───────────────────────────────────────────────────────────────────

const USDC_BASE       = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
const TRANSFER_TOPIC  = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const BAZAAR_ENDPOINT = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources'
const RPC             = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
const STATE_FILE      = process.env.X402_STATE_FILE || '/opt/agentcrush/x402-scan-state.json'
const BLOCKS_PER_CHUNK = 2000  // public Base RPC limit per eth_getLogs call
const BATCH_PAY_TO    = 200    // max payTo addresses per eth_getLogs topics filter
const BLOCKS_PER_DAY  = 43_200 // ~2s block time on Base

const SB_URL  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

// ── CLI args ─────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2)
const isDry  = args.includes('--dry-run')
const isWrit = args.includes('--write')
const daysArg = args[args.indexOf('--days') + 1]
const LOOKBACK_DAYS = daysArg ? parseInt(daysArg, 10) : 1

if (!isDry && !isWrit) {
  console.error('[x402-payer-scan] Must specify --dry-run or --write')
  process.exit(1)
}
if (isDry && isWrit) {
  console.error('[x402-payer-scan] Cannot combine --dry-run and --write')
  process.exit(1)
}

const MODE = isDry ? 'DRY-RUN' : 'WRITE'
console.log(`[x402-payer-scan] Mode: ${MODE}  RPC: ${RPC}`)

// ── RPC helpers ──────────────────────────────────────────────────────────────

let _rpcId = 1
async function rpc(method, params, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500 * attempt))
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: _rpcId++, method, params }),
    })
    if (res.status === 429) {
      console.warn(`[x402-payer-scan] Rate-limited, retry ${attempt + 1}/${retries}`)
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      continue
    }
    const body = await res.json()
    if (body.error) {
      // eth_getLogs block range too large: shrink and retry
      if (body.error.code === -32005 || body.error.message?.includes('block range')) throw new RangeError(body.error.message)
      throw new Error(`RPC ${method}: ${body.error.message}`)
    }
    return body.result
  }
  throw new Error(`[x402-payer-scan] RPC ${method} failed after ${retries} retries`)
}

function padAddr(addr) {
  return '0x' + addr.replace(/^0x/, '').toLowerCase().padStart(64, '0')
}
function unpadAddr(topic) {
  return '0x' + topic.slice(-40).toLowerCase()
}
function usdcUnits(data) {
  // returns NUMERIC(20,6) string — USDC has 6 decimals
  const raw = BigInt(data)
  return (Number(raw) / 1_000_000).toFixed(6)
}

// ── Bazaar payTo discovery ───────────────────────────────────────────────────

async function fetchBasePayTo() {
  console.log('[x402-payer-scan] Fetching active Base payTo addresses from CDP Bazaar…')
  const payToMap = new Map()  // payTo (lowercase) → resource_url
  let offset = 0
  let totalFetched = 0
  for (let page = 0; page < 50; page++) {
    const res = await fetch(`${BAZAAR_ENDPOINT}?limit=1000&offset=${offset}`)
    if (!res.ok) {
      console.warn(`[x402-payer-scan] Bazaar API ${res.status} at offset ${offset}`)
      break
    }
    const body = await res.json()
    const items = body.items || []
    for (const r of items) {
      const quality = r.extensions?.bazaar?.quality || r.quality || {}
      const calls = +(quality.l30DaysTotalCalls || 0)
      if (calls <= 0) continue
      for (const acc of r.accepts || []) {
        if ((acc.network === 'eip155:8453' || acc.network === 'base') && acc.payTo) {
          const addr = acc.payTo.toLowerCase()
          if (!payToMap.has(addr)) payToMap.set(addr, r.resource || r.resource_url || null)
        }
      }
    }
    totalFetched += items.length
    offset += items.length
    if (!items.length || offset >= (body.pagination?.total || 0)) break
  }
  console.log(`[x402-payer-scan] ${payToMap.size} unique active Base payTo addresses from ${totalFetched} Bazaar resources`)
  return payToMap
}

// ── Scan state ───────────────────────────────────────────────────────────────

async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveState(state) {
  await mkdir(path.dirname(STATE_FILE), { recursive: true })
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2))
}

// ── Block range scan ─────────────────────────────────────────────────────────

async function scanRange(fromBlock, toBlock, payToMap, payToBatches) {
  const found = []
  for (let from = fromBlock; from <= toBlock; from += BLOCKS_PER_CHUNK) {
    const to = Math.min(from + BLOCKS_PER_CHUNK - 1, toBlock)
    for (const batch of payToBatches) {
      let logs
      try {
        logs = await rpc('eth_getLogs', [{
          address: USDC_BASE,
          topics: [TRANSFER_TOPIC, null, batch.map(padAddr)],
          fromBlock: '0x' + from.toString(16),
          toBlock:   '0x' + to.toString(16),
        }])
      } catch (err) {
        console.warn(`[x402-payer-scan] getLogs error (${from}-${to}): ${err.message} — skipping chunk`)
        continue
      }
      for (const log of logs || []) {
        const to_addr   = unpadAddr(log.topics[2])
        const from_addr = unpadAddr(log.topics[1])
        found.push({
          payer_wallet:   from_addr,
          payee_address:  to_addr,
          resource_url:   payToMap.get(to_addr) || null,
          tx_hash:        log.transactionHash,
          block_number:   parseInt(log.blockNumber, 16),
          amount_usdc:    usdcUnits(log.data),
          network:        'eip155:8453',
        })
      }
    }
    if (from % (BLOCKS_PER_CHUNK * 10) === 0 || from === fromBlock) {
      console.log(`[x402-payer-scan] Scanned up to block ${to} (${Math.round(((to - fromBlock) / (toBlock - fromBlock)) * 100)}%)`)
    }
  }
  return found
}

// ── Supabase write ───────────────────────────────────────────────────────────

async function writeToSupabase(rows) {
  if (!SB_URL || !SB_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

  // Resolve block timestamps in batches (optional enrichment — skip on error)
  const blockToTs = new Map()
  const blockNums = [...new Set(rows.map(r => r.block_number))].slice(0, 200)
  await Promise.all(blockNums.map(async bn => {
    try {
      const blk = await rpc('eth_getBlockByNumber', ['0x' + bn.toString(16), false])
      if (blk?.timestamp) blockToTs.set(bn, new Date(parseInt(blk.timestamp, 16) * 1000).toISOString())
    } catch { /* non-fatal */ }
  }))

  const toUpsert = rows.map(r => ({
    ...r,
    tx_timestamp: blockToTs.get(r.block_number) || null,
  }))

  const PAGE = 500
  let inserted = 0
  for (let i = 0; i < toUpsert.length; i += PAGE) {
    const { error } = await sb.from('x402_payers').upsert(toUpsert.slice(i, i + PAGE), {
      onConflict: 'tx_hash',
      ignoreDuplicates: false,
    })
    if (error) throw new Error(`x402_payers upsert failed: ${error.message}`)
    inserted += Math.min(PAGE, toUpsert.length - i)
  }
  return inserted
}

// ── Brain Fetchers JSON export ───────────────────────────────────────────────

async function exportForBrain(rows, fromBlock, toBlock) {
  // Aggregate by payer wallet: total_paid, unique_payees, tx_count
  const byPayer = new Map()
  for (const r of rows) {
    const p = byPayer.get(r.payer_wallet) || { payer_wallet: r.payer_wallet, tx_count: 0, total_usdc: 0, payees: new Set() }
    p.tx_count++
    p.total_usdc += parseFloat(r.amount_usdc)
    p.payees.add(r.payee_address)
    byPayer.set(r.payer_wallet, p)
  }
  const topPayers = [...byPayer.values()]
    .map(p => ({ ...p, total_usdc: +p.total_usdc.toFixed(6), unique_payees: p.payees.size, payees: undefined }))
    .sort((a, b) => b.total_usdc - a.total_usdc)
    .slice(0, 50)

  const byPayee = new Map()
  for (const r of rows) {
    const p = byPayee.get(r.payee_address) || { payee_address: r.payee_address, resource_url: r.resource_url, tx_count: 0, total_usdc: 0, payers: new Set() }
    p.tx_count++
    p.total_usdc += parseFloat(r.amount_usdc)
    p.payers.add(r.payer_wallet)
    byPayee.set(r.payee_address, p)
  }
  const topPayees = [...byPayee.values()]
    .map(p => ({ ...p, total_usdc: +p.total_usdc.toFixed(6), unique_payers: p.payers.size, payers: undefined }))
    .sort((a, b) => b.unique_payers - a.unique_payers)
    .slice(0, 50)

  const report = {
    generated_at: new Date().toISOString(),
    scan_range: { from_block: fromBlock, to_block: toBlock },
    totals: {
      transfers_found: rows.length,
      unique_payers: byPayer.size,
      unique_payees: byPayee.size,
      total_usdc_volume: +(rows.reduce((s, r) => s + parseFloat(r.amount_usdc), 0).toFixed(6)),
    },
    top_payers: topPayers,
    top_payees: topPayees,
  }
  return report
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch payTo addresses
  const payToMap = await fetchBasePayTo()
  if (payToMap.size === 0) {
    console.log('[x402-payer-scan] No active Base payTo addresses — nothing to scan')
    return
  }

  // Batch payTo addresses for eth_getLogs
  const payToAddrs = [...payToMap.keys()]
  const payToBatches = []
  for (let i = 0; i < payToAddrs.length; i += BATCH_PAY_TO) {
    payToBatches.push(payToAddrs.slice(i, i + BATCH_PAY_TO))
  }
  console.log(`[x402-payer-scan] ${payToBatches.length} batches of up to ${BATCH_PAY_TO} payTo addresses`)

  // 2. Determine scan range
  const state = await loadState()
  const currentBlockHex = await rpc('eth_blockNumber', [])
  const currentBlock = parseInt(currentBlockHex, 16)
  const defaultStart = currentBlock - LOOKBACK_DAYS * BLOCKS_PER_DAY
  const fromBlock = state.lastBlock ? state.lastBlock + 1 : defaultStart
  const toBlock = currentBlock

  if (fromBlock > toBlock) {
    console.log(`[x402-payer-scan] Already up to date (last: ${state.lastBlock}, current: ${currentBlock})`)
    return
  }

  const blocksToScan = toBlock - fromBlock + 1
  const chunkCount = Math.ceil(blocksToScan / BLOCKS_PER_CHUNK)
  console.log(`[x402-payer-scan] Scanning ${blocksToScan.toLocaleString()} blocks (${fromBlock}–${toBlock}) in ${chunkCount} chunks × ${payToBatches.length} batches`)

  // 3. Scan
  const rows = await scanRange(fromBlock, toBlock, payToMap, payToBatches)
  console.log(`[x402-payer-scan] Found ${rows.length} USDC transfers to known payTo addresses`)

  // 4. Deduplicate
  const seen = new Set()
  const unique = rows.filter(r => {
    if (seen.has(r.tx_hash)) return false
    seen.add(r.tx_hash)
    return true
  })
  if (unique.length < rows.length) console.log(`[x402-payer-scan] Deduped to ${unique.length} unique txs`)

  // 5. Build brain report
  const report = await exportForBrain(unique, fromBlock, toBlock)

  if (isDry) {
    console.log('\n[x402-payer-scan] DRY-RUN summary:')
    console.log(JSON.stringify(report, null, 2))
    console.log('[x402-payer-scan] No writes performed.')
    return
  }

  // 6. Write to Supabase
  if (unique.length > 0) {
    console.log('[x402-payer-scan] Writing to Supabase x402_payers…')
    const upserted = await writeToSupabase(unique)
    console.log(`[x402-payer-scan] Upserted ${upserted} rows`)
  } else {
    console.log('[x402-payer-scan] No new payer txs to write')
  }

  // 7. Save scan state
  await saveState({ lastBlock: toBlock, lastRunAt: new Date().toISOString() })
  console.log(`[x402-payer-scan] State saved: lastBlock=${toBlock}`)

  // 8. Optionally export brain JSON
  const brainPath = process.env.BRAIN_PATH
    ? path.join(process.env.BRAIN_PATH, 'Fetchers', `x402-payers-${new Date().toISOString().slice(0, 10)}.json`)
    : null
  if (brainPath) {
    await mkdir(path.dirname(brainPath), { recursive: true })
    await writeFile(brainPath, JSON.stringify(report, null, 2))
    console.log(`[x402-payer-scan] Brain export: ${brainPath}`)
  }

  console.log('\n[x402-payer-scan] Done.')
  console.log(`  Transfers found  : ${unique.length}`)
  console.log(`  Unique payers    : ${report.totals.unique_payers}`)
  console.log(`  Unique payees    : ${report.totals.unique_payees}`)
  console.log(`  Total USDC vol   : ${report.totals.total_usdc_volume} USDC`)
}

main().catch(err => {
  console.error('[x402-payer-scan] Fatal:', err.message || err)
  process.exit(1)
})
