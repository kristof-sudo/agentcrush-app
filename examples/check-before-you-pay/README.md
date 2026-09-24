# check-before-you-pay

A tiny reference integration: **have your agent check a counterparty with AgentCrush before it pays.**

When an AI agent is about to pay another agent/service over [x402](https://agentcrush.xyz/how-agents-pay),
the open question is *"is this counterparty legit, and has it been consistently live?"*
AgentCrush answers that at pay-time with a **free** verdict — no payment required for the go/no-go.
Depth (full trust breakdown, history) is paid; the decision you need to gate a payment is free.

## Use it

```bash
node verify-before-pay.mjs crewai
# => PAY — proceed — trust 8787, tier evidence_ranked

node verify-before-pay.mjs crewai --require-alive --min-score 5000
node verify-before-pay.mjs some-unknown-agent
# => HOLD — counterparty unknown to AgentCrush
```

No dependencies, Node 18+ (uses global `fetch`). Exit code `0` = pay, non-zero = hold.

## The pattern

```js
import { verifyCounterparty, shouldPay } from './verify-before-pay.mjs'

const verdict = await verifyCounterparty(counterpartyHandle)
const { pay, why } = shouldPay(verdict, { minScore: 5000, requireAlive: true })
if (pay) await payWithX402(...)   // proceed
else     abort(why)               // hold — unknown, not alive, or low trust
```

- **Free endpoint:** `GET https://agentcrush.xyz/api/agent/{handle}/a2a-verify`
- Returns `{ decision, reason, reason_codes, trust: { score, tier, verified, rank }, liveness }`.
- Conservative by default: an **unknown** or **not-alive** counterparty returns `HOLD` unless you opt out.
- In production, map the counterparty you're about to pay (endpoint / wallet / registry id) to an
  AgentCrush handle via `GET /api/agents/find?q=...` (also free), then verify.

## Why this exists

AgentCrush is a protocol-neutral market-intelligence index of the AI-agent economy, with a daily
on-chain-verifiable archive (`/oracle`). It tracks *across* GitHub, HuggingFace, LMArena, ERC-8004,
Virtuals, Agentverse/A2A, and x402/Bazaar. This example shows the one call that matters at pay-time.
Full docs: <https://agentcrush.xyz/llms.txt>.
