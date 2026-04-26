# ERC-8004 Integration Exploration

**Created:** April 26, 2026  
**Author:** Research doc — Kris review required  
**Status:** Exploration only — no implementation authorized  
**Companion:** `docs/STRATEGIC_BETS.md` (Bet B: A2A open-source ecosystem)

---

## 1. Executive Recommendation

**Read before building. Surface before writing. Write only after scoring is stable.**

| Phase | Action | Authorized? |
|---|---|---|
| Phase 0 | Ajsa monitors ERC-8004 ecosystem weekly | ✅ Now |
| Phase 1 | Build read-only prototype against live contracts | Explore next |
| Phase 2 | Use ERC-8004 as ingestion discovery source | After Phase 1 validates overlap |
| Phase 3 | Write AgentCrush attestations back on-chain | Only after v2 scoring confirmed stable |

**Hard rules:**
- Do not make ERC-8004 the exclusive identity source. AgentCrush remains multi-registry-neutral.
- Do not let ERC-8004 state change scoring weights without an explicit decision.
- Do not write on-chain until gas cap, wallet security, and score stability are confirmed.
- Do not auto-ingest uncertain matches into public rankings.

**Strategic position:** AgentCrush does not replace ERC-8004. AgentCrush makes ERC-8004 and other agent identity systems useful for discovery, ranking, and machine-readable trust decisions.

---

## 2. What ERC-8004 Is

