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
 * K13 — data availability: after anchoring, the day's canonical rows are serialized to a
 * deterministic JSON file ({date, algo, merkle_root, count, rows} sorted by agent_id),
 * sha256'd, written to /var/log/agentcrush/snapshot-archive/<date>.json, and — if
 * ARWEAVE_JWK is set — uploaded to Arweave so the anchor is independently checkable
 * forever. Archive refs (arweave_tx, archive_sha256) are written back to snapshot_anchors
 * (requires migration 20260704_1000_proof_archive_refs.sql; probes and degrades until then).
 * The archive step NEVER throws past the anchor: any failure logs and continues.
 *
 * Daily order on the VPS: record-daily-snapshot -> THIS (so the day's rows exist first).
 *
 *   node runtime/snapshot-anchor-worker.mjs --dry-run [--date YYYY-MM-DD]
 *   node runtime/snapshot-anchor-worker.mjs --write   [--date YYYY-MM-DD] [--anchor-onchain]
 *   node runtime/snapshot-anchor-worker.mjs --archive-only --date YYYY-MM-DD --dry-run|--write   # backfill archives for already-anchored days
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { computeDailyRoot, canonicalRow, ALGO } from '../src/lib/snapshotHash.js'

const WRITE = process.argv.includes('--write')
const ONCHAIN = process.argv.includes('--anchor-onchain')
const ARCHIVE_ONLY = process.argv.includes('--archive-only')
const dateArg = process.argv.find(a => a.startsWith('--date'))
if (!WRITE && !process.argv.includes('--dry-run')) { console.error('Pass --dry-run or --write'); process.exit(1) }

for (const p of ['/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// Default to YESTERDAY (UTC): today's snapshot rank/score is still mutated hourly by the
// blended-rankings pg_cron (it refreshes current_date), so today is not yet final. We
// anchor the last finalized day, which pg_cron no longer touches — so /api/verify stays
// consistent. Override with --date for backfills.
const yesterday = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) }
const DATE = dateArg ? (dateArg.includes('=') ? dateArg.split('=')[1] : process.argv[process.argv.indexOf(dateArg) + 1]) : yesterday()

const ARCHIVE_DIR = process.env.SNAPSHOT_ARCHIVE_DIR || '/var/log/agentcrush/snapshot-archive'
const sha256 = (s) => createHash('sha256').update(s).digest('hex')
const isMissingColumn = (e) => e?.code === '42703' || (typeof e?.message === 'string' && e.message.includes('does not exist'))

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

// Deterministic archive payload: the EXACT canonical strings the Merkle leaves hash —
// anyone can rebuild the root from this file alone with the /api/verify recipe.
function buildArchive(rows, merkle_root) {
  const sorted = [...rows].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))
  const json = JSON.stringify({ date: DATE, algo: ALGO, merkle_root, count: sorted.length, rows: sorted.map(canonicalRow) })
  return { json, archive_sha256: sha256(json) }
}

// Uploads the archive JSON to Arweave. Wallet funding is a Kris step — until ARWEAVE_JWK
// is set this logs and returns null (the local fallback file + sha256 still happen).
async function uploadToArweave(json) {
  if (!process.env.ARWEAVE_JWK) {
    console.log('[archive] Arweave upload SKIPPED — set ARWEAVE_JWK (funded wallet JSON) to enable. Local fallback + sha256 still recorded.')
    return null
  }
  const Arweave = (await import('arweave')).default
  const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' })
  const jwk = JSON.parse(process.env.ARWEAVE_JWK)
  const tx = await arweave.createTransaction({ data: json }, jwk)
  tx.addTag('Content-Type', 'application/json')
  tx.addTag('App-Name', 'AgentCrush')
  tx.addTag('Type', 'snapshot-archive')
  tx.addTag('Snapshot-Date', DATE)
  await arweave.transactions.sign(tx, jwk)
  const res = await arweave.transactions.post(tx)
  if (res.status >= 300) throw new Error(`arweave post HTTP ${res.status}`)
  console.log(`[archive] Arweave tx: ${tx.id}`)
  return tx.id
}

