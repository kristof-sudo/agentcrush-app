# Social copy — July 17, 2026: Tokenized liveness gap

Post: /blog/tokenized-liveness
Topic: Tokenized agents score 0% on the Ghost Index — instrument gap, not agent failure

---

## X thread (we / brand voice)

**Tweet 1 (hook)**
The Ghost Index runs nightly across 1,394 indexed agents.

MCP servers: 100% alive
Model families: 100% alive
Service agents: 97.9% alive
Developer agents: 57.2% alive
Tokenized agents: 0% alive

That last number is our problem, not theirs.

**Tweet 2**
Ghost Index probes HTTP/HTTPS endpoints.

MCP servers, service agents, developer tools — they have endpoints. Probe fails = agent down.

Tokenized agents operate through on-chain contracts. The contract is always "alive" as long as the chain runs. There's no endpoint to probe.

**Tweet 3**
So what's the right liveness instrument for tokenized agents?

→ On-chain transaction count (30d)
→ x402 inbound payment count
→ Unique payer count (30d)
→ Token holder growth (7d delta)

We built the settlement topology scanner in June. Payer matching is phase 2.

**Tweet 4**
We published the 0% figure with the flag visible.

The alternative — excluding tokenized agents from the denominator to improve the headline — makes the index look cleaner without making it more accurate.

That's the tradeoff we've decided against.

Full breakdown: agentcrush.xyz/blog/tokenized-liveness

---

## Farcaster cast (first-person / founder voice)

Ghost Index update: tokenized agents score 0%.

Not because they're inactive — some move serious on-chain volume. The instrument is wrong.

Endpoint uptime doesn't map to agents that live on-chain. I flagged it the moment I saw the number, documented the gap, and started building the right measurement (on-chain tx count + x402 payer scan).

Published the 0% anyway. Hiding it would make the index look cleaner without making it more accurate.

Per-category breakdown + what comes next: agentcrush.xyz/blog/tokenized-liveness

---

## Notes

- Verify current Ghost Index % at /api/ghost-index/v1 before posting — confirm tokenized 0% is still current
- Do NOT post before merge + Kris cover image added (post hidden by cover gate until real PNG committed)
- Posting Friday July 17, 14:00–16:00 UTC window preferred
- No need to cross-post both surfaces simultaneously — stagger by 1–2h fine
