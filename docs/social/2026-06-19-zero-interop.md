# Social drafts — June 19, 2026 weekly finding
# Post: "Nobody is multi-protocol yet"
# URL: agentcrush.xyz/blog/zero-interop
# Kris posts manually. Do not automate.

---

## X thread

**Tweet 1 (hook):**
We scanned 1,359 agents for protocol interoperability.

Zero support 3+ rails.
One supports 2.

Here's what the interoperability gap actually looks like in data. 🧵

**Tweet 2 (the four rails):**
The four rails we track:

• ERC-8004 — on-chain identity (Base)
• x402 — machine-payable HTTP endpoints
• A2A — Google's task-delegation agent card
• MCP — Anthropic's tool-exposure protocol

Each solves a different problem. They're meant to compose.

**Tweet 3 (the finding):**
Individual coverage is non-zero.

Some agents have x402. Some have MCP. Some have A2A cards.

But the intersection of any two? Nearly empty.
Intersection of three or four? Zero.

PCS = Protocol Compatibility Score.

**Tweet 4 (why):**
The communities haven't met yet.

MCP = LLM orchestration world
x402 = Coinbase/crypto world
A2A = Google enterprise world
ERC-8004 = onchain-agent world

Four different rooms, four different audiences, four separate implementation tracks.

**Tweet 5 (the economics):**
But the multi-protocol agent is coming.

An agent that's discoverable (A2A/MCP) + payable (x402) + verifiable (ERC-8004) captures more value than one requiring human intermediaries at every step.

The first team that ships all four will be cited for years.

**Tweet 6 (why we publish zeros):**
We almost published 104 agents at PCS ≥ 3.

That number was wrong — a content-validation bug (soft-404 pages triggering positive detections). We caught it, fixed the scanner, published the corrected zero.

A dashboard that can't show zero can't be trusted at any other value.

**Tweet 7 (CTA):**
Live interoperability data, free, CORS-open:
agentcrush.xyz/api/pcs/v1

Full piece:
agentcrush.xyz/blog/zero-interop

---

## Farcaster cast (single cast, first-person founder voice)

Zero agents with 3+ protocol rails. One with 2. Out of 1,359 indexed.

We measured interoperability across ERC-8004, x402, A2A, and MCP — the four live agent protocol rails. The intersection is empty.

Not a quality problem. Individual coverage exists. It's a community problem: four protocols, four different rooms that haven't met yet.

The multi-protocol agent is coming. We'll index it first when it does.

Full analysis + live data: agentcrush.xyz/blog/zero-interop

---

## Notes for Kris

- Verify current PCS numbers at agentcrush.xyz/api/pcs/v1 before posting (numbers as of June 12 in the post; update if materially changed)
- OG image `og-zero-interop.png` needed in /public — post will use og-default.png fallback until created
- X thread: post as a thread; lead tweet is the hook (tweet 1)
- FC cast: single cast, not threaded
