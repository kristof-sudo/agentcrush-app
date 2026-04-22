/**
 * Buyer-side x402 end-to-end test.
 *
 * Makes a real paid call from the AgentCrush CDP server wallet to our own
 * trust-summary endpoint on Base mainnet via the x402 protocol.
 *
 * Prerequisites:
 *   - cdp-server-wallet-account.json must exist (run `npm run create-wallet` once)
 *   - Wallet must hold >= 0.05 USDC on Base mainnet
 *   - .env must contain CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *
 * Run: npm run x402-buyer-test
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { CdpClient } from '@coinbase/cdp-sdk'
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from '@x402/fetch'
import { registerExactEvmScheme } from '@x402/evm/exact/client'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ACCOUNT_FILE = resolve(__dirname, '../cdp-server-wallet-account.json')
const NETWORK = 'base'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const ENDPOINT = 'https://www.agentcrush.xyz/api/agent/devin/trust-summary'
const MIN_USDC = 0.05   // $0.02 call + headroom
const MIN_ETH  = 0.0001 // advisory — EIP-3009 buyer signing does not consume gas;
                         // the CDP facilitator submits on-chain. Low ETH is not a blocker.

// ── env validation ────────────────────────────────────────────────────────────

const REQUIRED_ENV = ['CDP_API_KEY_ID', 'CDP_API_KEY_SECRET', 'CDP_WALLET_SECRET']
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '))
  process.exit(1)
}

// ── load saved account ────────────────────────────────────────────────────────

let saved
try {
  saved = JSON.parse(readFileSync(ACCOUNT_FILE, 'utf8'))
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`No account file found at ${ACCOUNT_FILE}.`)
    console.error('Run `npm run create-wallet` first.')
  } else {
    console.error('Failed to read account file:', err.message ?? err)
  }
  process.exit(1)
}

const savedAddress = saved?.account?.address
if (!savedAddress) {
  console.error('Account file is missing `account.address`. Re-run create-wallet.')
  process.exit(1)
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Init CDP client
  let cdp
  try {
    cdp = new CdpClient()
  } catch (err) {
    console.error('CDP client init failed:', err.message ?? err)
    process.exit(1)
  }

  // Load signing-capable account by address
  // cdp.evm.getAccount returns an EvmServerAccount with address + signTypedData,
  // which is passed directly as the signer to ExactEvmScheme — no viem conversion needed.
  let account
  try {
    account = await cdp.evm.getAccount({ address: savedAddress })
  } catch (err) {
    console.error('Failed to load CDP account:', err.message ?? err)
    console.error(`Address: ${savedAddress}`)
    process.exit(1)
  }

  console.log('Wallet:', account.address)
  console.log('Network: Base mainnet\n')

  // ── pre-flight balance check ──────────────────────────────────────────────

  console.log('Checking balances on Base mainnet...')
  let balances
  try {
    const result = await cdp.evm.listTokenBalances({ address: account.address, network: NETWORK })
    balances = result.balances
  } catch (err) {
    console.error('Failed to fetch balances:', err.message ?? err)
    process.exit(1)
  }

  let usdcBefore = 0
  let ethBalance = 0

  for (const { token, amount } of balances) {
    const human = Number(amount.amount) / 10 ** amount.decimals
    if (token.contractAddress?.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
      usdcBefore = human
    } else if (!token.contractAddress) {
      ethBalance = human
    }
  }

  console.log(`  USDC: ${usdcBefore.toFixed(6)}  (minimum ${MIN_USDC})`)
  console.log(`  ETH:  ${ethBalance.toFixed(8)}  (minimum ${MIN_ETH} — advisory, buyer does not pay gas)\n`)

  if (usdcBefore < MIN_USDC) {
    console.error(`Insufficient USDC: have ${usdcBefore.toFixed(6)}, need >= ${MIN_USDC}`)
    console.error(`Fund ${account.address} with USDC on Base mainnet, then retry.`)
    console.error(`Bridge: https://bridge.base.org  |  Buy: Coinbase, Uniswap`)
    process.exit(1)
  }

  if (ethBalance < MIN_ETH) {
    console.warn(`Low ETH: ${ethBalance.toFixed(8)} < ${MIN_ETH}`)
    console.warn('This is advisory — EIP-3009 payments do not require buyer ETH.')
    console.warn('Continuing anyway...\n')
  }

  // ── wire x402 payment client ──────────────────────────────────────────────

  const client = new x402Client()
  // Register EIP-3009 exact scheme for all EVM networks.
  // EvmServerAccount satisfies the signer interface (address + signTypedData).
  registerExactEvmScheme(client, { signer: account })

  // Wrap fetch one level deeper so we can capture the PAYMENT-SIGNATURE header
  // that the SDK attaches to the second (paid) request before it goes out.
  let capturedPaymentSignature = null
  const interceptingFetch = async (input, init) => {
    const req = new Request(input, init)
    const sig = req.headers.get('PAYMENT-SIGNATURE') ?? req.headers.get('payment-signature')
    if (sig) capturedPaymentSignature = sig
    return fetch(req)
  }

  const fetchWithPayment = wrapFetchWithPayment(interceptingFetch, client)

  // ── make paid request ─────────────────────────────────────────────────────

  console.log('Endpoint:', ENDPOINT)
  console.log('Flow: GET -> 402 -> sign EIP-3009 -> re-request with PAYMENT-SIGNATURE\n')

  let response
  try {
    response = await fetchWithPayment(ENDPOINT, { method: 'GET' })
  } catch (err) {
    console.error('x402 request failed:', err.message ?? err)
    if (err.cause) console.error('Cause:', err.cause)
    process.exit(1)
  }

  const status = response.status
  const responseBody = await response.text()

  if (status !== 200) {
    console.error(`Request failed with status ${status}`)

    console.error('\n── Response headers (full) ──────────────────────────────────────')
    for (const [k, v] of response.headers.entries()) {
      console.error(`  ${k}: ${v}`)
    }

    const paymentRequiredRaw =
      response.headers.get('PAYMENT-REQUIRED') ??
      response.headers.get('payment-required')
    if (paymentRequiredRaw) {
      console.error('\n── payment-required (decoded) ───────────────────────────────────')
      try {
        const decoded = JSON.parse(Buffer.from(paymentRequiredRaw, 'base64').toString('utf8'))
        console.error(JSON.stringify(decoded, null, 2))
      } catch (err) {
        console.error('(could not decode base64 JSON:', err.message + ')')
        console.error(paymentRequiredRaw)
      }
    }

    console.error('\n── Response body ────────────────────────────────────────────────')
    if (responseBody === '') {
      console.error('(empty)')
    } else {
      try {
        console.error(JSON.stringify(JSON.parse(responseBody), null, 2))
      } catch {
        console.error(responseBody)
      }
    }

    if (capturedPaymentSignature) {
      console.error('\n── payment-signature sent (decoded) ─────────────────────────────')
      try {
        const decoded = JSON.parse(Buffer.from(capturedPaymentSignature, 'base64').toString('utf8'))
        console.error(JSON.stringify(decoded, null, 2))
      } catch (err) {
        console.error('(could not decode base64 JSON:', err.message + ')')
        console.error(capturedPaymentSignature)
      }
    } else {
      console.error('\n── payment-signature sent ───────────────────────────────────────')
      console.error('(none captured — payment step may not have been reached)')
    }

    process.exit(1)
  }

  // ── extract transaction hash ──────────────────────────────────────────────

  let txHash = null
  const rawPaymentResponse =
    response.headers.get('PAYMENT-RESPONSE') ??
    response.headers.get('payment-response')

  if (rawPaymentResponse) {
    try {
      const settlement = decodePaymentResponseHeader(rawPaymentResponse)
      txHash = settlement.transaction ?? null
    } catch (err) {
      console.warn('Could not decode PAYMENT-RESPONSE header:', err.message)
    }
  }

  // ── print results ─────────────────────────────────────────────────────────

  let parsed
  try {
    parsed = JSON.parse(responseBody)
  } catch {
    parsed = responseBody
  }

  console.log('Payment accepted. Trust-summary received:\n')
  console.log(JSON.stringify(parsed, null, 2))

  if (txHash) {
    console.log('\nTransaction hash:', txHash)
    console.log('BaseScan:        ', `https://basescan.org/tx/${txHash}`)
  } else {
    console.log('\nTransaction hash: not present in PAYMENT-RESPONSE header')
    console.log('Check recent transactions at:')
    console.log(`  https://basescan.org/address/${account.address}`)
  }

  // ── USDC delta ────────────────────────────────────────────────────────────

  try {
    const postResult = await cdp.evm.listTokenBalances({ address: account.address, network: NETWORK })
    let usdcAfter = 0
    for (const { token, amount } of postResult.balances) {
      if (token.contractAddress?.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        usdcAfter = Number(amount.amount) / 10 ** amount.decimals
      }
    }
    const delta = usdcAfter - usdcBefore
    console.log('\nUSCD balance delta:')
    console.log(`  Before: ${usdcBefore.toFixed(6)} USDC`)
    console.log(`  After:  ${usdcAfter.toFixed(6)} USDC`)
    console.log(`  Delta:  ${delta.toFixed(6)} USDC  (expected -0.020000)`)
  } catch (err) {
    console.warn('\nCould not fetch post-call balance:', err.message)
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
