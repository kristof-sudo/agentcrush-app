# ERC-8183 Reader Adapter — Scoping Brief

**Created:** May 5, 2026
**Owner:** Kris
**Type:** Research / scoping only — no code, no tables, no workers
**Status:** Build next (conditional on go/no-go below)

---

## 1. What ERC-8183 represents in the agent-commerce stack

ERC-8183 is a proposed Ethereum standard for a structured agent-commerce job lifecycle. Where ERC-8004 answers "is this agent registered and who owns it?", ERC-8183 answers "can agents negotiate, fund, execute, evaluate, and settle a job?".

The stack position from `docs/AP2_X402_TRACKING_BRIEF.md`:

```
Identity / registry layer:   ERC-8004  → Is this agent registered on-chain?
Job lifecycle / evaluator:   ERC-8183  → Can agents transact in a structured commerce lifecycle?
HTTP payment layer:          x402      → Can an agent pay per request?
Tool / interface layer:      MCP       → Can an AI client call this tool?
```

ERC-8183 is sometimes discussed alongside ACP (Agent Commerce Protocol) from the Virtuals Protocol ecosystem. The relationship:
- **ACP (Virtuals):** A live protocol with deployed contracts. Implements a job-request → negotiation → funded-escrow → deliver → evaluate → settle lifecycle. Active on Base mainnet.
- **ERC-8183:** A formal Ethereum Improvement Proposal attempting to standardize the same lifecycle pattern. May be the EIP formalization of the ACP pattern, or a parallel effort. **Relationship requires verification.**

Key job states in the ACP/ERC-8183 model:
- `Open` — job created, awaiting acceptance
- `Funded` — escrow funded by client agent
- `Submitted` — provider delivers work
- `Completed` / `Disputed` / `Refunded` — terminal states

Key actors:
- **Client agent** — initiates job, funds escrow
- **Provider agent** — executes work, claims payment
- **Evaluator agent** — optional third party that arbitrates disputes or validates delivery

---

## 2. What public data sources exist today

| Source | Exists? | Notes |
|---|---|---|
| ACP deployed contracts (Base mainnet) | To verify | Virtuals Protocol has deployed ACP on Base — confirm contract address |
| ERC-8183 EIP document | Likely | Standard EIP format at eips.ethereum.org — verify EIP number and draft status |
| Public indexer / subgraph for ACP | Unknown | Virtuals may have a subgraph; no confirmed public URL yet |
| ACP explorer / scan | Unknown | Similar to 8004scan.xyz for ERC-8004 — to verify if one exists |
| ACP SDK / client library | Likely | Virtuals Protocol SDK likely exposes ACP job creation |
| Public API / REST endpoint | Unknown | No confirmed public API for reading ACP jobs programmatically |
| On-chain events | Yes (if deployed) | All state transitions are on-chain events, readable via RPC if contract address is known |

**Current verdict:** The data source situation is less mature than ERC-8004 at the time AgentCrush built its reader. ERC-8004 had 8004scan.xyz as a reliable source. ERC-8183 / ACP does not have a confirmed equivalent public indexer as of May 5, 2026.

**Key open questions before build decision:**
1. Is there a confirmed ACP contract address on Base mainnet?
2. Does a public subgraph or indexer exist for ACP job events?
3. Is ERC-8183 the canonical EIP or is it still a draft?
4. Is ACP (Virtuals) the same standard, a compatible implementation, or a competing approach?

---

## 3. Fields AgentCrush would track

If a buildable public data source exists, these are the fields worth capturing:

| Field | Type | Source | Notes |
|---|---|---|---|
| `job_id` | string | on-chain | Contract-assigned job identifier |
| `client_agent_address` | string | on-chain | Wallet / agent address initiating the job |
| `provider_agent_address` | string | on-chain | Wallet / agent address executing the job |
| `evaluator_address` | string or null | on-chain | Optional third-party evaluator |
| `status` | enum | on-chain | Open / Funded / Submitted / Completed / Disputed / Refunded |
| `escrow_amount` | decimal | on-chain | Amount in escrow (stablecoin, e.g. USDC) |
| `payment_token` | string | on-chain | Token contract address (e.g. USDC on Base) |
| `deliverable_pointer` | string or null | on-chain / IPFS | Hash or URI pointing to delivered work |
| `chain_id` | integer | on-chain | e.g. 8453 (Base mainnet) |
| `chain_name` | string | derived | e.g. "Base" |
| `created_at` | timestamp | on-chain | Block timestamp of job creation |
| `funded_at` | timestamp or null | on-chain | Block timestamp of escrow funding |
| `submitted_at` | timestamp or null | on-chain | Block timestamp of delivery |
| `resolved_at` | timestamp or null | on-chain | Block timestamp of terminal state |
| `evidence_url` | string or null | derived | Link to deliverable or verification proof |

**Agent matching challenge:** Client and provider addresses are wallet addresses. Mapping these back to AgentCrush agent handles requires either:
- The same wallet appearing in an ERC-8004 registration (which has an owner_address field), or
- A self-reported mapping from the agent's profile

This is the same challenge solved for ERC-8004 using `match_confidence` tiers.

---

