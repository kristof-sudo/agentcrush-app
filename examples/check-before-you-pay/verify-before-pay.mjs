#!/usr/bin/env node
/**
 * check-before-you-pay — reference integration for AI agents using x402.
 *
 * Pattern: before your agent pays a counterparty, ask AgentCrush whether that
 * counterparty is known, evidence-ranked, and currently alive. AgentCrush's
 * verify endpoint is FREE (no x402 payment required) and returns a machine
 * decision you can gate the payment on. Depth (history, full trust breakdown)
 * is paid; the go/no-go verdict is free — which is all you need at pay time.
 *
 * No dependencies. Node 18+ (global fetch). Run:
 *   node verify-before-pay.mjs crewai
 *   node verify-before-pay.mjs <handle> [--min-score 5000] [--require-alive]
 *
 * Docs: https://agentcrush.xyz/llms.txt   Endpoint: /api/agent/{handle}/a2a-verify
 */

const BASE = process.env.AGENTCRUSH_BASE || 'https://agentcrush.xyz'

/**
 * Ask AgentCrush for a pre-payment verdict on a counterparty (by AgentCrush handle).
 * In production you'd map the counterparty you're about to pay (its endpoint,
 * wallet, or registry id) to an AgentCrush handle — e.g. via /api/agents/find?q=...
 * Returns the parsed verdict, or throws on a hard error.
 */
export async function verifyCounterparty(handle, { timeoutMs = 6000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}/api/agent/${encodeURIComponent(handle)}/a2a-verify`, {
      headers: { Accept: 'application/json', 'User-Agent': 'check-before-you-pay-example' },
      signal: ctrl.signal,
    })
    if (res.status === 404) return { known: false, decision: 'unknown', reason: 'Counterparty not in the index.' }
    if (!res.ok) throw new Error(`AgentCrush returned HTTP ${res.status}`)
    const v = await res.json()
    return { known: true, ...v }
  } finally {
    clearTimeout(t)
  }
}

/**
 * Turn a verdict into a pay / hold decision your agent can act on.
 * Conservative by design: unknown or not-alive => hold, unless you opt out.
 */
export function shouldPay(verdict, { minScore = 0, requireAlive = false } = {}) {
  if (!verdict.known) return { pay: false, why: 'counterparty unknown to AgentCrush' }
  if (verdict.decision && verdict.decision !== 'proceed')
    return { pay: false, why: `AgentCrush decision: ${verdict.decision} (${(verdict.reason_codes || []).join(', ')})` }
  const score = verdict.trust?.score ?? 0
  if (score < minScore) return { pay: false, why: `trust score ${score} < required ${minScore}` }
  if (requireAlive && verdict.liveness && verdict.liveness.state && verdict.liveness.state !== 'alive')
    return { pay: false, why: `counterparty liveness is ${verdict.liveness.state}` }
  return { pay: true, why: `proceed — trust ${score}, tier ${verdict.trust?.tier ?? 'n/a'}` }
}

// ── CLI demo ──────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const handle = args.find((a) => !a.startsWith('--'))
  if (!handle) {
    console.error('usage: node verify-before-pay.mjs <handle> [--min-score N] [--require-alive]')
    process.exit(2)
  }
  const minScore = Number((args.find((a) => a.startsWith('--min-score')) || '').split('=')[1]
    || args[args.indexOf('--min-score') + 1] || 0)
  const requireAlive = args.includes('--require-alive')

  const verdict = await verifyCounterparty(handle)
  const decision = shouldPay(verdict, { minScore, requireAlive })

  console.log(`counterparty : ${handle}`)
  console.log(`known        : ${verdict.known}`)
  if (verdict.known) {
    console.log(`decision     : ${verdict.decision}  (${(verdict.reason_codes || []).join(', ') || 'n/a'})`)
    console.log(`trust        : score=${verdict.trust?.score ?? 'n/a'} tier=${verdict.trust?.tier ?? 'n/a'} rank=${verdict.trust?.rank ?? 'n/a'}`)
  }
  console.log(`\n=> ${decision.pay ? 'PAY' : 'HOLD'} — ${decision.why}`)
  // In a real agent: if (decision.pay) proceedWithX402Payment(); else abort()
  process.exit(decision.pay ? 0 : 1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('error:', e.message); process.exit(3) })
}
