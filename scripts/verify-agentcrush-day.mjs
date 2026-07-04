#!/usr/bin/env node
/**
 * verify-agentcrush-day.mjs — independently verify AgentCrush's daily Merkle anchor.
 *
 * Standalone: no dependencies, no repo imports. Copy this file anywhere and run:
 *
 *   node verify-agentcrush-day.mjs 2026-07-03
 *   node verify-agentcrush-day.mjs 2026-07-03 https://agentcrush.xyz   # custom base URL
 *
 * It fetches the day's raw rows (/api/verify/rows) and the stored/anchored root
 * (/api/verify), recomputes the root locally (algo sha256-merkle-v1), and prints
 * MATCH or MISMATCH. If a Base tx hash exists, the same root sits in that tx's
 * calldata: https://basescan.org/tx/<tx_hash>
 */

import { createHash } from 'node:crypto'

const date = process.argv[2]
const base = (process.argv[3] || 'https://agentcrush.xyz').replace(/\/$/, '')
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: node verify-agentcrush-day.mjs YYYY-MM-DD [baseUrl]')
  process.exit(1)
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

// canonical row string — must match AgentCrush's published recipe exactly
const canonicalRow = (r) => {
  const score = r.score == null ? '' : String(r.score)
  const rank = r.rank == null ? '' : String(r.rank)
  const alive = r.is_alive == null ? '' : (r.is_alive ? '1' : '0')
  return `${r.agent_id}|${rank}|${score}|${alive}`
}

// binary Merkle root over hex leaf hashes; duplicate last on odd levels
const merkleRoot = (leaves) => {
  if (!leaves.length) return sha256('')
  let level = [...leaves]
  while (level.length > 1) {
    const next = []
    for (let i = 0; i < level.length; i += 2) next.push(sha256(level[i] + (level[i + 1] ?? level[i])))
    level = next
  }
  return level[0]
}

const get = async (path) => {
  const res = await fetch(base + path)
  const body = await res.json()
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${body.error || 'request failed'}`)
  return body
}

const [rowsBody, anchor] = await Promise.all([get(`/api/verify/rows?date=${date}`), get(`/api/verify?date=${date}`)])
const stored = anchor.stored_root
if (!stored) { console.error(`No stored anchor for ${date} yet (server says: ${anchor.note || anchor.error || '—'})`); process.exit(1) }

const rows = [...rowsBody.rows].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))
const computed = merkleRoot(rows.map((r) => sha256(canonicalRow(r))))

console.log(`date:      ${date}  (${rows.length} rows, algo ${rowsBody.algo})`)
console.log(`computed:  ${computed}`)
console.log(`stored:    ${stored}`)
if (anchor.on_chain?.tx_hash) console.log(`on Base:   https://basescan.org/tx/${anchor.on_chain.tx_hash}`)
if (computed === stored) { console.log('RESULT:    MATCH — the record is exactly what was committed.') }
else { console.log('RESULT:    MISMATCH — the stored record and the live data disagree. Please report this.'); process.exit(2) }