## 4. Relation to existing AgentCrush entities

| AgentCrush concept | ERC-8183 equivalent | Mapping approach |
|---|---|---|
| `agents.id` | `client_agent_address` or `provider_agent_address` | Via ERC-8004 owner_address or self-reported claim |
| `agent_erc8004_registrations` | ACP job actors | Cross-reference: if the wallet in a job matches an ERC-8004 owner, link |
| `events` table | Job state transitions | ACP job status changes are events worth logging |
| `evidence_tier` | Transaction-verified | Confirmed on-chain jobs are `onchain` tier — highest confidence |
| `payment_rails_supported` | `erc8183_acp` rail entry | A confirmed ACP job makes this a `verified` / `onchain` rail |

**New table needed:** `agent_erc8183_jobs` (if built). Would store job records linked to agent_id via wallet address matching. No FK to `agents` unless match is confirmed — same pattern as `agent_erc8004_registrations`.

---

## 5. Why no scoring impact initially

Same principle as ERC-8004 reader v1:

- **Low adoption:** ACP/ERC-8183 is still early. Few agents have participated in confirmed jobs. A scoring signal based on sparse data would create noise.
- **Self-reported risk:** An agent can self-declare ACP support without any on-chain activity. Without distinguishing verified job history from self-reported claims, scoring would be gamed.
- **Mapping ambiguity:** Wallet → AgentCrush agent mapping is probabilistic, not deterministic. Including uncertain matches in scoring would lower score quality.
- **Protocol stability:** ERC-8183 / ACP may still be in draft. Scoring inputs from an unstable spec create technical debt.

**Initial treatment:** Informational only. Surface as `payment_rails_supported.erc8183_acp` with `evidence_tier = onchain` when a confirmed job is found, with no ranking weight.

---

## 6. Go / no-go criteria for building the adapter

**Go if all of the following are true:**
- [ ] Confirmed ACP contract address on Base mainnet (publicly documented)
- [ ] A public indexer, subgraph, or event API exists that can be queried without custom RPC infrastructure
- [ ] At least one evidence_ranked AgentCrush agent can be linked to an ACP job via ERC-8004 wallet matching or confirmed self-report
- [ ] ERC-8183 EIP is at least draft-final or ACP is confirmed as the reference implementation
- [ ] Build time estimate ≤ 1–2 days for reader + table + profile surface

**No-go if any of the following:**
- No public indexer exists and building one requires running an archive node
- Wallet → agent mapping rate is < 5% of indexed evidence_ranked agents (too sparse to be useful)
- ACP contract address is unconfirmed or the standard is still in flux
- ERC-8183 and ACP turn out to be incompatible approaches that would need separate adapters

---

## 7. Recommended next step

**Status: Monitor — do not build yet.**

**Rationale:** The public data source situation is unconfirmed. Before committing build time, spend 30–60 minutes on manual research:

1. Find and confirm the ACP contract address on Base mainnet (check Virtuals Protocol docs / GitHub)
2. Check whether a subgraph or public API exists for ACP jobs
3. Confirm the relationship between ERC-8183 EIP and Virtuals ACP
4. Estimate how many evidence_ranked AgentCrush agents have ERC-8004 wallet data that could be matched to ACP jobs

If that research confirms a public indexer and at least some match potential, upgrade to **Build next** and open a separate build chat.

**Research session estimate:** 30–60 min. Can be done in Ajsa brief, a Claude research session, or manually via blockchain explorer + GitHub.

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No public indexer — only RPC | High | Would require running archive node or paying for RPC API access. Not worth it at current scale. |
| Low adoption — < 10 agents in index with ACP jobs | Medium | Monitor; build only when adoption grows. Surface as a Labs intelligence signal. |
| Ambiguous agent mapping | Medium | Require ERC-8004 wallet match before linking to AgentCrush agent. Never infer from name alone. |
| Self-reported claims without on-chain evidence | High | Only accept `verified_api` or `onchain` evidence_tier for ACP rail entries. Reject self-reported. |
| ERC-8183 / ACP incompatibility | Low-Medium | If they diverge, treat as two separate surfaces. Neither gets scoring weight until one is clearly dominant. |
| Chain fragmentation | Low | ACP appears Base-focused. Monitor Ethereum mainnet deployment. Do not pre-build multi-chain. |
| Deliverable pointer is IPFS / off-chain | Low | Store the pointer, do not fetch content. IPFS availability is external dependency. |

---

## 9. What changes when we are ready to build

When go/no-go flips to go, open a dedicated build chat with:
- Confirmed ACP contract address
- Confirmed subgraph or API URL
- Proposed table name: `agent_erc8183_jobs`
- Schema draft (reference section 3 above)
- Initial agent set to test wallet matching (evidence_ranked agents with ERC-8004 registration)

Do not create the table or worker in this scoping session.

---

*See also: `docs/AP2_X402_TRACKING_BRIEF.md` — ERC-8183 in the full stack | `docs/ERC8004_INTEGRATION_EXPLORATION.md` — ERC-8004 reader precedent | `docs/INTELLIGENCE_BACKLOG.md` — ERC-8183 reader adapter entry (Build next)*
