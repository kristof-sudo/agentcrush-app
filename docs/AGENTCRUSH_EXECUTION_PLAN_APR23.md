# AgentCrush — Consolidated Execution Plan
**Created:** April 23, 2026
**Horizon:** 8 weeks (through mid-June)
**Authored for:** Strategy handoff to build chat + Claude Code sessions
**Strategic frame:** Early phase of A2A commerce + x402. Aggressive seed-planting. Ship complementary work within 48h of major catalyst events. Stay multi-registry-neutral (ERC-8004 as one of several output channels, not exclusive). Dual goals: own the "trust and reputation layer for AI agents" position, and build toward acquirable asset (not a marketing claim — an operational discipline).

---

## TABLE OF CONTENTS

1. Immediate cleanup (this week)
2. Ajsa — Daily Intelligence & Project Manager Agent (priority 1)
3. Scoring hardening (priority 2)
4. Distribution surfaces (priority 3)
5. ERC-8004 integration exploration (priority 4)
6. Ongoing agent ingestion (background, continuous)
7. Website messaging refresh (priority 5, small effort)
8. Weekly review ritual (process, not task)
9. Deferred / not-now list
10. Handoff notes for build chat / Claude Code

---

## 1. IMMEDIATE CLEANUP (This Week — 30 minutes total)

These are finishing touches from prior work that are sitting unfinished.

- [ ] Run SQL fix in Supabase: `UPDATE agents SET entity_type = 'agent' WHERE entity_type IS NULL OR entity_type != 'agent';` — makes 29 invisible agents visible
- [ ] Verify Bazaar listing status for AgentCrush — check agentic.market daily for 72 hours from Apr 22
- [ ] If not indexed by Apr 25, ask in Coinbase x402 Discord about indexing timing
- [ ] Close X account loop: do NOT log in to Mike's account to "resolve violations". Treat account as permanently dead.
- [ ] Check card statement for X Premium $5/mo charge. Dispute via card issuer if any post-suspension billing appears.

---

## 2. AJSA — DAILY INTELLIGENCE & PROJECT MANAGER AGENT

**Priority: 1 (ship first, enables everything else)**
**Effort: 2-3 days Claude Code + ongoing source curation**
**Infrastructure: reuse Mike's archived VPS pipeline (OpenClaw)**

### Why this first

Ajsa is the force multiplier for every other task in this document. Without her, you miss catalysts. Without catalysts, your "ship within 48h" strategy doesn't work. Build the operating system before building more product.

### Morning brief (daily, 7:00 Budapest)

Delivered via Telegram. Format: 5 items max, each with ~2 sentences + optional action.

Each item structured as:
- **Signal:** what happened
- **Source:** where Ajsa saw it
- **Why it matters for AgentCrush:** 1-sentence framing
- **Suggested action (if any):** e.g., "consider writing a Farcaster post", "consider adding to scoring sources"

### Sources (initial curated list — expand over time)

**Tier A — must check daily:**
- Coinbase CDP blog + changelog
- x402 Discord summary (if accessible) or x402 Foundation posts
- Fetch.ai blog + ASI Alliance announcements
- Ethereum Foundation dAI team updates (ERC-8004, ERC-8183, ERC-8126 activity)
- Kite AI blog + Twitter announcements
- Virtuals Protocol announcements
- Farcaster /ai and /agents channels (top posts from past 24h)

**Tier B — check daily, filter for relevance:**
- Hacker News — filter posts tagged/mentioning: ai agent, x402, erc-8004, autonomous agent, agent directory
- Reddit r/LocalLLaMA, r/AI_Agents, r/MachineLearning — top of day
- Product Hunt — new launches with "agent" in title/description
- GitHub trending — filter for agent-related repos (new agents to index!)

