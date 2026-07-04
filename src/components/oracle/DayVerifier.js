'use client'

/**
 * DayVerifier — recompute a day's Merkle root in YOUR browser and compare it to
 * the root AgentCrush stored (and anchored on Base). Zero dependencies: the
 * hashing below is WebCrypto only, and is a byte-for-byte reimplementation of
 * src/lib/snapshotHash.js (algo sha256-merkle-v1):
 *
 *   row  = `${agent_id}|${rank}|${score}|${is_alive ? '1' : '0'}`  (null → '')
 *   sort = by agent_id asc
 *   leaf = sha256(row)                          — hex over utf-8 bytes
 *   node = sha256(leftHex + rightHex)           — hash the concatenated HEX STRINGS
 *   odd  = duplicate last node on the level
 */

import { useState } from 'react'

const enc = new TextEncoder()
async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(str))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// identical to canonicalRow() in src/lib/snapshotHash.js
function canonicalRow(r) {
  const score = r.score == null ? '' : String(r.score)
  const rank = r.rank == null ? '' : String(r.rank)
  const alive = r.is_alive == null ? '' : (r.is_alive ? '1' : '0')
  return `${r.agent_id}|${rank}|${score}|${alive}`
}

export default function DayVerifier({ days = [] }) {
  // default to the latest day that made it on-chain; fall back to the latest stored day
  const [date, setDate] = useState(
    (days.find((d) => d.tx_hash) || days[0])?.snapshot_date || ''
  )
  const [state, setState] = useState('idle') // idle | fetching | hashing | done | error
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null)

  async function verify() {
    if (!date || state === 'fetching' || state === 'hashing') return
    setResult(null)
    setState('fetching')
    setProgress('fetching the day’s rows + stored root…')
    try {
      const [rowsRes, anchorRes] = await Promise.all([
        fetch(`/api/verify/rows?date=${date}`),
        fetch(`/api/verify?date=${date}`),
      ])
      const rowsBody = await rowsRes.json()
      const anchorBody = await anchorRes.json()
      if (!rowsRes.ok || !Array.isArray(rowsBody.rows)) throw new Error(rowsBody.error || 'could not fetch rows')
      const storedRoot = anchorBody.stored_root || null
      if (!storedRoot) throw new Error(anchorBody.error || 'no stored anchor for this date yet')

      setState('hashing')
      const rows = [...rowsBody.rows].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))

      // leaves
      const leaves = []
      for (let i = 0; i < rows.length; i++) {
        leaves.push(await sha256Hex(canonicalRow(rows[i])))
        if (i % 200 === 0) setProgress(`hashing leaves… ${i + 1}/${rows.length}`)
      }
      setProgress(`folding Merkle tree over ${leaves.length} leaves…`)

      // binary Merkle root, duplicate last on odd
      let level = leaves.length ? leaves : [await sha256Hex('')]
      while (level.length > 1) {
        const next = []
        for (let i = 0; i < level.length; i += 2) {
          const a = level[i]
          const b = i + 1 < level.length ? level[i + 1] : level[i]
          next.push(await sha256Hex(a + b))
        }
        level = next
      }
      const computed = level[0]

      setResult({
        match: computed === storedRoot,
        computed,
        stored: storedRoot,
        rowCount: rows.length,
        txHash: anchorBody.on_chain?.tx_hash || days.find((d) => d.snapshot_date === date)?.tx_hash || null,
      })
      setState('done')
    } catch (e) {
      setResult({ error: String(e?.message || e) })
      setState('error')
    }
  }

  const busy = state === 'fetching' || state === 'hashing'

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={date}
          onChange={(e) => { setDate(e.target.value); setState('idle'); setResult(null) }}
          className="rounded-lg border border-white/[0.12] bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#39ff14]/50"
        >
          {days.map((d) => (
            <option key={d.snapshot_date} value={d.snapshot_date} className="bg-black">
              {d.snapshot_date}{d.tx_hash ? ' · anchored on Base' : ' · stored'}
            </option>
          ))}
        </select>
        <button
          onClick={verify}
          disabled={busy || !date}
          className="rounded-lg bg-[#39ff14]/90 px-5 py-2.5 font-mono text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
        >
          {busy ? 'Verifying…' : 'Verify this day →'}
        </button>
      </div>

      {busy && (
        <p className="mt-3 font-mono text-[11px] text-white/45 animate-pulse">
          ⟳ {progress}
        </p>
      )}

      {state === 'error' && result?.error && (
        <p className="mt-3 font-mono text-xs text-red-400/80">Could not verify: {result.error}</p>
      )}

      {state === 'done' && result && result.match && (
        <div className="mt-4 rounded-lg border border-[#39ff14]/30 bg-[rgba(57,255,20,0.06)] px-4 py-3">
          <div className="font-mono text-sm font-bold text-[#39ff14]">✓ ROOT MATCHES</div>
          <div className="mt-1 font-mono text-[10px] text-white/50 break-all">
            Your browser hashed {result.rowCount.toLocaleString()} rows and computed{' '}
            <span className="text-white/80">{result.computed}</span> — identical to the stored root.
          </div>
          {result.txHash && (
            <a
              href={`https://basescan.org/tx/${result.txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block font-mono text-[11px] text-[#00d4ff] underline underline-offset-2 hover:brightness-125"
            >
              see it on Base →
            </a>
          )}
        </div>
      )}

      {state === 'done' && result && !result.match && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/[0.06] px-4 py-3">
          <div className="font-mono text-sm font-bold text-red-400">✗ ROOT MISMATCH</div>
          <div className="mt-1 font-mono text-[10px] text-white/50 break-all space-y-1">
            <div>computed: <span className="text-white/80">{result.computed}</span></div>
            <div>stored:&nbsp;&nbsp; <span className="text-white/80">{result.stored}</span></div>
          </div>
          <p className="mt-2 font-mono text-[10px] text-red-300/70">
            This should never happen — it means the stored record and the live data disagree.
            Please tell us: the whole point of this system is that you can catch us.
          </p>
        </div>
      )}
    </div>
  )
}
