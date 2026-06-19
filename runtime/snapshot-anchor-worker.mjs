#!/usr/bin/env node
/**
 * snapshot-anchor-worker.mjs — make the daily historic record verifiable.
 *
 * Computes the day's Merkle root over agent_snapshots (agent_id|rank|score|is_alive),
 * chains it to the prior day, and stores it in snapshot_anchors. Tamper-evident: any
 * later edit to a past row breaks every chain_hash after it, and /api/verify will catch
 * it by recomputing from live data.
 *
 * Optionally anchors the root on Base (--anchor-onchain) for an immutable external
 * timestamp. That step SPENDS from the CDP wallet, so it is OFF by default and additionally
 * gated by ANCHOR_ENABLED=1 (the CDP wallet secret is pending rotation — do not auto-spend).
 *
 * Daily order on the VPS: record-daily-snapshot -> THIS (so the day's rows exist first).
 *
 *   node runtime/snapshot-anchor-worker.mjs --dry-run [--date YYYY-MM-DD]
 *   node runtime/snapshot-anchor-worker.mjs --write   [--date YYYY-MM-DD] [--anchor-onchain]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { computeDailyRoot, ALGO } from '../src/lib/snapshotHash.js'

const WRITE = process.argv.includes('--write')
const ONCHAIN = process.argv.includes('--anchor-onchain')
const dIdx = process.argv.indexOf('--date')
if (!WRITE && !process.argv.includes('--dry-run')) { console.error('Pass --dry-run or --write'); process.exit(1) }

for (const p of ['/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const DATE = dIdx !== -1 ? process.argv[dIdx + 1] : new Date().toISOString().slice(0, 10)

async function pageAll(table, columns, filterFn) {
  let out = [], from = 0
  for (;;) {
    let q = db.from(table).select(columns).range(from, from + 999)
    if (filterFn) q = filterFn(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out = out.concat(data); if (data.length < 1000) break; from += 1000
  }
  return out
}

// OFF by default; SPENDS real funds. Gated by --anchor-onchain AND ANCHOR_ENABLED=1.
async function anchorOnChain(root) {
  if (process.env.ANCHOR_ENABLED !== '1') {
    console.log('[anchor] on-chain SKIPPED — set ANCHOR_ENABLED=1 to send (CDP wallet pending rotation). Root stored off-chain only.')
    return null
  }
  // Minimal: a 0-value self-tx on Base carrying the 32-byte root in calldata.
  // Implemented against @coinbase/cdp-sdk; intentionally conservative.
  try {
    const { CdpClient } = await import('@coinbase/cdp-sdk')
    const cdp = new CdpClient() // reads CDP_API_KEY_ID / CDP_API_KEY_SECRET / CDP_WALLET_SECRET
    const acct = await cdp.evm.getOrCreateAccount({ name: process.env.ANCHOR_ACCOUNT || 'agentcrush-anchor' })
    const tx = await cdp.evm.sendTransaction({
      address: acct.address,
      network: 'base',
      transaction: { to: acct.address, value: 0n, data: '0x' + root },
    })
    console.log(`[anchor] on-chain tx: ${tx.transactionHash}`)
    return tx.transactionHash
  } catch (e) {
    console.error('[anchor] on-chain FAILED (root still stored off-chain):', e.message)
    return null
  }
}

const run = async () => {
  const rows = await pageAll('agent_snapshots', 'agent_id, rank, score, is_alive', q => q.eq('snapshot_date', DATE))
  if (!rows.length) { console.error(`[anchor] no agent_snapshots for ${DATE} — run record-daily-snapshot first`); process.exit(1) }

  // prior day's chain (most recent anchor strictly before DATE)
  const { data: prev } = await db.from('snapshot_anchors').select('snapshot_date, merkle_root, chain_hash').lt('snapshot_date', DATE).order('snapshot_date', { ascending: false }).limit(1)
  const prevChain = prev?.[0]?.chain_hash || null
  const prevRoot = prev?.[0]?.merkle_root || null

  const { merkle_root, chain_hash, row_count } = computeDailyRoot(rows, prevChain)
  console.log(`[anchor] ${WRITE ? 'WRITE' : 'DRY'} ${DATE} | rows=${row_count} | root=${merkle_root.slice(0, 16)}… | chain=${chain_hash.slice(0, 16)}… | prev=${prevRoot ? prevRoot.slice(0, 12) + '…' : 'GENESIS'}`)
  if (!WRITE) return

  let tx_hash = null, chain = null, anchored_at = null
  if (ONCHAIN) { tx_hash = await anchorOnChain(merkle_root); if (tx_hash) { chain = 'base-mainnet'; anchored_at = new Date().toISOString() } }

  const { error } = await db.from('snapshot_anchors').upsert({
    snapshot_date: DATE, merkle_root, prev_root: prevRoot, chain_hash, row_count, algo: ALGO, tx_hash, chain, anchored_at,
  }, { onConflict: 'snapshot_date' })
  if (error) { console.error('[anchor] write failed:', error.message); process.exit(1) }
  console.log(`[anchor] stored anchor for ${DATE}${tx_hash ? ' (on-chain ' + tx_hash + ')' : ' (off-chain)'}`)
}

run().catch(e => { console.error('[anchor] FATAL', e.message); process.exit(1) })
