/**
 * GET /api/verify/agent/[handle] — per-agent Merkle inclusion proof.
 *
 *   /api/verify/agent/crewai                  → proof against the latest anchored day
 *   /api/verify/agent/crewai?date=YYYY-MM-DD  → proof against a specific anchored day
 *
 * Returns the agent's canonical snapshot row (agent_id|rank|score|is_alive),
 * its leaf hash, and the sibling path up to the day's stored Merkle root —
 * so anyone can verify THIS agent's record is included in the anchored root
 * without downloading the whole day's snapshot.
 *
 * FREE, CORS-open. Companion to /api/verify (whole-day verification).
 */

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { canonicalRow, merkleProof, verifyProof, ALGO } from '@/lib/snapshotHash'
import { latestAnchor } from '@/lib/anchorProof'

export const runtime = 'nodejs'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }

const notFound = (body) => Response.json(body, { status: 404, headers: CORS })

// same paginated fetch as /api/verify — MUST stay identical or roots diverge
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

export async function GET(req, { params }) {
  const { handle: rawHandle } = await params
  const handle = decodeURIComponent(rawHandle || '').trim()
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json({ error: 'bad_date', detail: 'Use ?date=YYYY-MM-DD' }, { status: 400, headers: CORS })
  }
  const supabase = db()

  try {
    // 1. handle → agent_id
    const { data: agent } = await supabase.from('agents').select('id, handle').ilike('handle', handle).maybeSingle()
    if (!agent) return notFound({ error: 'agent_not_found', handle })

    // 2. which anchored day?
    let anchor
    if (dateParam) {
      const { data } = await supabase.from('snapshot_anchors').select('*').eq('snapshot_date', dateParam).limit(1)
      anchor = data?.[0]
      if (!anchor) return notFound({ error: 'no_anchor_for_date', date: dateParam, hint: 'See /api/verify for anchored days.' })
    } else {
      anchor = await latestAnchor(supabase)
      if (!anchor) return notFound({ error: 'no_anchors_yet' })
    }
    const date = anchor.snapshot_date

    // 3. rebuild the day's leaves exactly as computeDailyRoot does
    const rows = await snapshotRows(supabase, date)
    if (!rows.length) return notFound({ error: 'no_snapshot_for_date', date })
    const sorted = [...rows].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))
    const index = sorted.findIndex((r) => String(r.agent_id) === String(agent.id))
    if (index === -1) return notFound({ error: 'agent_not_in_snapshot', handle: agent.handle, date })

    const row = sorted[index]
    const canonical = canonicalRow(row)
    const leafHash = sha256(canonical)
    const leaves = sorted.map((r) => sha256(canonicalRow(r)))
    const proof = merkleProof(leaves, index)
    const included = verifyProof(leafHash, proof, anchor.merkle_root)

    return Response.json({
      handle: agent.handle,
      agent_id: agent.id,
      date,
      row: { rank: row.rank, score: row.score, is_alive: row.is_alive },
      canonical_row: canonical,
      leaf_hash: leafHash,
      proof,
      merkle_root: anchor.merkle_root,
      included_in_stored_root: included,
      chain_hash: anchor.chain_hash,
      tx_hash: anchor.tx_hash || null,
      chain: anchor.chain || null,
      algo: anchor.algo || ALGO,
      how_to_verify: 'h = sha256(canonical_row); for each proof step: h = sha256(step.hash + h) if step.position === "left" else sha256(h + step.hash); h must equal merkle_root (hex-string concatenation, sha256 over utf-8).',
    }, { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600' } })
  } catch (e) {
    return Response.json({ error: 'proof_failed', detail: String(e?.message || e) }, { status: 500, headers: CORS })
  }
}
