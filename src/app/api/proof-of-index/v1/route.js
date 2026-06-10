/**
 * GET /api/proof-of-index/v1[?history=N]
 *
 * Daily SHA-256 digests of the snapshot archive, notarized on Base.
 * Free, CORS-open. Verify any digest against the tx calldata on basescan.
 */

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300, s-maxage=300',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const history = Math.min(Number(searchParams.get('history')) || 1, 365)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    const { data, error } = await supabase
      .from('proof_of_index')
      .select('snapshot_date, digest_sha256, record_count, chain, tx_hash, posted_at, status')
      .order('snapshot_date', { ascending: false })
      .limit(history)
    if (error) throw error

    return Response.json({
      proof_of_index: data || [],
      how_to_verify: 'Recompute the SHA-256 over the canonical JSON of that day\'s snapshot rows (recursively key-sorted, rows ordered by id) and compare with the calldata of tx_hash on Base.',
      methodology: 'https://agentcrush.xyz/methodology#proof-of-index',
    }, { headers: CORS })
  } catch (e) {
    return Response.json(
      { proof_of_index: [], note: 'Proof-of-Index initializing — table pending migration apply.', error: e?.message },
      { status: 200, headers: CORS }
    )
  }
}
