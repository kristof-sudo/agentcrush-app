# Verify AgentCrush's daily record independently

Every day AgentCrush commits to its full index snapshot — `agent_id | rank | score | is_alive`
for every tracked agent — by publishing a SHA-256 Merkle root, chaining it to the previous
day, and anchoring it in a transaction on Base. You do not have to trust any of that:
you can recompute the root yourself from public endpoints.

## One command

```bash
curl -sO https://raw.githubusercontent.com/kristof-sudo/agentcrush-app/main/scripts/verify-agentcrush-day.mjs
node verify-agentcrush-day.mjs 2026-07-03
```

Output ends with `RESULT: MATCH` (or `MISMATCH`, which would mean the stored record and
the live data disagree — please report that immediately).

Requires Node 18+ and nothing else — the script is ~60 lines, dependency-free, and uses
only `node:crypto`. Read it before you run it; that's the point.

## What the script does

1. `GET https://agentcrush.xyz/api/verify/rows?date=YYYY-MM-DD` — the raw row inputs for
   that day, sorted by `agent_id` asc.
2. `GET https://agentcrush.xyz/api/verify?date=YYYY-MM-DD` — the stored root, chain hash,
   and (when anchored) the Base tx hash.
3. Recomputes locally, algo `sha256-merkle-v1`:
   - row string: `` `${agent_id}|${rank}|${score}|${is_alive ? '1' : '0'}` `` (null fields → empty string)
   - leaf: `sha256(rowString)` as lowercase hex over UTF-8 bytes
   - parent: `sha256(leftHex + rightHex)` — the concatenated *hex strings* are hashed
   - odd node count on a level: the last node is duplicated
4. Compares its root to the stored one and prints the verdict.

## Checking the on-chain anchor

The anchored root is the calldata of a 0-value self-transaction on Base:
open `https://basescan.org/tx/<tx_hash>` (printed by the script), expand
"Input Data" — the 32-byte payload is the day's Merkle root, hex-identical to
what you just computed.

## Tamper evidence

Each day's `chain_hash = sha256(prev_chain_hash + merkle_root)` (genesis uses the literal
string `GENESIS`). Editing any historical row changes that day's root, which breaks every
`chain_hash` after it — and disagrees with the immutable root on Base.

In-browser version: [agentcrush.xyz/oracle](https://agentcrush.xyz/oracle) has a one-click
verifier that runs this exact computation with WebCrypto.
