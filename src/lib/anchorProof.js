/**
 * anchorProof.js — tiny shared helpers for per-agent Merkle inclusion proofs.
 *
 * Used by /api/verify/agent/[handle] (full proof) and the agent profile page
 * (anchored badge: "is this agent in the latest anchored day?").
 */

/** Latest anchored day's row from snapshot_anchors, or null. */
export async function latestAnchor(supabase) {
  const { data } = await supabase
    .from('snapshot_anchors')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

/** True if the agent has a snapshot row on the given date. */
export async function agentInSnapshot(supabase, agentId, date) {
  const { count } = await supabase
    .from('agent_snapshots')
    .select('agent_id', { count: 'exact', head: true })
    .eq('snapshot_date', date)
    .eq('agent_id', agentId)
  return (count || 0) > 0
}
