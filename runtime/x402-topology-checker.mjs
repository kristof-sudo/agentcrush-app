/**
 * x402 settlement topology checker (B23 — step 1).
 *
 * Fetches a transaction from Base and classifies its x402 settlement path:
 *   DIRECT   — buyer EOA → USDC Transfer → payTo address
 *   MEDIATED — buyer EOA → facilitator contract → USDC Transfer → payTo
 *   NONE     — no USDC transfers found (not an x402 payment tx)
 *
 * Why this matters: if settlement is mediated, the payer scan worker
 * (x402-payer-scan-worker.mjs) must index by the facilitator address
 * in topic[1], not by payTo in topic[2].
 *
 * Usage:
 *   # Analyse a specific tx:
 *   node runtime/x402-topology-checker.mjs --tx 0x<txhash>
 *
 *   # Auto-discover: find a recent USDC transfer to a known Bazaar payTo,
 *   # then analyse it — no need to supply your own tx:
 *   node runtime/x402-topology-checker.mjs --discover [--blocks 5000]
 *
 * Env (all optional):
 *   BASE_RPC_URL   — defaults to https://mainnet.base.org
 */

const USDC_BASE       = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
const TRANSFER_TOPIC  = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const BAZAAR_ENDPOINT = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources'
const RPC             = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const txHash    = args[args.indexOf('--tx') + 1] || null
const discover  = args.includes('--discover')
const blocksArg = args[args.indexOf('--blocks') + 1]
const LOOKBACK  = blocksArg ? parseInt(blocksArg, 10) : 5000

if (!txHash && !discover) {
  console.error('[topology] Usage: --tx 0x<hash>  OR  --discover [--blocks N]')
  process.exit(1)
}

// ── JSON-RPC helpers ─────────────────────────────────────────────────────────

let _rpcId = 1
async function rpc(method, params, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: _rpcId++, method, params }),
    })
    if (res.status === 429) {
      const wait = 1000 * (attempt + 1)
      console.warn(`[topology] RPC rate-limited, retrying in ${wait}ms…`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    const body = await res.json()
    if (body.error) throw new Error(`RPC ${method} error: ${body.error.message}`)
    return body.result
  }
  throw new Error(`[topology] RPC ${method} failed after ${retries} attempts`)
}

function padAddr(addr) {
  return '0x' + addr.replace(/^0x/, '').toLowerCase().padStart(64, '0')
}

function unpadAddr(topic) {
  return '0x' + topic.slice(-40).toLowerCase()
}

function hexToUsdc(data) {
  // USDC has 6 decimals; data is uint256 padded to 32 bytes
  const raw = BigInt(data)
  const whole = raw / 1_000_000n
  const frac  = raw % 1_000_000n
  return `${whole}.${frac.toString().padStart(6, '0')} USDC`
}

// ── Core topology analysis ───────────────────────────────────────────────────

