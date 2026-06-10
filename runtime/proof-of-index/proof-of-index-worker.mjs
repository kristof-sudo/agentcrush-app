/**
 * Proof-of-Index worker (B15)
 *
 * Nightly, after the snapshot run:
 *   1. Pull the latest day's rows from agent_snapshots (the live daily table;
 *      agent_daily_snapshots went stale 2026-05-15)
 *   2. Canonicalize (sorted keys, sorted rows) → SHA-256 digest
 *   3. Upsert proof_of_index row (status pending)
 *   4. Post a 0-value self-transaction on Base with the digest as calldata
 *      via the CDP server wallet, then mark the row posted
 *
 * Degrades gracefully: without CDP credentials the digest is still computed
 * and stored (status stays pending) — notarization catches up when creds land.
 *
 * Env (in /opt/agentcrush/fetchers/.env or local .env):
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET   (optional → pending)
 *   PROOF_OF_INDEX_NETWORK (default "base")
 *
 * Schedule: ops/systemd/agentcrush-proof-of-index.timer (00:15 UTC daily,
 * 25 min after the 23:50 snapshot worker).
 */

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NETWORK = process.env.PROOF_OF_INDEX_NETWORK || 'base'
const CHAIN_ID = NETWORK === 'base' ? 'eip155:8453' : `evm:${NETWORK}`
const SELF_ADDRESS = '0x58e632Fa698383820FFC22156352C9836790E2c0'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[proof-of-index] FATAL: Supabase env missing')
  process.exit(2)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

async function latestSnapshotDate() {
  const { data, error } = await sb
    .from('agent_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`snapshot date query failed: ${error.message}`)
  return data?.snapshot_date ?? null
}

async function fetchDayRows(date) {
  // Page through the day's snapshots deterministically
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('agent_snapshots')
      .select('*')
      .eq('snapshot_date', date)
      .order('agent_id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`snapshot rows query failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

async function notarize(digestHex) {
  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
    console.log('[proof-of-index] CDP credentials missing — digest stored, notarization pending')
    return null
  }
  const { CdpClient } = await import('@coinbase/cdp-sdk')
  const cdp = new CdpClient()
  const result = await cdp.evm.sendTransaction({
    address: SELF_ADDRESS,
    transaction: {
      to: SELF_ADDRESS,
      value: 0n,
      data: `0x${digestHex}`,
    },
    network: NETWORK,
  })
  return result.transactionHash
}

async function main() {
  const date = await latestSnapshotDate()
  if (!date) {
    console.log('[proof-of-index] No snapshots found — nothing to do')
    return
  }

  // Idempotency: already posted for this date → done
  const { data: existing } = await sb
    .from('proof_of_index')
    .select('status, digest_sha256')
    .eq('snapshot_date', date)
    .maybeSingle()
  if (existing?.status === 'posted') {
    console.log(`[proof-of-index] ${date} already posted — done`)
    return
  }

  let digestHex = existing?.digest_sha256
  if (!digestHex) {
    const rows = await fetchDayRows(date)
    if (rows.length === 0) {
      console.log(`[proof-of-index] ${date}: 0 rows — skipping`)
      return
    }
    digestHex = createHash('sha256').update(canonicalize(rows), 'utf8').digest('hex')
    const { error } = await sb.from('proof_of_index').upsert({
      snapshot_date: date,
      digest_sha256: digestHex,
      record_count: rows.length,
      chain: CHAIN_ID,
      status: 'pending',
    })
    if (error) throw new Error(`proof_of_index upsert failed: ${error.message}`)
    console.log(`[proof-of-index] ${date}: digest ${digestHex.slice(0, 16)}… over ${rows.length} rows`)
  }

  try {
    const txHash = await notarize(digestHex)
    if (txHash) {
      await sb.from('proof_of_index').update({
        tx_hash: txHash,
        posted_at: new Date().toISOString(),
        status: 'posted',
      }).eq('snapshot_date', date)
      console.log(`[proof-of-index] ${date}: notarized on ${NETWORK} — ${txHash}`)
    }
  } catch (err) {
    await sb.from('proof_of_index').update({ status: 'failed' }).eq('snapshot_date', date)
    console.error(`[proof-of-index] ${date}: notarization failed — ${err.message ?? err}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[proof-of-index] Unexpected error:', err)
  process.exit(1)
})