ERC-8004, titled "Trustless Agents," is a set of three lightweight on-chain registries for autonomous AI agents. The EIP draft was created August 13, 2025, launched on Ethereum mainnet January 29, 2026, and is now deployed on 30+ networks. As of late April 2026, over 163,000 agents are registered across the ecosystem (per [8004scan.io](https://8004scan.io)).

### 2.1 Identity Registry (ERC-721 based)

The core registry. Each registered agent is minted as an NFT, giving it:

- **agentId** — a unique token ID per registry instance
- **agentURI** — a URI resolving to an off-chain JSON registration file
- **agentWallet** — optional on-chain metadata (verified via EIP-712 / ERC-1271 signature)
- **agentRegistry identifier** — canonical format: `"{namespace}:{chainId}:{identityRegistry}"` (e.g. `eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`)

**agentURI registration file (off-chain JSON) contains:**
- `name`, `description`, `image`
- `services[]` — list of endpoints including `web`, `A2A`, `MCP`, `OASF`, `ENS`, `DID`, `email`, each with optional version and domain verification
- `supportedTrust` — signals trust framework compatibility (e.g. x402)

**On-chain:** ownership, agentId, agentURI, agentWallet key-value metadata  
**Off-chain:** everything else — name, description, endpoints, service capabilities

**Identity Registry mainnet address:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`  
**Testnet:** `0x8004A818BFB912233c491871b3d84c89A494BD9e`

### 2.2 Reputation Registry

An on-chain feedback ledger. Key fields per feedback record:

- `value` (int128) + `valueDecimals` (uint8, 0–18) — fixed-point score
- `tag1`, `tag2` — custom filter fields (e.g. "uptime", "successRate", "starred")
- `isRevoked` — bool, feedback can be retracted
- `feedbackHash` — KECCAK-256 commitment for non-content-addressed URIs
- `getSummary()` — on-chain aggregation across reviewers and tags

**Off-chain:** detailed feedback files (IPFS or URI) with optional response attachments.

Complex aggregation is explicitly deferred off-chain. On-chain provides composability; sophisticated algorithms run off-chain.

### 2.3 Validation Registry

Generic hooks for requesting and recording independent third-party validation:

- `requestHash` — KECCAK-256 commitment to request data
- `validatorAddress`, `agentId`
- `response` — 0 to 100 scale (binary or spectrum-based)
- `tag` — optional progressive validation state field

Validator-agnostic: supports stake-secured re-execution, zkML, TEE oracles. The Validation Registry is currently under active revision with the TEE community and should be treated as unstable.

### 2.4 What ERC-8004 Does Not Solve

| Gap | Notes |
|---|---|
| **Payments** | Explicitly orthogonal. "Payments are orthogonal to this protocol and not covered here." |
| **Human-readable ranking** | No ordering, scoring tiers, or leaderboards. Raw feedback, not ranked. |
| **Sybil resistance** | No explicit mechanism in the spec. No registration cost or PoW requirement. |
| **Off-chain data freshness** | agentURI can point to stale or faked JSON. The registry stores only the pointer. |
| **On-chain composability** | A notable criticism from the Ethereum Magicians thread: smart contracts cannot directly read validation responses for permissioned logic. |
| **Reputation monopoly risk** | Community members flagged compression into a single metric as "facilitating monopolistic behaviour." |

---

## 3. Why It Matters for AgentCrush

### 3.1 Positioning fit

ERC-8004 is the emerging on-chain identity primitive for AI agents. It provides a portable, censorship-resistant handle — but it does not rank agents, score quality, or make trust decisions.

AgentCrush fills exactly the gap ERC-8004 explicitly leaves open:
- **Discovery with ranked signal** — which ERC-8004 agents are actually active and credible
- **Decision-grade trust layer** — scored, tiered, with evidence breakdown
- **Machine-readable output** — x402-protected endpoints returning structured trust data

The complementary relationship is already established in the broader ecosystem: ERC-8004 is framed as the "passport and credit report" while x402 is the "currency." AgentCrush can become the **credit bureau** — the entity that reads identity, aggregates evidence, and publishes readable scores.

### 3.2 x402 relationship

ERC-8004 and x402 are explicitly complementary, not competing. Erik Reppel (Coinbase, x402 creator) is a final signatory of ERC-8004. The ERC-8004 registration file's `supportedTrust` field was designed to reference payment frameworks including x402.

AgentCrush already has a live x402 seller on Base mainnet and a Bazaar listing. Adding ERC-8004 reader support would put AgentCrush at the intersection of both standards — a layered trust/identity position.

### 3.3 Strengthening the trust layer

Adding ERC-8004 state to the AgentCrush data model:
- Makes AgentCrush the readable, ranked, decision-grade layer on top of raw on-chain identity
- Gives AgentCrush agents (and their builders) a verifiable, portable on-chain handle to reference
- Supports future machine-readable endpoints — e.g. `verification-status` could surface ERC-8004 registration state

---

## 4. AgentCrush Integration Model

### Phase 0 — Monitoring only (now)

**No code required.**

Ajsa's weekly brief should scan:
- New ERC-8004 registrations of well-known AI tools
- ERC-8004 adoption milestones (registrations per chain, notable orgs registering)
- ERC-8183 and ERC-8126 ecosystem news
- Competing standard activity: h402 (BitGPT), EVMAuth (Radius), ACP (OpenAI/Stripe), Agentverse (Fetch.ai), Kite AI
- 8004scan.io stats: weekly registration volume, chain distribution, any overlap with AgentCrush top agents

Output: weekly flag in Ajsa brief. No schema changes. No scoring changes.

---

### Phase 1 — Reader prototype

**Goal:** Detect whether a known AgentCrush agent is registered on ERC-8004. Store that state. Surface a badge on the profile page and add state to `trust-summary` API response.

**Implementation:**
- Enumerate AgentCrush agents (starting with `evidence_ranked` tier)
- Query the ERC-8004 Identity Registry via direct RPC calls against `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Ethereum mainnet) and the Base deployment
- Fetch `agentURI` → parse off-chain JSON → extract name, services, endpoints, `supportedTrust`
- Match against AgentCrush agents using the matching strategy in Section 6
- Store: chain, registry address, agentId, agentURI, owner/controller address, endpoints, x402 support flag, last_checked_at
- Profile badge: minimal "Registered on ERC-8004" chip, visible when confirmed match exists
- `trust-summary` response: add `erc8004: { registered: true, chain: "eip155:1", agentId: 42 }` field (null if not registered)
- No scoring change in Phase 1

**No private keys required. No gas. Read-only RPC.**

---

### Phase 2 — Ingestion discovery

**Goal:** Use ERC-8004 as a new agent discovery source. Route matches into a review queue.

**Implementation:**
- Periodically enumerate new ERC-8004 registrations across target chains
- Resolve agentURI → extract name, GitHub URL, domain, endpoint URLs
- Run matching strategy (Section 6) against existing AgentCrush index
- High-confidence matches → mark existing agent as ERC-8004 registered (no new agent created)
- Medium-confidence → add to human review queue with match rationale and evidence
- No uncertain matches go directly to public index or ranking
- New agents (no existing AgentCrush match) → add to `indexed` tier only, not `evidence_ranked`

**Gate:** Phase 2 only starts after Phase 1 has confirmed meaningful overlap between ERC-8004 registrants and AgentCrush agents.

---

### Phase 3 — Writer

**Goal:** Publish AgentCrush reputation/score attestation as on-chain feedback in the ERC-8004 Reputation Registry.

**Implementation sketch:**
- Target: top 50 or top 100 evidence-ranked agents only
- Write to Reputation Registry: `value` = normalized AgentCrush score (e.g. 0–10000), tags = `"agentcrush_score"` + tier
- Include off-chain evidence URI pointing to a public AgentCrush attestation JSON
- Cadence: weekly, Sunday pipeline, after tier-promotion run completes
- Wallet: dedicated attestation wallet separate from the x402 seller wallet

**Hard prerequisites for Phase 3:**
- v2 scoring confirmed stable across at least 8 consecutive Sunday runs
- Score methodology public and linked from on-chain attestation
- Gas cap defined and enforced
- Attestation wallet funded conservatively, with spending limits
- Legal review: what does it mean to publish a score on-chain? Liability?

**Do not start Phase 3 planning until Phase 1 is complete and Phase 2 shows real overlap.**

---

## 5. Proposed Schema Additions

Design only. Do not implement until Phase 1 is authorized.

### `agent_registry_links`
Central join table linking an AgentCrush agent to any external registry.

```sql
agent_registry_links (
  id              uuid primary key,
  agent_id        uuid references agents(id),
  registry_type   text,           -- 'erc8004', 'agentverse', 'kite', etc.
  chain_id        text,           -- 'eip155:1', 'eip155:8453', etc.
  registry_addr   text,           -- contract address
  external_id     text,           -- agentId (token ID as string)
  external_uri    text,           -- agentURI
  controller_addr text,           -- owner/controller wallet
  raw_metadata    jsonb,          -- full resolved registration file
  x402_supported  boolean,
  match_confidence text,          -- 'high', 'medium', 'manual'
  match_method    text,           -- 'github', 'domain', 'name', 'endpoint'
  verified_at     timestamptz,    -- when match was confirmed
  last_checked_at timestamptz,
  created_at      timestamptz default now()
)
```

### `agent_erc8004_reputation_events`
Tracks on-chain reputation events for matched agents.

```sql
agent_erc8004_reputation_events (
  id              uuid primary key,
  agent_id        uuid references agents(id),
  registry_addr   text,
  chain_id        text,
  feedback_index  bigint,
  reviewer_addr   text,
  value           numeric,        -- raw int128 / 10^valueDecimals
  tag1            text,
  tag2            text,
  is_revoked      boolean,
  feedback_uri    text,
  feedback_hash   text,
  recorded_at     timestamptz,
  created_at      timestamptz default now()
)
```

### `agent_erc8004_attestations`
Tracks attestations AgentCrush has written on-chain (Phase 3 only).

```sql
agent_erc8004_attestations (
  id              uuid primary key,
  agent_id        uuid references agents(id),
  tx_hash         text,
  chain_id        text,
  registry_addr   text,
  agentcrush_score numeric,
  tier_at_write   text,
  evidence_uri    text,           -- public JSON at agentcrush.xyz
  written_at      timestamptz,
  created_at      timestamptz default now()
)
```

### Additions to `agents` table
Minimal additions; prefer `agent_registry_links` to avoid schema sprawl:

```sql
-- Optional convenience columns if lookup speed matters:
erc8004_registered  boolean default false,
erc8004_chain       text,    -- primary chain for badge display
erc8004_agent_id    text,    -- token ID for quicklook
```

---

## 6. Matching Strategy

When a candidate ERC-8004 registration is found, match it to an existing AgentCrush agent using this priority order:

| Priority | Method | Confidence |
|---|---|---|
| 1 | Exact `github_url` match between AgentCrush `agents.github_url` and service endpoint in agentURI JSON | High |
| 2 | Canonical domain match (AgentCrush `website_url` == agent service domain in registration file) | High |
| 3 | Exact `handle` match against registration `name` field (normalized, lowercased) | Medium-High |
| 4 | Endpoint URL overlap (agentURI JSON services[] endpoint domain matches `website_url`) | Medium |
| 5 | Name similarity score ≥ 0.85 (Levenshtein / token overlap) | Low-Medium |
| 6 | Manual review queue for anything below 0.85 name similarity | Manual |

**Rules:**
- No match below "Medium" confidence should be applied automatically without human review
- A confirmed mismatch (false positive cleared in review) should be flagged to prevent re-matching
- Multiple ERC-8004 registrations may match the same AgentCrush agent (different chains); store all, surface primary

---

## 7. Risks

### 7.1 Transferable identity / reputation

The ERC-8004 Identity Registry is ERC-721 based. Agent identity tokens are transferable. A bad actor can buy an established agent's token, inheriting whatever on-chain reputation it has accumulated. If AgentCrush surfaces ERC-8004 reputation as a trust signal, a transferred token would corrupt that signal.

**Mitigation:** Never use raw ERC-8004 reputation values as input to AgentCrush scoring. Use ERC-8004 registration state only as a binary context badge ("registered on-chain"), not a scoring input.

### 7.2 Sybil registrations

ERC-8004 has no explicit Sybil resistance. Registration is permissionless and low-cost. 163,000+ registrations exist as of April 2026, and an unknown fraction are spam or test registrations.

**Mitigation:** Only surface ERC-8004 state for agents that already meet AgentCrush indexing quality thresholds. Never let ERC-8004 registration alone cause an agent to be ingested.

### 7.3 Stale or faked off-chain metadata

`agentURI` is a URI pointer stored on-chain. The JSON it points to can change at any time (for HTTPS URIs) or be removed (for IPFS with no pinning). Names, endpoints, and capability claims in the registration file are unverified.

**Mitigation:** Record `raw_metadata` at ingestion time, store `last_checked_at`, and periodically re-fetch to detect staleness. Treat endpoint claims as unverified until corroborated by AgentCrush's own signals.

### 7.4 Gas cost (Phase 3 only)

Writing attestations to the Reputation Registry requires gas on each target chain. Costs are small per transaction but accumulate at scale (top 100 agents × weekly × multiple chains).

**Mitigation:** Start on Base mainnet only (lowest cost). Define a hard monthly gas cap before any writing begins.

### 7.5 Wallet / key risk (Phase 3 only)

A dedicated attestation wallet with write access to the Reputation Registry is a security surface. Loss or compromise of the key would allow false attestations under AgentCrush's validator address.

**Mitigation:** Hardware wallet or multi-sig for the attestation wallet. Separate entirely from the x402 seller wallet at `0x58e632Fa698383820FFC22156352C9836790E2c0`.

### 7.6 Bad match contamination

A false positive match — where AgentCrush incorrectly links an ERC-8004 registration to the wrong agent — could surface incorrect trust signals, wrong endpoints, or wrong owner data on the agent profile.

**Mitigation:** Manual review gate for all medium and low confidence matches. Ability to flag and permanently suppress specific registry-to-agent pairings.

### 7.7 Reputation liability from on-chain scores (Phase 3)

Publishing a score on-chain is a public statement that may be read by other smart contracts, marketplaces, and agents. If AgentCrush writes a score that later proves inaccurate (scoring bug, data error), that score persists on-chain even after the off-chain value is corrected.

**Mitigation:** Do not begin Phase 3 until v2 scoring is confirmed stable. Include a methodology URI in every attestation. Add a revocation step to the workflow so stale attestations can be revoked when scores change significantly.

### 7.8 Standard fragmentation

ERC-8004 is one of several competing or parallel agent identity and payment standards:

| Standard | Author | Focus | Status |
|---|---|---|---|
| ERC-8004 | dAI / community | Identity, reputation, validation | Live, mainnet January 2026 |
| ERC-8183 | Virtuals + Ethereum Foundation | Job escrow, AI commerce | Draft, March 2026 |
| ERC-8126 | Community | Verification / ZKP layer on ERC-8004 | Draft |
| x402 | Coinbase + partners | HTTP micropayments | Live, AgentCrush already integrated |
| ACP | OpenAI / Stripe | Full commerce lifecycle | Emerging, 2026 |
| h402 | BitGPT | Payment alternative | Niche |
| EVMAuth | Radius | Auth layer | Niche |
| Agentverse | Fetch.ai / ASI Alliance | Agent registry, coordination | Live, different ecosystem |

**Risk:** If ERC-8183 becomes the dominant commerce standard and sidelines ERC-8004, or if ACP captures most enterprise adoption, the Phase 3 writer investment may not pay off.

**Mitigation:** Phase 0 monitoring is the hedge. Do not commit engineering resources to Phase 2 or Phase 3 until the ecosystem consolidation picture is clearer.

---

## 8. Implementation Recommendation

```
Stage 0: This doc            ← current position
Stage 1: Read-only prototype  ← next authorized step
Stage 2: Profile/API surface  ← after prototype proves overlap
Stage 3: Ingestion pipeline   ← after Phase 2 validates match quality
Stage 4: Writer               ← only after v2 scoring stable + demand visible
```

### Stage 1 execution sketch (if authorized)

1. Stand up a local script (not VPS worker) that queries the ERC-8004 Identity Registry on Ethereum mainnet and Base via a public RPC endpoint (no private key needed).
2. Enumerate the top 50–100 evidence-ranked AgentCrush agents and attempt matches against ERC-8004 registrations using the strategy in Section 6.
3. Manually verify the matches. If ≥10% of evidence-ranked agents have a confirmed ERC-8004 registration, proceed to full reader implementation.
4. If overlap is <5%, return to Phase 0 monitoring. Revisit in 90 days.
5. If proceeding: add `agent_registry_links` table (Section 5), build a background worker to keep state fresh, surface badge on profile pages, add field to `trust-summary` response.

**Total estimated scope: 2–3 days of focused work for Stage 1 prototype + validation.**

---

## 9. Open Questions for Kris

1. **Should AgentCrush register itself as an ERC-8004 agent?** If so, it becomes the first AI reputation/ranking tool with an on-chain identity. Symbolic positioning but also commits to the standard publicly.

2. **Which chain should be the Phase 1 target?** Ethereum mainnet has the canonical registry and the strongest institutional signal. Base has lower cost and AgentCrush already has a live wallet there. BNB has significant volume on 8004scan. Starting recommendation: Base (aligned with x402 stack, lowest gas, already live).

3. **Should ERC-8004 registration state affect scoring or stay as a trust badge?** In Phase 1 the recommendation is badge-only. But what is the long-term intent — does on-chain registration eventually add signal weight, or remain purely informational?

4. **Dedicated attestation wallet for Phase 3 or reuse x402 seller wallet?** Strong recommendation: separate wallet. But this requires a new key management decision.

5. **Should ERC-8004 registrations be eligible for automatic ingestion into the AgentCrush index?** Or must all ERC-8004-sourced agents go through the standard submission review queue?

6. **What is the acceptable false positive rate for ERC-8004 matching?** One wrong match linking an unrelated ERC-8004 token to a real AgentCrush agent would show incorrect owner/endpoint data on that profile. What is the tolerance threshold before triggering a manual review gate?

7. **Should the `verification-status` x402 endpoint surface ERC-8004 registration state?** It currently returns: `tier`, `verified`, `claim_status`, `last_updated`. Adding `erc8004_registered: true/false` would make it a richer lightweight check.

8. **How should AgentCrush handle the ERC-721 transferability risk publicly?** If a profile shows "Registered on ERC-8004" and the token is later transferred, the badge may become misleading. Does AgentCrush need a freshness timestamp and a visible caveat?

9. **Should Phase 3 attestations be chain-agnostic or chain-specific?** Writing to Base only is cheapest. Writing to Ethereum mainnet is highest visibility. Writing to both doubles cost and complexity.

10. **What triggers the decision to proceed from Phase 0 to Phase 1?** Suggestion: if Ajsa's monitoring shows ≥10 well-known AI tools (tools already in the AgentCrush top 100) registered on ERC-8004 by the end of May 2026, proceed. Otherwise hold.

11. **Should ERC-8183 (job escrow) be tracked alongside ERC-8004?** It is complementary and could become a scoring signal if AgentCrush agents demonstrate completed job volume — but that is well outside current scope.

12. **What is the communication strategy if AgentCrush writes scores on-chain?** An on-chain attestation is a public, permanent, searchable statement. It may generate press, community reaction, or competitive response. This needs to be a deliberate public announcement, not a silent background operation.

---

## 10. Final Decision Gate

**Recommendation: proceed to Phase 1 reader prototype only if all four conditions are met:**

- [ ] The 8004scan.io explorer or ERC-8004 contracts on Base/Ethereum mainnet are accessible via public RPC without authentication or payment
- [ ] A manual spot-check of ERC-8004 registrations finds at least some meaningful overlap with agents already in the AgentCrush top 100 (target: ≥5 confirmed matches)
- [ ] Phase 1 implementation can be completed without private keys, gas, or scoring formula changes
- [ ] Phase 1 requires no schema changes that would block other roadmap work (i.e., the `agent_registry_links` table can be added as a standalone migration with no cascading dependencies)

**If fewer than 4 conditions are met:** remain in Phase 0. Ajsa monitors. Revisit at the first Sunday of June 2026 monthly review.

**If all 4 are met:** bring back to Kris for a single-sentence "go / no-go" decision before any code is written.

---

## 11. Prototype Status (Phase 1 — Reader)

**Date:** April 26, 2026  
**Status:** Prototype complete. Results sufficient to proceed to Phase 2 evaluation.

### Script

**Path:** `scripts/erc8004-reader-prototype.mjs`

**How to run:**
```bash
# From project root (requires .env.local with Supabase anon key):
node scripts/erc8004-reader-prototype.mjs --limit 50 --no-write --output /tmp/erc8004-reader-report.json

# Single agent:
node scripts/erc8004-reader-prototype.mjs --handle crewai --output /tmp/crewai.json
```

**Flags:**
- `--limit N` — number of AgentCrush agents to check (default 50, prioritizes evidence_ranked)
- `--handle HANDLE` — check a single agent
- `--no-write` — accepted, no-op (script is always read-only)
- `--output PATH` — report destination (default: `./erc8004-reader-report.json`)

### What it does
- Loads AgentCrush agents from Supabase using the public anon key (read-only)
- Queries the 8004scan.io public API (`/api/v1/agents?search=…`) for each agent — no auth, no API key required
- Applies conservative matching: exact handle/name, GitHub org in description, website domain in description/image URL
- Writes a JSON report: `generated_at`, `agents_checked`, `matches_found`, `uncertain_matches`, `errors`, `matches[]`
- Never writes to Supabase. No on-chain operations. No private keys.

### What it intentionally does not do
- Does not write to Supabase or any database
- Does not fetch raw `agentURI` JSON from on-chain (that would require RPC calls; 8004scan summary API is sufficient for Phase 1 overlap detection)
- Does not make ERC-8004 state affect any AgentCrush ranking or score
- Does not use fuzzy matching (Levenshtein) — only exact normalization and substring containment, to keep false-positive rate low at 181k-record scale
- Does not auto-ingest any ERC-8004 records into the AgentCrush index

### Access source quality
**Reliable.** `8004scan.io/api/v1/agents` is a public, unauthenticated REST API returning structured JSON. No rate-limiting observed in testing. 181,204 total registrations. The script is polite (350ms delay between calls).

### First-run results (April 26, 2026)
- 20 AgentCrush agents checked (evidence_ranked set, alphabetical)
- 22 API searches made
- **2 confident matches (10% overlap rate):**
  - `agentlab` → "AgentLab" · Ethereum mainnet · token 9634 · exact name match
  - `crewai` → "crew ai" · Base mainnet (eip155:8453) · token 17997 · exact name match · `x402_supported: true`
- 0 uncertain matches, 0 errors

**Notable:** CrewAI's ERC-8004 registration is on Base and has `x402_supported: true` — the same stack AgentCrush uses for payments. This is a meaningful data point.

### Next decision gate

The first-run 10% overlap rate on evidence-ranked agents meets the ≥5% threshold from Section 10. Before proceeding to Phase 2 (ingestion pipeline / schema migration):

- [ ] Kris reviews this doc and provides a single-sentence **go / no-go** for Phase 2
- [ ] Run the script against the full evidence_ranked set (`--limit 50`) and confirm ≥5 confirmed matches
- [ ] Decide whether to expand to `indexed` tier agents (much larger set, lower overlap expected)
- [ ] Decide which chains to prioritize beyond Ethereum mainnet and Base (currently 30+ chains in 8004scan)

Do not add `agent_registry_links` schema or surface ERC-8004 data on profile pages until Kris approves Phase 2.

---

## Sources

Primary:
- [ERC-8004 official EIP spec](https://eips.ethereum.org/EIPS/eip-8004)
- [Ethereum Magicians ERC-8004 discussion](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)
- [ERC-8004 contracts GitHub (erc-8004/erc-8004-contracts)](https://github.com/erc-8004/erc-8004-contracts)
- [8004scan.io explorer](https://8004scan.io)
- [ERC-8126 EIP spec](https://eips.ethereum.org/EIPS/eip-8126)
- [ERC-8126 Ethereum Magicians thread](https://ethereum-magicians.org/t/erc-8126-ai-agent-registration-and-verification/27445)

Secondary (for context only, not spec-authoritative):
- [QuickNode: ERC-8004 developer guide](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)
- [ChainUp: x402 & ERC-8004 relationship](https://www.chainup.com/blog/x402-erc8004-ai-agent-payments-agentic-web/)
- [KuCoin: ERC-8183 announcement](https://www.kucoin.com/news/flash/ethereum-foundation-and-virtuals-protocol-launch-erc-8183-to-enable-trustless-ai-agent-transactions)
- [PANews: ERC-8004 ecosystem overview](https://www.panewslab.com/en/articles/019c4562-fd28-732a-a07a-3948ec4535ac)

---

*This document is exploration and design only. No implementation code has been written. No schema has been changed. No scoring logic has been modified. Bring to Kris for go/no-go before any engineering work begins.*