async function analyseTopology(hash, knownPayTo = new Set()) {
  console.log(`\n[topology] Analysing tx ${hash}`)
  console.log(`[topology] RPC: ${RPC}`)

  const [tx, receipt] = await Promise.all([
    rpc('eth_getTransactionByHash', [hash]),
    rpc('eth_getTransactionReceipt', [hash]),
  ])

  if (!tx)      { console.log('[topology] Tx not found'); return }
  if (!receipt) { console.log('[topology] Receipt not found (pending?)'); return }

  const txTo   = tx.to?.toLowerCase() || '(contract creation)'
  const txFrom = tx.from?.toLowerCase()

  console.log(`\n  Tx from   : ${txFrom}`)
  console.log(`  Tx to     : ${txTo}`)
  console.log(`  Value     : ${BigInt(tx.value || '0x0')} wei (should be 0 for USDC payment)`)
  console.log(`  Gas used  : ${parseInt(receipt.gasUsed, 16).toLocaleString()}`)
  console.log(`  Status    : ${receipt.status === '0x1' ? 'SUCCESS' : 'FAILED'}`)

  // Is tx.to an EOA or contract?
  const txToCode = tx.to ? await rpc('eth_getCode', [tx.to, 'latest']) : '0x'
  const txToIsContract = txToCode && txToCode !== '0x' && txToCode !== '0x0'
  const txToIsUsdc = txTo === USDC_BASE
  // tx.to == USDC contract means the caller is invoking transfer() or transferFrom()
  // directly — this is DIRECT settlement, not mediated via a third-party facilitator.
  console.log(`  Tx.to type: ${txToIsUsdc ? 'USDC CONTRACT (direct payment call)' : txToIsContract ? 'CONTRACT (possible facilitator)' : 'EOA'}`)

  // Parse USDC Transfer events from the receipt logs
  const transfers = (receipt.logs || []).filter(
    log => log.address?.toLowerCase() === USDC_BASE &&
           log.topics?.[0] === TRANSFER_TOPIC
  )

  if (transfers.length === 0) {
    console.log('\n  ✗ No USDC Transfer events found — not an x402 payment tx')
    return { type: 'NONE', txFrom, txTo }
  }

  console.log(`\n  USDC Transfer events (${transfers.length}):`)
  let directMatch = false
  let mediatedMatch = false

  for (const log of transfers) {
    const from   = unpadAddr(log.topics[1])
    const to     = unpadAddr(log.topics[2])
    const amount = hexToUsdc(log.data)
    const isKnownPayTo = knownPayTo.has(to)
    console.log(`    ${from} → ${to}  ${amount}  ${isKnownPayTo ? '← known Bazaar payTo' : ''}`)

    if (from === txFrom && isKnownPayTo) directMatch = true
    if (from !== txFrom && isKnownPayTo) mediatedMatch = true
  }

  // Classify topology
  //
  // DIRECT patterns (no third-party routing):
  //   A. EOA calls USDC.transfer(payTo, amount)       → Transfer from=EOA, to=payTo
  //   B. EOA calls USDC.transferFrom(wallet, payTo, amount) → Transfer from=wallet, to=payTo
  //      (common for Coinbase Smart Wallets: the EOA initiates, smart wallet holds USDC)
  //
  // For payer scan, the Transfer event topic[1] (FROM) is always the entity whose USDC
  // was debited — the correct "payer_wallet" for our purposes regardless of pattern A or B.
  //
  // MEDIATED: tx goes through a third-party contract that is NOT the USDC contract,
  // which then calls USDC internally. Would show tx.to != USDC_BASE && tx.to is a contract.
  if (txToIsUsdc) {
    const transferFrom = transfers[0] ? unpadAddr(transfers[0].topics[1]) : null
    const isSameOrigin = transferFrom === txFrom
    console.log(`\n  TOPOLOGY: DIRECT — caller invokes USDC ${isSameOrigin ? 'transfer()' : 'transferFrom()'}`)
    if (!isSameOrigin) {
      console.log(`  → Smart wallet pattern: tx.from=${txFrom} pulled USDC from wallet ${transferFrom}`)
      console.log(`  → payer_wallet = ${transferFrom} (the USDC holder; tx initiator is ${txFrom})`)
    }
    console.log('  → payer scan: filter Transfer topic[2] ∈ payTo set (current plan is correct)')
    console.log('  → payer_wallet = Transfer topic[1] (the USDC debited entity)')
    return { type: 'DIRECT', pattern: isSameOrigin ? 'transfer' : 'transferFrom_smart_wallet', txFrom, payerWallet: transferFrom, txTo, transfers: transfers.length }
  }
  if (directMatch) {
    console.log('\n  TOPOLOGY: DIRECT — buyer EOA pays payTo in one hop')
    console.log('  → payer scan: filter Transfer topic[2] ∈ payTo set (current plan is correct)')
    return { type: 'DIRECT', pattern: 'direct_eoa', txFrom, txTo, transfers: transfers.length }
  }
  if (mediatedMatch) {
    // The intermediate contract (the one that received first and forwarded) is the facilitator
    const facilitator = transfers[0] ? unpadAddr(transfers[0].topics[1]) : null
    console.log(`\n  TOPOLOGY: MEDIATED — tx goes through third-party contract ${txTo}`)
    console.log(`  → Facilitator address: ${facilitator}`)
    console.log('  → payer scan update needed: scan by facilitator address in topic[1]')
    console.log(`    filter logs where topic[1] = ${facilitator} AND topic[2] ∈ payTo set`)
    return { type: 'MEDIATED', txFrom, txTo: txTo, facilitator, transfers: transfers.length }
  }

  // USDC transfers exist but none match known payTo addresses
  const recipients = transfers.map(l => unpadAddr(l.topics[2]))
  console.log('\n  TOPOLOGY: UNKNOWN — USDC transfers exist but payTo not in our set')
  console.log('  Recipients:', recipients)
  console.log('  (Either not an x402 payment, or this payTo is not in our Bazaar mirror)')
  return { type: 'UNKNOWN', txFrom, txTo, recipients }
}

