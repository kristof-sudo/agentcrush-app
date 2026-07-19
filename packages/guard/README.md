# @agentcrush/guard

Deterministic pre-settlement guard for x402 payments. One call between
"received a 402 quote" and "settled it" — block on `reject`, surface
`caution`, pay on `proceed`.

```js
import { guardedPay, GuardBlockedError } from '@agentcrush/guard'

// quote = decoded x402 payment-required quote (or the raw base64 header)
try {
  const { paid, check } = await guardedPay(quote, () => settle(quote), {
    onCaution: (check) => {
      console.warn('guard caution:', check.reason_codes)
      return true // pay anyway; return false to skip
    },
  })
} catch (e) {
  if (e instanceof GuardBlockedError) {
    // counterparty rejected — e.check has reason_codes + metered deep-dive links
  }
}
```

The inline verdict is **free** (`GET /api/guard/v1?pay_to=0x…&resource=…`).
When the verdict is `caution` or `reject`, the response includes a `deeper`
block with metered endpoints (full risk decomposition, signed attestation) —
depth is priced only at the moment risk appears.

What the verdict is built from:

- **CDP Bazaar listings (46K+)** — is this `payTo` advertised, and for the
  resource you're actually paying?
- **ERC-8004 registry (41K+ on-chain registrations)** — is the address a
  registered agent owner?
- **AgentCrush index** — tier, liveness, and wallet-binding integrity for the
  resolved counterparty (`verify_counterparty` decision core).

Doctrine: absence of evidence is `caution`, never `reject`. `proceed` is
reserved for evidence-ranked, currently-alive counterparties.
