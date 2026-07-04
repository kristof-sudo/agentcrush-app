/**
 * GET /api/verify/rows?date=YYYY-MM-DD — the raw inputs behind a day's Merkle root.
 *
 * Returns the EXACT canonical row inputs (agent_id, rank, score, is_alive) for that
 * snapshot date, sorted by agent_id asc — the same order computeDailyRoot() hashes
 * them in. This is the data-availability read path for independent verifiers: fetch
 * these rows, hash `agent_id|rank|score|is_alive` per row, fold the binary Merkle
 * tree (duplicate last on odd), and compare against the anchored root at /api/verify.
 *
 * FREE, CORS-open. History is immutable once anchored → long CDN cache.
 */

import { createClient } from '@supabase/supabase-js'
import { ALGO } from '@/lib/snapshotHash'

export const runtime = 'nodejs'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'pass ?date=YYYY-MM-DD' }, { status: 400, headers: CORS })
  }

  try {
    const supabase = db()
    let rows = [], from = 0
    for (;;) {
      const { data, error } = await supabase
        .from('agent_snapshots')
        .select('agent_id, rank, score, is_alive')
        .eq('snapshot_date', date)
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      rows = rows.concat(data)
      if (data.length < 1000) break
      from += 1000
    }
    if (!rows.length) return Response.json({ date, error: 'no snapshot for that date' }, { status: 404, headers: CORS })

    // Same ordering computeDailyRoot() uses before hashing.
    rows.sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))

    return Response.json(
      { date, algo: ALGO, count: rows.length, rows },
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } }
    )
  } catch (e) {
    return Response.json({ error: 'rows_failed', detail: String(e?.message || e) }, { status: 500, headers: CORS })
  }
}