// ── Discovery mode: find a recent x402 tx from the Bazaar index ─────────────

async function fetchBasePayTo() {
  console.log('[topology] Fetching active Base payTo addresses from Bazaar…')
  const all = []
  let offset = 0
  for (let page = 0; page < 20; page++) {
    const res = await fetch(`${BAZAAR_ENDPOINT}?limit=1000&offset=${offset}`)
    if (!res.ok) break
    const body = await res.json()
    all.push(...(body.items || []))
    offset += (body.items || []).length
    if (!body.items?.length || offset >= (body.pagination?.total || 0)) break
  }

  const payToSet = new Set()
  for (const r of all) {
    const quality = r.extensions?.bazaar?.quality || r.quality || {}
    const calls = +(quality.l30DaysTotalCalls || 0)
    if (calls <= 0) continue
    for (const acc of r.accepts || []) {
      if ((acc.network === 'eip155:8453' || acc.network === 'base') && acc.payTo) {
        payToSet.add(acc.payTo.toLowerCase())
      }
    }
  }
  console.log(`[topology] Found ${payToSet.size} active Base payTo addresses across ${all.length} resources`)
  return payToSet
}

async function discoverTx(knownPayTo, lookbackBlocks) {
  const currentBlockHex = await rpc('eth_blockNumber', [])
  const currentBlock = parseInt(currentBlockHex, 16)
  const fromBlock = currentBlock - lookbackBlocks
  console.log(`[topology] Scanning blocks ${fromBlock}–${currentBlock} for USDC transfers to known payTo addresses…`)

  const payToArr = [...knownPayTo].slice(0, 200) // cap at 200 for public RPC
  if (payToArr.length === 0) {
    console.log('[topology] No active Base payTo addresses found in Bazaar index')
    return null
  }

  const CHUNK = 2000
  for (let from = fromBlock; from < currentBlock; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, currentBlock)
    const logs = await rpc('eth_getLogs', [{
      address: USDC_BASE,
      topics: [TRANSFER_TOPIC, null, payToArr.map(padAddr)],
      fromBlock: '0x' + from.toString(16),
      toBlock:   '0x' + to.toString(16),
    }])

    if (logs?.length > 0) {
      const txHash = logs[0].transactionHash
      console.log(`[topology] Found USDC transfer to known payTo in block ${parseInt(logs[0].blockNumber, 16)}: tx ${txHash}`)
      return txHash
    }
  }
  console.log('[topology] No x402 transfers found in the lookback window')
  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (discover) {
    const knownPayTo = await fetchBasePayTo()
    const found = await discoverTx(knownPayTo, LOOKBACK)
    if (!found) {
      console.log('[topology] Nothing to analyse. Try --blocks 50000 for a wider scan.')
      return
    }
    await analyseTopology(found, knownPayTo)
  } else {
    // Minimal payTo context for known-tx analysis: fetch Bazaar for labelling
    let knownPayTo = new Set()
    try {
      knownPayTo = await fetchBasePayTo()
    } catch {
      console.warn('[topology] Could not fetch Bazaar payTo (labelling unavailable)')
    }
    await analyseTopology(txHash, knownPayTo)
  }

  console.log('\n[topology] Done.')
}

main().catch(err => {
  console.error('[topology] Fatal:', err.message || err)
  process.exit(1)
})
