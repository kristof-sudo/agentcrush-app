/**
 * GET /api/verify — verify AgentCrush's historic record is unaltered.
 *
 *   /api/verify              → recent daily anchors + how verification works
 *   /api/verify?date=YYYY-MM-DD → recompute that day's Merkle root from the LIVE
 *                                 snapshot rows and compare to the stored/anchored root.
 *                                 verified:true means the day's record is byte-identical
 *                                 to what we committed (and, if tx_hash present, anchored
 *                                 on Base). Anyone can reproduce this with the same recipe.
 *
 * FREE, CORS-open. Requires migration 20260619_1400_snapshot_anchors.sql.
 */

import { createClient } from '@supabase/supabase-js'
import { computeDailyRoot, ALGO, canonicalRow } from '@/lib/snapshotHash'

export const runtime = 'nodejs'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }

async function snapshotRows(supabase, date) {
  let out = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from('agent_snapshots').select('agent_id, rank, score, is_alive').eq('snapshot_date', date).range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    out = out.concat(data); if (data.length < 1000) break; from += 1000
  }
  return out
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const supabase = db()
  const ok = (body) => Response.json(body, { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=120' } })

  try {
    if (!date) {
      const { data } = await supabase.from('snapshot_anchors').select('snapshot_date, merkle_root, chain_hash, row_count, tx_hash, chain, anchored_at').order('snapshot_date', { ascending: false }).limit(10)
      return ok({
        what: 'AgentCrush publishes a daily Merkle root over every snapshot (agent_id|rank|score|is_alive), chained day-to-day and optionally anchored on Base. Recompute it yourself.',
        recipe: { fields: 'agent_id|rank|score|is_alive', sort: 'by agent_id asc', leaf: 'sha256(row)', root: 'binary merkle (duplicate last on odd)', chain: 'sha256(prev_chain_hash + merkle_root)', algo: ALGO },
        verify_a_day: '/api/verify?date=YYYY-MM-DD',
        recent: data || [],
      })
    }

    const { data: anchorRows } = await supabase.from('snapshot_anchors').select('*').eq('snapshot_date', date).limit(1)
    const anchor = anchorRows?.[0]
    const rows = await snapshotRows(supabase, date)
    if (!rows.length) return Response.json({ date, error: 'no snapshot for that date' }, { status: 404, headers: CORS })

    const prevChain = anchor?.prev_root
      ? (await supabase.from('snapshot_anchors').select('chain_hash').eq('merkle_root', anchor.prev_root).limit(1)).data?.[0]?.chain_hash || null
      : null
    const recomputed = computeDailyRoot(rows, prevChain)

    if (!anchor) {
      return ok({ date, anchored: false, note: 'No stored anchor for this date yet; showing the root computed from live data.', computed: recomputed })
    }
    const verified = anchor.merkle_root === recomputed.merkle_root
    return ok({
      date,
      verified,
      stored_root: anchor.merkle_root,
      computed_root: recomputed.merkle_root,
      row_count: { stored: anchor.row_count, live: recomputed.row_count },
      chain_hash: anchor.chain_hash,
      on_chain: anchor.tx_hash ? { chain: anchor.chain, tx_hash: anchor.tx_hash, anchored_at: anchor.anchored_at } : null,
      algo: anchor.algo,
      example_leaf: rows[0] ? { row: canonicalRow([...rows].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))[0]) } : null,
    })
  } catch (e) {
    return Response.json({ error: 'verify_failed', detail: String(e?.message || e) }, { status: 500, headers: CORS })
  }
}