**Tier C — curated Twitter/X list (via nitter RSS since X API is dead):**
Start with: @a16zcrypto, @bankrbot, @cryptoF0XXY, @aiedge_, @ASI_Alliance, @fetch_ai_IL, @bc1beat, @Cheetah_x0, @GoKiteAI, @KAIKOLABS, @santifer, @0xSammy, @haitzu, @TAOInstitute_, @Lemz_42, @KhalaResearch, @HowToAI_, @hasantoxr, @DanielEdrisian, @dhruvtwt_

Also add: @coinbase, @CoinbaseDev, @brian_armstrong, @jessepollak, @cloudflaredev, @Stripe, @paradigm, @virtuals_io, @KiteAIOfficial

**Tier D — competitor monitoring (weekly, not daily):**
- aiagentsdirectory.com — look for new features, new agents, UX changes
- agentsindex.ai — newsletter archive, new collections
- MIT AI Agent Index — new agents added, annotations
- Bankr, Virtuals, Kite — their own product additions

### Weekly strategic review (Sunday, 18:00 Budapest)

Different format. Delivered via Telegram + saved to Supabase as weekly_reviews table for historical reference.

Sections:
1. **Drift flags:** things you said you'd do but haven't, with commit history / git activity / dashboard comparisons
2. **Unasked questions:** 3-5 questions you haven't asked yourself recently (examples: "when did you last look at your homepage from a cold visitor's perspective?", "have you checked whether X competitor shipped something new in the past 10 days?", "is your scoring ranking still top-heavy with the same top 10?")
3. **Opportunity backlog:** catalysts from the week that haven't been addressed yet
4. **Catalyst watch status:** for each of the 7 tracked catalysts, any movement observed?

### Catalyst watch list (tracked continuously, flagged immediately in morning brief)

- Stripe x402 revenue disclosure
- Frontier AI model USDC wallet integration (ChatGPT, Claude, Gemini)
- Named enterprise x402 deployments
- Cloudflare pay-per-crawl general availability
- First commercial robot x402 deployment
- ERC-8004 adoption announcements or major integration
- Competing standards (h402, EVMAuth) gaining traction
- Any "AgentCrush-equivalent" competitor raising money or shipping big

### AgentCrush self-monitoring (daily check, flag anomalies)

- Vercel Analytics: daily visitor count, top pages, bounce rate
- Search Console: impressions, clicks, indexing status
- Supabase: daily snapshot coverage, new agents added, `entity_type` consistency
- VPS timers: all active timers running as expected (github-snapshot, news-fetch, weekly-ingest)
- x402 wallet (0x58e632Fa...): USDC balance changes (indicates real payments)
- Bazaar listing status

### Technical architecture