// K13 archive step. MUST NOT throw past the anchor: every failure logs and returns —
// the existing anchor path is complete before this runs and is never affected by it.
async function archiveDay(rows, merkle_root) {
  try {
    const { json, archive_sha256 } = buildArchive(rows, merkle_root)
    if (!WRITE) { console.log(`[archive] DRY ${DATE} | would archive rows=${rows.length} bytes=${json.length} sha256=${archive_sha256} | arweave=${process.env.ARWEAVE_JWK ? 'ready' : 'no ARWEAVE_JWK'}`); return }

    // (e) local fallback ALWAYS — even if Arweave/DB fail, the exact bytes survive on disk
    try {
      await mkdir(ARCHIVE_DIR, { recursive: true })
      await writeFile(`${ARCHIVE_DIR}/${DATE}.json`, json)
      console.log(`[archive] local fallback: ${ARCHIVE_DIR}/${DATE}.json (${json.length} bytes)`)
    } catch (e) { console.error('[archive] local fallback write FAILED (continuing):', e.message) }

    let arweave_tx = null
    try { arweave_tx = await uploadToArweave(json) } catch (e) { console.error('[archive] Arweave upload FAILED (continuing):', e.message) }

    const { error } = await db.from('snapshot_anchors').update({ archive_sha256, ...(arweave_tx ? { arweave_tx } : {}) }).eq('snapshot_date', DATE)
    if (error) {
      if (isMissingColumn(error)) console.log('[archive] snapshot_anchors is missing archive columns — apply migrations/20260704_1000_proof_archive_refs.sql (archive file + sha256 still produced).')
      else console.error('[archive] ref writeback FAILED (continuing):', error.message)
      return
    }
    console.log(`[archive] stored refs for ${DATE} | sha256=${archive_sha256.slice(0, 16)}…${arweave_tx ? ' | arweave=' + arweave_tx : ''}`)
  } catch (e) {
    console.error('[archive] step FAILED (anchor unaffected):', e.message)
  }
}

// --archive-only: (re)archive an already-anchored day, e.g. backfills. Refuses to archive
// rows that no longer match the stored root — the archive must be the anchored truth.
async function runArchiveOnly() {
  const rows = await pageAll('agent_snapshots', 'agent_id, rank, score, is_alive', q => q.eq('snapshot_date', DATE))
  if (!rows.length) { console.error(`[archive] no agent_snapshots for ${DATE}`); process.exit(1) }
  const { data: anchorRows, error } = await db.from('snapshot_anchors').select('merkle_root, row_count').eq('snapshot_date', DATE).limit(1)
  if (error) { console.error('[archive] anchor lookup failed:', error.message); process.exit(1) }
  const anchor = anchorRows?.[0]
  if (!anchor) { console.error(`[archive] no snapshot_anchors row for ${DATE} — anchor first (run without --archive-only)`); process.exit(1) }
  const recomputed = computeDailyRoot(rows, null).merkle_root
  if (recomputed !== anchor.merkle_root) { console.error(`[archive] ROOT MISMATCH for ${DATE}: live rows recompute to ${recomputed.slice(0, 16)}… but anchor stores ${anchor.merkle_root.slice(0, 16)}… — refusing to archive`); process.exit(1) }
  console.log(`[archive] ${WRITE ? 'WRITE' : 'DRY'} ${DATE} | rows=${rows.length} match stored anchor root ${anchor.merkle_root.slice(0, 16)}…`)
  await archiveDay(rows, anchor.merkle_root)
}

const run = async () => {
  if (ARCHIVE_ONLY) return runArchiveOnly()

  const rows = await pageAll('agent_snapshots', 'agent_id, rank, score, is_alive', q => q.eq('snapshot_date', DATE))
  if (!rows.length) { console.error(`[anchor] no agent_snapshots for ${DATE} — run record-daily-snapshot first`); process.exit(1) }

  // prior day's chain (most recent anchor strictly before DATE)
  const { data: prev } = await db.from('snapshot_anchors').select('snapshot_date, merkle_root, chain_hash').lt('snapshot_date', DATE).order('snapshot_date', { ascending: false }).limit(1)
  const prevChain = prev?.[0]?.chain_hash || null
  const prevRoot = prev?.[0]?.merkle_root || null

  const { merkle_root, chain_hash, row_count } = computeDailyRoot(rows, prevChain)
  console.log(`[anchor] ${WRITE ? 'WRITE' : 'DRY'} ${DATE} | rows=${row_count} | root=${merkle_root.slice(0, 16)}… | chain=${chain_hash.slice(0, 16)}… | prev=${prevRoot ? prevRoot.slice(0, 12) + '…' : 'GENESIS'}`)
  if (!WRITE) { await archiveDay(rows, merkle_root); return }

  let tx_hash = null, chain = null, anchored_at = null
  if (ONCHAIN) { tx_hash = await anchorOnChain(merkle_root); if (tx_hash) { chain = 'base-mainnet'; anchored_at = new Date().toISOString() } }

  const { error } = await db.from('snapshot_anchors').upsert({
    snapshot_date: DATE, merkle_root, prev_root: prevRoot, chain_hash, row_count, algo: ALGO, tx_hash, chain, anchored_at,
  }, { onConflict: 'snapshot_date' })
  if (error) { console.error('[anchor] write failed:', error.message); process.exit(1) }
  console.log(`[anchor] stored anchor for ${DATE}${tx_hash ? ' (on-chain ' + tx_hash + ')' : ' (off-chain)'}`)

  // K13: archive AFTER the anchor is safely stored — archiveDay never throws.
  await archiveDay(rows, merkle_root)
}

run().catch(e => { console.error('[anchor] FATAL', e.message); process.exit(1) })
