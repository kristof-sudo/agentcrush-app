/**
 * @agentcrush/guard — deterministic pre-settlement guard for x402 payments.
 *
 * guardedPay() sits between "received a 402 quote" and "settled it":
 *
 *   import { guardedPay, GuardBlockedError } from '@agentcrush/guard'
 *
 *   const result = await guardedPay(quote, () => settle(quote), {
 *     onCaution: (check) => console.warn(check.reason_codes),
 *   })
 *
 * Policy (deterministic, no LLM in the loop):
 *   - reject  → throws GuardBlockedError, payFn is never called
 *   - caution → calls opts.onCaution(check); pays unless onCaution returns
 *               false / throws (block-on-caution: pass blockOnCaution: true)
 *   - proceed → pays
 *
 * The inline check is FREE. When the verdict is caution/reject the response
 * carries a `deeper` block with metered depth endpoints (full risk
 * decomposition, signed attestation) — pulling depth is the caller's choice
 * at exactly the moment it matters.
 */

const DEFAULT_BASE_URL = 'https://agentcrush.xyz'

export class GuardBlockedError extends Error {
  constructor(check) {
    super(`Guard blocked payment to ${check.pay_to}: ${check.reason_codes.join(', ')}`)
    this.name = 'GuardBlockedError'
    this.check = check
  }
}

/**
 * Extract { payTo, resource } from an x402 v2 quote.
 * Accepts either the decoded quote object ({ resource, accepts: [...] }) or
 * the raw base64 `payment-required` header string.
 */
export function parseQuote(quote) {
  let q = quote
  if (typeof quote === 'string') {
    q = JSON.parse(Buffer.from(quote, 'base64').toString('utf8'))
  }
  const accept = Array.isArray(q?.accepts) ? q.accepts[0] : null
  return {
    payTo: accept?.payTo ?? null,
    resource: q?.resource?.url ?? null,
  }
}

/**
 * Free inline verdict for a payTo address (optionally bound to the resource
 * being paid). Returns the /api/guard/v1 response body.
 */
export async function checkPayee({ payTo, resource = null, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch }) {
  const u = new URL('/api/guard/v1', baseUrl)
  u.searchParams.set('pay_to', payTo)
  if (resource) u.searchParams.set('resource', resource)
  const res = await fetchImpl(u, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`guard check failed: HTTP ${res.status} ${body.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * @param {object|string} quote   decoded x402 quote or raw payment-required header
 * @param {() => Promise<any>} payFn   settles the payment; only called if allowed
 * @param {object} [opts]
 * @param {string}   [opts.baseUrl]         AgentCrush base URL
 * @param {function} [opts.onCaution]       (check) => boolean|void — return false to block
 * @param {boolean}  [opts.blockOnCaution]  treat caution like reject (default false)
 * @param {function} [opts.fetchImpl]       fetch override (tests, proxies)
 * @returns {Promise<{ paid: boolean, check: object, result?: any }>}
 */
export async function guardedPay(quote, payFn, opts = {}) {
  const { payTo, resource } = parseQuote(quote)
  if (!payTo) throw new Error('guardedPay: quote has no accepts[0].payTo — nothing to verify')

  const check = await checkPayee({ payTo, resource, baseUrl: opts.baseUrl, fetchImpl: opts.fetchImpl })

  if (check.decision === 'reject') throw new GuardBlockedError(check)

  if (check.decision === 'caution') {
    if (opts.blockOnCaution) throw new GuardBlockedError(check)
    if (typeof opts.onCaution === 'function') {
      const go = await opts.onCaution(check)
      if (go === false) return { paid: false, check }
    }
  }

  const result = await payFn()
  return { paid: true, check, result }
}
