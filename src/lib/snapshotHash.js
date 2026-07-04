/**
 * snapshotHash.js — deterministic hashing for the verifiable historic record.
 *
 * Shared by runtime/snapshot-anchor-worker.mjs (writes the daily root) and
 * /api/verify (recomputes from live data and compares). Both MUST use this exact
 * logic or verification breaks — so it lives in one place.
 *
 * The record we commit to, per agent per day, is the public truth that matters:
 *   agent_id | rank | score | is_alive
 * Rows are sorted by agent_id, hashed into leaves, folded into a binary Merkle
 * root. The daily root is then chained: chain_hash = sha256(prev_chain_hash + root),
 * so altering ANY past row breaks every chain_hash after it (tamper-evident).
 */

import { createHash } from 'node:crypto'

export const ALGO = 'sha256-merkle-v1'
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

// canonical, stable string for one snapshot row
export function canonicalRow(r) {
  const score = r.score == null ? '' : String(r.score)
  const rank = r.rank == null ? '' : String(r.rank)
  const alive = r.is_alive == null ? '' : (r.is_alive ? '1' : '0')
  return `${r.agent_id}|${rank}|${score}|${alive}`
}

// binary Merkle root over leaf hashes (duplicate last on odd level)
export function merkleRoot(leafHashes) {
  if (!leafHashes.length) return sha256('') // empty-set sentinel
  let level = [...leafHashes]
  while (level.length > 1) {
    const next = []
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]
      const b = i + 1 < level.length ? level[i + 1] : level[i] // duplicate last
      next.push(sha256(a + b))
    }
    level = next
  }
  return level[0]
}

/**
 * Merkle inclusion proof for the leaf at `index`, following the exact same
 * tree construction as merkleRoot (duplicate last on odd level).
 * @param {string[]} leafHashes  all leaf hashes, in tree order
 * @param {number} index         index of the leaf to prove
 * @returns {Array<{hash: string, position: 'left'|'right'}>}  sibling path, leaf→root
 */
export function merkleProof(leafHashes, index) {
  if (!Number.isInteger(index) || index < 0 || index >= leafHashes.length) {
    throw new Error('merkleProof: index out of range')
  }
  const proof = []
  let level = [...leafHashes]
  let idx = index
  while (level.length > 1) {
    const isRightChild = idx % 2 === 1
    const siblingIdx = isRightChild ? idx - 1 : idx + 1
    // odd level: last node pairs with itself (duplicate last)
    const sibling = siblingIdx < level.length ? level[siblingIdx] : level[idx]
    proof.push({ hash: sibling, position: isRightChild ? 'left' : 'right' })
    const next = []
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]
      const b = i + 1 < level.length ? level[i + 1] : level[i] // duplicate last
      next.push(sha256(a + b))
    }
    level = next
    idx = Math.floor(idx / 2)
  }
  return proof
}

/**
 * Verify a Merkle inclusion proof produced by merkleProof.
 * @param {string} leafHash
 * @param {Array<{hash: string, position: 'left'|'right'}>} proof
 * @param {string} root  expected Merkle root
 * @returns {boolean}
 */
export function verifyProof(leafHash, proof, root) {
  let h = leafHash
  for (const step of proof) {
    h = step.position === 'left' ? sha256(step.hash + h) : sha256(h + step.hash)
  }
  return h === root
}

/**
 * Compute the day's Merkle root + chained hash.
 * @param {Array<{agent_id,rank,score,is_alive}>} rows  all snapshot rows for the date
 * @param {string|null} prevChainHash  prior day's chain_hash (null for the genesis day)
 * @returns {{ merkle_root, chain_hash, row_count, algo }}
 */
export function computeDailyRoot(rows, prevChainHash) {
  const sorted = [...rows].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)))
  const leaves = sorted.map((r) => sha256(canonicalRow(r)))
  const merkle_root = merkleRoot(leaves)
  const chain_hash = sha256((prevChainHash || 'GENESIS') + merkle_root)
  return { merkle_root, chain_hash, row_count: sorted.length, algo: ALGO }
}