- Build as OpenClaw agent on existing VPS
- Use Supabase as persistent state/memory store (new tables: `ajsa_sources`, `ajsa_brief_items`, `ajsa_weekly_reviews`, `ajsa_catalyst_state`)
- LLM inference via existing OpenAI/Anthropic API keys
- Telegram integration via existing bot (Mike's bot, repurposed)
- Systemd timers: morning brief at 07:00, weekly review at 18:00 Sunday
- All source fetches cached 24h to avoid rate limits
- Brief approval flow: Telegram sends brief, Kris can reply "expand X" or "ignore Y" — feedback improves future filtering

### Tasks for build chat / Claude Code

- [ ] Design Supabase schema for Ajsa tables (ajsa_sources, ajsa_brief_items, ajsa_weekly_reviews, ajsa_catalyst_state, ajsa_feedback)
- [ ] Build source fetcher modules (one per Tier A/B/C source, modular so adding sources is cheap)
- [ ] Build synthesis LLM prompt that produces the 5-item morning brief
- [ ] Build weekly review synthesis prompt (different structure, reads from week's brief history + git + Supabase state)
- [ ] Wire to Telegram
- [ ] Wire to VPS systemd timers
- [ ] Add self-monitoring module (Vercel, Supabase, wallet, timers)
- [ ] Test with 3 days of dry runs before going live

### Success criteria

- Morning brief arrives at 7:00 Budapest time daily for 7 consecutive days
- At least one item per week prompts Kris to take an action he wouldn't have taken otherwise
- Weekly review surfaces at least one "drift flag" or "unasked question" that lands

---

## 3. SCORING HARDENING

**Priority: 2 (differentiator, required for "decision-grade" positioning)**
**Effort: 5-7 days across multiple sessions**
**Infrastructure: extend existing VPS scoring pipeline**

### Why this matters

Current scoring is ~45% GitHub-only. Rankings are sedimentary. If asked on a podcast why AgentCrush is unique, the honest answer today is weak. This is the single biggest product weakness. Hardening turns "GitHub-based directory" into "multi-signal decision-grade reputation layer."

### Layer 1 — Free, multi-source fusion (replace X signal)

All free public APIs, 1-3 days per signal.

- [ ] **npm download counts** — weekly/monthly downloads for JavaScript-shipped agents. Use npmjs.org API. Weekly write to `agent_npm_signals` table.
- [ ] **PyPI download counts** — same for Python-shipped agents. Use PyPI BigQuery or pypistats.org API. Weekly write to `agent_pypi_signals`.
- [ ] **Dependency graph discovery** — weekly GitHub job that pulls `package.json` and `requirements.txt` from top 10,000 AI/ML repos, counts references to each agent name. Builds *automatic* ecosystem graph alongside the 125 manually curated edges. This is probably the single biggest signal win.
- [ ] **HackerNews mentions** — Algolia API (free). Search for agent names weekly, track mention count + upvote totals. Write to `agent_hn_signals`.
- [ ] **Reddit mentions** — Reddit API (free tier), check r/LocalLLaMA, r/AI_Agents, r/MachineLearning weekly for agent name mentions. Write to `agent_reddit_signals`.
- [ ] **Docs quality score** — automated check per agent: docs site exists, README length, example count, OpenAPI spec presence, license file. Write to `agent_docs_signals` as 0-100.

### Layer 2 — AgentCrush native signals (genuine moat, require feature build)

Can't generate these without the features that produce the data.

- [ ] **Profile page view tracking** — pair with Vercel Analytics or custom PostHog instance. Daily page view count per agent profile. Write to `agent_view_signals`.
- [ ] **Search frequency tracking** — log searches on agentcrush.xyz into `search_queries` table. Daily aggregate per agent handle mentioned.
- [ ] **Watchlist feature (user-facing)** — requires auth layer. Watchlist adds per agent per week = strong demand signal. Deferred until auth exists (month 2+).
- [ ] **Claim request rate** — already in schema as `claim_requests` table. Daily aggregate.
- [ ] **User ratings (light)** — one-click upvote/downvote on agent profiles with reason tag. Requires minimal auth (email confirmation). Deferred until month 2.

### Layer 3 — Trust state signals (automated, low effort)

- [ ] **Breaking-change detection** — parse CHANGELOG.md files on agent GitHub repos, count major version bumps in past 90 days. High count = instability. Weekly job.
- [ ] **Maintenance signal** — days since last commit on main branch. Already in GitHub snapshot worker, just surface it.
- [ ] **License type** — MIT/Apache/GPL/proprietary/none. Indicates openness. One-time fetch per agent, refresh quarterly.

### Revised scoring weights

| Signal | Old | New |
|--------|-----|-----|
| GitHub Activity | 25% | 20% |
| Usage (npm/PyPI downloads + dependency graph) | 0% | 25% |
| Discourse (HN + Reddit + docs quality) | 0% | 15% |
| Ecosystem Integration Depth (auto-discovered) | 20% | 15% |
| AgentCrush Native (views/searches/claims/watchlist) | 0% | 15% |
| Trust State (claim, verification, breaking-change, maintenance) | 0% | 10% |
| X/Twitter | 25% | 0% (dead) |
| Builder Community | 15% | 0% (deferred to Month 3+) |
| HN + Reddit (old plan) | 10% | merged into Discourse above |

Key change: usage signals (what people download/depend on) become the largest weight. GitHub becomes confirmation, not dominant. AgentCrush native becomes meaningful once features ship.

### Publishing the methodology

- [ ] Build `/how-we-rank` page explaining all signals, their weights, their sources, their limitations, their update frequency. Link from every agent profile page. Link from `/api-docs`. This is a credibility artifact as much as documentation.
- [ ] Add weekly "Methodology Review" post (automated draft, Kris approves) — published as blog-style content page at `/rankings-review/YYYY-WW`. Summarizes what moved, why, any surprises. Low volume, high credibility compound.

### Tasks for build chat / Claude Code

- [ ] Create new Supabase tables: `agent_npm_signals`, `agent_pypi_signals`, `agent_hn_signals`, `agent_reddit_signals`, `agent_docs_signals`, `agent_view_signals`, `agent_trust_signals`, `auto_dependency_edges`
- [ ] Build one worker per signal in `/opt/agentcrush/scanner/signals/` with shared interface (fetch → normalize → write)
- [ ] Wire each to systemd timer (weekly for most, daily for views)
- [ ] Update `recalc_rankings()` function to use new weighted formula
- [ ] Build `/how-we-rank` page (Next.js, matches existing aesthetic)
- [ ] Add methodology review automation as a weekly task

### Success criteria

- 4+ independent signal sources live and writing data
- Ranking changes meaningfully week-over-week (top 10 shuffles occasionally)
- `/how-we-rank` page live, links from agent profiles
- Podcast-ready answer for "why is your ranking unique"

---

## 4. DISTRIBUTION SURFACES

**Priority: 3 (attack the real bottleneck — discovery)**
**Effort: mixed — several independent deliverables, 1-3 days each**

### Why this matters

Your product is good enough to win if found. It's not found. Every distribution surface is a separate attempt to be found in a place your audience already is.

### 4A — Embeddable badge (ship first, simplest)

- [ ] Build `/embed/[handle].svg` route returning SVG badge with live rank + score
- [ ] Badge clickable, routes back to agentcrush.xyz/agent/[handle]?utm_source=badge
- [ ] Add "Embed your rank" CTA prominently on every agent profile page, with ready-to-copy HTML snippet
- [ ] Track badge impressions via UTM parameters

### 4B — Farcaster activation

- [ ] First post: x402 launch announcement with transaction hash + agentic.market link
- [ ] Second post (within 3 days): "Rising Now this week" — pulls from agent_daily_snapshots, lists top 3 movers, embeds visualization
- [ ] Build Farcaster Frame for agent lookup: user types agent handle inside a Frame, gets back trust summary as image
- [ ] Commit to weekly cast cadence: every Monday morning "Rising Now" post (automated draft, manual approve)
- [ ] Engage in /ai and /agents channels — 15 min/day, 4 days/week

### 4C — Second x402 endpoint (verification-status at $0.005)

- [ ] Build `/api/agent/[handle]/verification-status` endpoint (simple: handle, verified, claim_status, last_updated)
- [ ] Wrap with x402 at $0.005
- [ ] Add Bazaar metadata with category "reputation", tags ["identity", "verification", "kya"]
- [ ] Deploy

### 4D — MCP server

- [ ] Implement Model Context Protocol server that exposes AgentCrush read endpoints to Claude Desktop, Cursor, etc.
- [ ] Specifically: lookup_agent(handle), get_history(handle), compare_agents(handles[]), search_agents(query)
- [ ] Publish MCP manifest to the MCP registry
- [ ] Document at /mcp or /developers/mcp

### 4E — CLI tool

- [ ] Build `npx agentcrush <command>` tool (Node, published to npm)
- [ ] Commands: `lookup <handle>`, `rank <category>`, `movers`, `history <handle>`
- [ ] Beautiful terminal output with colors, tables
- [ ] Publish to npm, submit to HN with title "Show HN: agentcrush CLI — query the AI agent index from your terminal"

### 4F — Fetch.ai / Agentverse registration

- [ ] Register AgentCrush as a Fetch Business agent
- [ ] Expose query endpoint in ASI:One marketplace
- [ ] Documentation on fetch integration at /integrations/fetch

### 4G — Comparison pages (SEO play)

- [ ] Build `/compare/[handle1]-vs-[handle2]` dynamic route
- [ ] Auto-generate for top 50 most-searched agent pairs (seeded from internal logic, not query logs we don't yet have)
- [ ] Include: side-by-side scores, 30-day score charts, ecosystem overlap from agent_relationships, 200-word LLM-generated verdict (Kris approves via Telegram)
- [ ] Submit updated sitemap to Google

### 4H — VS Code extension (lower priority, good attention play)

- [ ] Build VS Code extension: hover over any string matching an agent handle, show inline tooltip with trust summary
- [ ] Publish to VS Code marketplace
- [ ] Developer audience overlap with AgentCrush is very high

### Tasks for build chat / Claude Code

Each sub-section above is an independent Claude Code job. Ship in order 4A → 4C → 4B → 4D → 4E → 4F → 4G → 4H. Don't batch into one session.

### Success criteria

- Embeddable badges on 5+ external sites by end of month 2
- Farcaster following grows to 50+ organic follows by end of month 2
- Second x402 endpoint on Bazaar
- MCP server listed in MCP registry
- CLI tool on npm with 20+ weekly downloads
- Agentverse listing live
- 10+ comparison pages ranking in Google for their target queries by end of month 3

---

## 5. ERC-8004 INTEGRATION EXPLORATION

**Priority: 4 (strategic, not urgent — exploration before commitment)**
**Effort: 1 week exploration, then 1-2 weeks implementation if green-lit**

### The framing (clarified from prior conversation)

AgentCrush stays multi-registry-neutral. ERC-8004 becomes one of several output channels, alongside Bazaar discovery, Fetch.ai Agentverse, and SEO. Integration = you publish attestations to ERC-8004 and read from it, not that you depend on it exclusively.

### Exploration phase (before coding)

- [ ] Read ERC-8004 spec in full (Ethereum Foundation docs)
- [ ] Read related: ERC-8183 (agentic commerce / Virtuals), ERC-8126 (agent verification / risk scoring)
- [ ] Review 8004scan.io — look at existing agent registrations, what data is on-chain
- [ ] Identify: which AgentCrush agents overlap with existing ERC-8004 registrations? (Cross-reference agent handles / GitHub names with registered agents)
- [ ] Write 1-page "ERC-8004 integration design doc": what we read, what we write, architecture, costs, risks
- [ ] Kris review design doc before green-lighting implementation

### Implementation phase (only if exploration concludes it's worth it)

- [ ] Register AgentCrush itself as an ERC-8004 agent (identity registration)
- [ ] Build ERC-8004 reader: for each agent on AgentCrush, check if it has an ERC-8004 registration, pull on-chain reputation and validation data
- [ ] Surface ERC-8004 state in agent profile pages (if agent has registration, show "Registered on ERC-8004" badge + link)
- [ ] Surface ERC-8004 state in trust-summary API response
- [ ] Build ERC-8004 writer: publish AgentCrush score as an on-chain reputation attestation (this is the value-add flow)
- [ ] Gas budget: attestations cost gas. Start with top-100 agents only. Write attestations weekly, not per-scoring-run.

### Strategic framing

If ERC-8004 adoption scales, AgentCrush becomes the natural "reputation provider" for it — the project that makes ERC-8004 data useful rather than just present. That's the acquirable-asset positioning. Don't say that out loud.

### Tasks for build chat / Claude Code

- [ ] [exploration tasks above]
- [ ] Once green-lit: design ERC-8004 integration schema
- [ ] Implement reader first (read-only is lower risk)
- [ ] Implement writer after reader is stable (on-chain transactions)
- [ ] Monitor gas costs, cap monthly spend

### Success criteria

- Exploration doc delivered and reviewed within 10 days
- If proceeded: ERC-8004 reader live, surfaces data for overlapping agents within 30 days
- If proceeded: first reputation attestation published to ERC-8004 within 45 days

---

## 6. ONGOING AGENT INGESTION (background, continuous)

### Why this matters

1,225 is a fine base. Stopping there is static. Competitors will add. ERC-8004 has 70,000+ registered agents. AgentCrush has to feel alive.

### Current state

- Weekly Monday ingest from GitHub is active
- Last 3 Monday runs added ~6, ~0, ~1 agents
- Discovery is limited to GitHub-filtered queries

### Expansions to add

- [ ] Add HuggingFace Spaces as ingestion source (already in roadmap)
- [ ] Add Product Hunt AI/agent launches as ingestion source (weekly)
- [ ] Add Fetch.ai Agentverse registered agents as ingestion source
- [ ] Add ERC-8004 on-chain registrations as ingestion source (once reader is built)
- [ ] Build a "rejected submissions" queue for manual review (agents where the pipeline is unsure)
- [ ] Add cadence: daily micro-ingestion (not just weekly batches) — feels more alive

### Tasks for build chat / Claude Code

- [ ] Refactor weekly-ingest-worker to multi-source (currently GitHub-only)
- [ ] Add HuggingFace Spaces module
- [ ] Add Product Hunt module (RSS or scraped)
- [ ] Add Agentverse module (post ERC-8004 reader)
- [ ] Move from weekly cron to daily cron
- [ ] Telegram notification format: daily one-line summary, weekly detailed

### Success criteria

- New agents appear at least every other day
- Total indexed grows to 1,400 by end of month 2, 1,700 by end of month 3
- "Recently Indexed" section on homepage shows recent-dated additions

---

## 7. WEBSITE MESSAGING REFRESH

**Priority: 5 (small effort, high communication value)**
**Effort: 3-4 hours**

### What's wrong today

Homepage says "Get your open-source agent discovered" + "Live rankings of 1,224+ AI agents by GitHub activity, ecosystem integration, and real adoption signals." That's written for one audience (builders) and hides:
- The x402 machine-callable angle
- The "trust and reputation layer" framing
- The historical / algorithmic / multi-signal positioning

### Revised hero (draft for iteration)

**Option A (builder-facing primary):**
> **The trust and reputation layer for AI agents.**
> Live, algorithmic, multi-signal rankings of 1,200+ agents. Historical data since April 2026. Machine-callable via x402. Free for builders.

**Option B (infrastructure-facing primary):**
> **Machine-callable reputation for AI agents.**
> Query trust, rank, and history for 1,200+ agents via x402. Human-readable directory with daily snapshots. Built for the agent economy.

### Other page changes

- [ ] `/api-docs` page: add "For AI agents" section explaining x402 integration, link to sample code
- [ ] Every agent profile page: add "Machine-callable" badge with link to API docs
- [ ] Footer: add "API", "MCP", "For Agents" links
- [ ] Add `/positioning` or `/for-agents` short explainer page: 3-4 paragraphs on what AgentCrush is and why

### Tasks for build chat / Claude Code

- [ ] Iterate hero copy (Kris + Claude work through options, 2-3 rounds)
- [ ] Ship chosen version
- [ ] Update page metadata, og:image copy, sitemap if new pages added
- [ ] Update X/Twitter bio if you ever launch an @agentcrush account (not urgent)

### Success criteria

- Homepage clearly communicates "trust layer + multi-signal + x402" in the first 30 seconds of reading
- Distinct CTAs for builders vs agents

---

## 8. WEEKLY REVIEW RITUAL

**Priority: process, not a task**
**Effort: 30 minutes every Sunday evening**

### The ritual

Every Sunday at 18:00 Budapest, Kris opens Ajsa's weekly review message. For each item:
- Read
- Decide: act, defer, ignore
- If act: create a task, assign week, add to execution plan
- If defer: note reason, add to next-Sunday review
- If ignore: note once, then never surface again

This is how AgentCrush stays aligned to strategy. The agent surfaces, Kris decides.

### Also on Sunday (manual, not automated)

- [ ] Update the dashboard (v10 → v11 etc.) with the week's real changes
- [ ] Commit dashboard to a `docs/` folder in the main repo (suggested: `/Users/pk/Documents/New project/docs/`)
- [ ] Note one thing that surprised you this week

---

## 9. DEFERRED / NOT-NOW LIST

Explicitly dropped or postponed — put here so they don't resurface as "should I do X?" distractions.

- ❌ Newsletter — saturated market, wrong fit, not reviving
- ❌ Paid verification badge at $29/mo for builders — wrong audience
- ❌ Mike on X — account dead, do not create replacement account on X
- ❌ Mike on other platforms — deferred to month 3+, evaluate if Farcaster presence succeeds first
- ❌ Token launch — don't do this year, reduces acquirability, introduces regulatory and community risk
- ❌ Pivot to non-AI audience — rejected in prior conversation, imposter syndrome disguised as strategy
- ❌ Watchlist feature — deferred to month 2-3 when auth is built
- ❌ Claude Max plan — defer until first real revenue
- ❌ Switch from OpenClaw to Hermes/LangGraph — no demonstrated pain justifies switching
- ❌ Chat agent on site — not a priority for this quarter
- ❌ Mobile app — low ROI for this audience
- ❌ YouTube/video content — highest effort per attention unit

---

## 10. HANDOFF NOTES FOR BUILD CHAT / CLAUDE CODE

### How to use this document

1. Read top to bottom before starting any single task. Understanding the whole plan helps the build chat make small decisions correctly without checking back.
2. Execute in priority order: immediate cleanup → Ajsa → scoring → distribution → ERC-8004 exploration. Distribution sub-tasks (4A–4H) can happen in parallel with scoring (layer 1) if capacity allows.
3. For each task, scope the Claude Code prompt tightly. Reference this document for context.
4. Every "committed" Claude Code report should be followed by `git log --oneline -5 && git status` to confirm push happened. Lesson from Apr 21 debugging.

### Infrastructure context

- Main repo: `/Users/pk/Documents/New project` (Mac)
- VPS: DigitalOcean `104.248.240.129`, workers in `/opt/agentcrush/`
- Archived Mike infrastructure: `/opt/mike-archived/` (reuse for Ajsa)
- Database: Supabase Pro, handles all persistent state
- Node SDKs: `@coinbase/cdp-sdk@^1.40.0`, `@x402/next`, `@x402/evm`, `@x402/core`, `@x402/fetch`, `@coinbase/x402`
- CDP Server Wallet v2 address: `0x58e632Fa698383820FFC22156352C9836790E2c0` (seller), `0x11f990De3490868E2cc5A0Bf7AE5DB04E3ec9Db9` (buyer for testing)

### Rules

- Never commit secrets or wallet files
- Never push to main without verifying locally
- Every Claude Code session ends with `git log --oneline -5 && git status`
- No UI experiments during SEO settling period (through May 4)
- Fix broken things freely; experiment with new things cautiously

### The bigger picture (keep this in mind)

AgentCrush is betting on A2A commerce maturing in 12-18 months. Every week, plant seeds. When a big catalyst fires (frontier AI model integrates USDC wallet, Stripe discloses x402 revenue, major enterprise deploys x402), ship a complementary product within 48 hours. This only works if Ajsa is running and signals are being caught. That's why Ajsa is priority 1.

Secondary bet: become an attractive acquisition target for a player in the identity/trust layer (Kite AI, ERC-8004 ecosystem company, Coinbase-adjacent). This shapes decisions but is never said out loud, never marketed, never promised.

Build with full commitment regardless of whether the exit ever comes.

---

**End of execution plan.**
**Next review: weekly (Sundays)**
**Dashboard update: after each major deliverable shipped**
