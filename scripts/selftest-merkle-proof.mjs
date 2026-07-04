/**
 * selftest-merkle-proof.mjs — asserts merkleProof/verifyProof round-trip
 * against merkleRoot for random 7-leaf (odd) and 8-leaf (even) trees.
 *
 * Run: node scripts/selftest-merkle-proof.mjs
 */

import { randomBytes, createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { merkleRoot, merkleProof, verifyProof } from '../src/lib/snapshotHash.js'

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

for (const n of [7, 8]) {
  const leaves = Array.from({ length: n }, () => sha256(randomBytes(32).toString('hex')))
  const root = merkleRoot(leaves)

  for (let i = 0; i < n; i++) {
    const proof = merkleProof(leaves, i)
    assert.equal(verifyProof(leaves[i], proof, root), true, `${n}-leaf tree: proof for leaf ${i} must verify`)
    // tamper checks: wrong leaf and wrong root must fail
    assert.equal(verifyProof(sha256('tampered'), proof, root), false, `${n}-leaf tree: tampered leaf ${i} must NOT verify`)
    assert.equal(verifyProof(leaves[i], proof, sha256('wrong-root')), false, `${n}-leaf tree: wrong root for leaf ${i} must NOT verify`)
  }
  console.log(`OK: ${n}-leaf tree — all ${n} inclusion proofs round-trip (root ${root.slice(0, 16)}…)`)
}

// degenerate cases
const single = [sha256('only')]
assert.equal(merkleRoot(single), single[0])
assert.deepEqual(merkleProof(single, 0), [])
assert.equal(verifyProof(single[0], [], merkleRoot(single)), true)
console.log('OK: single-leaf tree — empty proof verifies')

console.log('SELFTEST PASS')
