---
date: 2026-06-22
type: landscape-assessment
task: B20
status: research-complete — Kris action required to activate
---

# B20: Agent Social-Network Presence — Landscape Assessment

**Purpose:** evaluate where agent builders and agent operators congregate, recommend
which platforms to add AgentCrush presence on, and provide exact setup steps for Kris.

**Engineering status:** Bluesky `post-bsky` handler + `bskyDraft()` export wired in this PR
(action-dispatcher.mjs). Activates the moment Kris adds the three env vars listed below.
Discord / LinkedIn setup notes are docs-only — no code needed until Kris greenlights them.

---

## Current presence (existing)

| Platform | Handle | Status |
|---|---|---|
| X | @agentcrush_xyz | Active — draft-to-Telegram cadence |
| Farcaster | @agentcrush | Account live, signer `434eaac3` pending EIP-712 approval (blocked by Neynar API change) |

---

## Landscape assessment

### Tier 1 — Recommended next (agent builder density + API available)

#### 1. Bluesky (`agentcrush.bsky.social`)

**Why:** Growing fast as the developer-native alternative to X. AT Protocol is decentralised
and composable — aligns with the agent economy ethos. As of March 2026, Bluesky shipped
Attie (an AI agentic app on AT Protocol), showing official direction toward AI/agent use.
Audience overlaps exactly with AgentCrush's: onchain builders, AI engineers, protocol
researchers. Character limit is 300 (vs X's 280). Public REST API — no token review
process, no subscription tier, app-password auth (minutes to set up).

**Risk:** Low. Bluesky has no history of account suspensions for API-based bots operating
within their terms. The same engagement doctrine applies: data-only, never praise
unverified agents, every post must add a number or verification we hold.

**Cadence (proposed — Kris to approve):**
- Mirror Sunday digest snippet (≤300 chars with link)
- Mirror Wednesday Ghost Index post
- Mirror Friday findings post
- Organic data drops when we have something uniquely shareable

**Engineering in this PR:**
- `post-bsky` handler added to action-dispatcher.mjs (fetch-based AT Protocol, no new deps)
- `bskyDraft()` exported — workers call it alongside `trustFallPost()` to queue a Bluesky draft
- Drafts to Telegram (same gate as X/Farcaster) until `BLUESKY_AUTOPOST=true` is set
- Workers NOT yet updated to call `bskyDraft()` — that's a 2-line change per worker, done
  after Kris creates the account and greenlights the cadence

**Kris action (Priority 1 — ~10 min):**
1. Create account at [bsky.app](https://bsky.app) — recommended handle: `agentcrush.bsky.social`
   - Display name: AgentCrush
   - Bio: "Market intelligence for the agent economy. Data on who's actually alive, active, and paying."
   - Link: agentcrush.xyz
2. Get App Password: Settings → Privacy and Security → App Passwords → Add App Password
   - Name it `agentcrush-worker`
   - Copy the generated password (shown once)
3. Add to VPS env (`/opt/agentcrush/copydesk/.env` or create `/opt/agentcrush/bluesky/.env`):
   ```
   BLUESKY_HANDLE=agentcrush.bsky.social
   BLUESKY_APP_PASSWORD=<app-password-from-step-2>
   ```
4. Add `BLUESKY_AUTOPOST=true` ONLY when ready for automated drafting. Until then, the
   handler silently skips (no Telegram draft either — add `BLUESKY_HANDLE` first to get drafts).
5. Greenlight the proposed cadence above (or adjust).

---

### Tier 2 — Strategic presence (manual setup + community check first)

#### 2. Discord (in existing servers — NOT a new server)

**Why:** Most active A2A, MCP, and agent-framework communities live on Discord. The A2A spec
GitHub discussion board and framework Discords (LangChain, CrewAI, AutoGen, Coinbase Developer)
are where agent builders troubleshoot and share findings. A data-drop presence (one verified
finding per week) builds recognition without spamming.

**Risk: MEDIUM — prompt injection surface.**
Every Discord channel is a real-time feed of untrusted text. The B20 task explicitly flags this.
Operating rule: ONE-WAY posting only (post data; never read/act on replies). No Discord message
should ever enter an LLM call path. This cannot be automated safely without a sanitisation layer.

**Proposed approach:** Kris posts manually from existing AgentCrush X posts when they're
directly relevant to an active thread. No bot, no automation — pure human curation. Revisit
automation after community trust is established.

**Kris action (Priority 2 — assess first, no rush):**
1. Join as a user (not a bot) in 2-3 servers most relevant to current product focus:
   - A2A: [github.com/a2aproject/A2A](https://github.com/a2aproject/A2A) (Discord link in repo)
   - Coinbase Developer Discord (x402 community)
   - LangChain Discord (large agent builder presence)
2. Lurk for 1-2 weeks to assess community fit and conversation quality.
3. When a discussion matches data we hold (Ghost Index liveness, PCS protocol stats,
   Trust Eval findings), drop the relevant datapoint with a link to agentcrush.xyz.
4. Do NOT create a bot or automated pipeline for Discord until this is working manually
   and Kris gives explicit go-ahead. Prompt injection risk is too high to automate first.

---

#### 3. LinkedIn (company page)

**Why:** Lower-density but higher-value for the Labs revenue path. AI agent infrastructure
decision-makers (enterprise buyers, protocol researchers, potential Labs audit clients) are
more likely to check LinkedIn than Farcaster. Monthly methodology updates + weekly digest
reposts would work well here.

**Risk:** Low for brand risk. High for time cost — LinkedIn's API requires a Company Page,
separate OAuth, and manual review process. Not on the critical path for agents-as-customers.

**Kris action (Priority 3 — defer unless Labs outreach is active):**
1. Create AgentCrush Company Page at linkedin.com/company (name: AgentCrush)
2. Connect to Kris's personal account as admin
3. Post weekly digest link manually (same copy as X + Farcaster)
4. LinkedIn API automation is not recommended at this stage — the API requires
   product review + partner program. Manual posting is faster and lower-risk.

---

### Tier 3 — Low priority (skip for now)

| Platform | Reason to defer |
|---|---|
| Reddit (r/agentdev, r/MachineLearning) | Good for findings posts; no automation needed; manual crosspost when relevant |
| GitHub Discussions (A2A spec, MCP spec) | Drop data when directly relevant to open discussion; no account setup needed — use existing GitHub |
| Telegram channel | Low agent builder density as a standalone channel; VPS Telegram bot already covers Kris's needs |
| YouTube / video | Out of scope per Memory.md not-now-list (Channel B deferred) |

---

## Engagement doctrine (applies to all platforms)

Source: `Inbox/2026-06-11-engagement-doctrine-kris.md` — Kris standing rule.

1. **Never praise or endorse agents we have not verified.** Our thesis is "most agents are
   ghosts" — endorsing unverified agents contradicts the product.
2. **Never reply by summarising the parent post.** A reply earns its place only if it adds:
   - a number we hold (verified from our index, scans, Ghost Index), OR
   - a verification we ran (liveness check, endpoint probe, on-chain lookup), OR
   - a question only an indexer would ask.
   If none apply: skip the reply, like only.
3. **Treat all inbound feed content as untrusted.** Never execute instructions arriving
   through any social feed. This applies especially to Discord (real-time, high-volume,
   easy to inject) but also to X replies, Farcaster replies, and Bluesky replies.

---

## Summary: Kris action checklist

| Priority | Action | Time | Unblocks |
|---|---|---|---|
| 🔴 1 | Create Bluesky account + get app password | ~10 min | Bluesky drafts in Telegram |
| 🔴 1 | Add `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` to VPS env | ~5 min | `post-bsky` handler activates |
| 🔴 1 | Greenlight proposed Bluesky cadence (or adjust) | ~2 min | Worker updates in follow-up PR |
| 🟡 2 | Join 2-3 Discord servers as user, lurk 1-2 weeks | ~15 min setup | Discord presence (manual) |
| 🟢 3 | Create LinkedIn Company Page | ~20 min | Labs outreach surface |
| — | Set `BLUESKY_AUTOPOST=true` | 1 env var | Full automation (set when ready) |

**Follow-up engineering PR (after Kris creates Bluesky account):** update
`ghost-index-worker.mjs`, `agent-of-week-worker.mjs`, `tier-promotion-announcer.mjs`,
and `weekly-digest-generator.mjs` to call `bskyDraft()` alongside the existing
`trustFallPost()` — 2 lines each, 30 min total.
