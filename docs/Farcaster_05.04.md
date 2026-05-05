# Farcaster.md

**Created:** April 30, 2026
**Last updated:** May 4, 2026
**Owner:** Kristof
**Purpose:** Working strategy and execution doc for AgentCrush's Farcaster presence.
**Status:** Active. First public moment: Monday May 4, 2026 (x402 post-mortem cast thread).

---

## What this document is

The single source of truth for AgentCrush's Farcaster strategy. Captures positioning, voice, posting cadence, post formats, content backlog, technical infrastructure (Share Cards, Mini App), 30-day execution plan, weekly diagnostics, and rejected approaches.

This is operational. Update it weekly during the Sunday review when Farcaster activity surfaces lessons or new ideas.

## What it is not

- A general social media plan. X is permanently off the table for AgentCrush; Mike's account is dead.
- A growth-hacking script. The play is consistent depth, not viral spikes.
- A consulting funnel. Consulting is a byproduct of the work, not the orientation.

---

## Setup state

What's already in place as of April 30, 2026:

- **@agentcrush account** exists on Farcaster.
- **Neynar Starter plan ($9/mo)** active. SDK access via `@neynar/react`.
- **Ajsa Farcaster ingestion** live — daily cast pulls from /ai, /agents, /base, /coinbase channels feed into morning briefs.
- **MCP server v0** live at `agentcrush.xyz/api/mcp` (four tools: lookup_agent, search_agents, compare_agents, get_history).
- **No prior posting cadence.** First public moment is Monday May 4.

---

## Profile setup

To finalize before Monday May 4:

- **Display name:** AgentCrush
- **Bio:** Market intelligence for the agent economy. Tracks AI agents across open-source, x402, ERC-8004, MCP, A2A, and marketplaces.
- **Link:** agentcrush.xyz
- **Avatar:** AgentCrush logo (existing brand asset).
- **Banner:** something minimal in the cyberpunk aesthetic — neon pink #e91e80 accents on dark #08080f. Skip if it adds friction; default banner is fine for now.

**Pinned cast:** the x402 post-mortem cast 1 (the hook). Stays pinned until one of these replaces it:
- A particularly strong Agent Economy Brief that lands well
- The Mini App Phase 2 launch
- A major catalyst-tied moment that beats the post-mortem for a "start here" purpose

The pinned cast matters because every profile visitor at low follower count needs a clear "start here." Don't leave the pin empty.

---

## Launch day log — May 4, 2026

First public moment fired. Recording state for later review.

**Posted:**
- Cast 1 (the hook with post-mortem link) — main feed, pinned
- Cast 2 (the checklist) — reply to Cast 1
- Cast 3 (3 endpoints + MCP + soft DM line) — reply to Cast 2
- x402 Discord drop in CDP server, ~6 hours after the thread

**Did not post to channels.** /base channel returned "Not available" for new accounts; channel posting deferred until @agentcrush has reputation gating cleared. This is a known Warpcast pattern at zero followers, not a problem to solve today.

**Share Cards verified working.** Pasting an agentcrush.xyz URL into a Warpcast composer rendered as a styled card with AgentCrush brand image, page title, and the meta-description. The fc:miniapp metadata + signed manifest at /.well-known/farcaster.json are functioning correctly.

**Baseline numbers (end of day):**
- Followers: [fill in]
- Casts posted: 3 (the thread)
- Replies posted: [fill in — target was 3-5 substantive]
- Replies received on the thread: [fill in]
- Named ecosystem account interactions (recast / reply / follow): [fill in]

---

## Strategic frame

**Account:** @agentcrush. One account, no separate personal account.

**North star:** AgentCrush is the protocol-neutral market intelligence layer for the agent economy. Farcaster is the active distribution channel where this positioning is performed weekly.

**Voice rule — brand-as-person.** The account speaks in first person, with the conviction and texture of a single founder thinking in public. No "we're excited to announce." No corporate hedging. Solo-founder identity is surfaced occasionally with substance ("I shipped this in seven days from X-suspension to Base mainnet payment"), never as identity-signaling.

**Positioning rule.** Don't sound like "we launched an x402 endpoint." Sound like "we found a real bottleneck in agent commerce." This applies to every cast.

**Framing rule.** AgentCrush tracks *across* protocols, registries, marketplaces, frameworks, and payment rails. Never positions itself as belonging *inside* any one of them. Use language like "indexes signals from," "tracks across," "protocol-neutral." Avoid "the trust layer / reputation layer / identity layer" as category claims — those are owned at the protocol level by ERC-8004 / ERC-8126. "Trust" is fine for product outputs (the trust-summary endpoint, the Trust Context panel) — just not as the AgentCrush-level framing.

**Silence rule (operating principle).** AgentCrush does not post just because it is posting day. If there is no verified signal, publish nothing or reply only. The brand is market intelligence; silence is better than filler.

---

## Goal order

In priority order:

1. **Awareness / followers.** Audience is at zero; growth here unlocks everything else.
2. **Builder participation.** Claims, embeds, "am I indexed" checks — the agent ecosystem starts using the product.
3. **API / x402 / MCP usage.** Machine-callable consumption increases as builder participation deepens.
4. **Consulting / Labs inquiries.** Side effect of credibility, not the orientation. If goal 4 never fires but goals 1-3 do, that's still a successful Farcaster strategy.

This order shapes every post. A cast that serves goal 1 or 2 is more valuable than a cast that overtly pushes goal 4.

---

## Voice & tone

- First-person when useful: "I shipped," "I noticed," "I learned." Do not overuse solo-founder framing.
- Conviction over hedging — opinions held, not suggested
- Sentence case, not all lowercase. AgentCrush has a polished aesthetic that doesn't fit chronically-online lowercase voice.
- Light punctuation; em-dashes and periods, not exclamation marks
- No emojis except very sparingly — at most one per cast, only when it adds something
- No hashtags. Farcaster runs on channels.
- No "we're excited to share" or similar marketing language
- Technical terms used as terms — assume the audience is sophisticated
- When uncertain, post less

---

## Channels

**Primary engagement:**

- `/base` — Coinbase / x402 / Base ecosystem. Highest audience overlap with AgentCrush positioning.
- `/ai` — broad AI builder community. Good for methodology and infrastructure posts.
- `/agents` — narrower, agent-specific. Smaller but very on-target.
- `/coinbase` — for x402 / Bazaar-related posts specifically.

**Secondary monitoring (via Ajsa, no posting):**

- `/farcaster` — meta-platform discussion
- Any channel where an agent-relevant catalyst surfaces

**Channel posting mechanic:** most posts go to the main feed first, then cross-share to one or two relevant channels via Warpcast's "share to channel." Channel-only posts are too quiet at zero followers.

---

## Target accounts (for daily replies)

The 10-min daily reply window goes to substantive engagement with these account categories. Not a CRM. Not a script. Just a way to keep the reply block targeted instead of randomly scrolling.

- **Coinbase / x402 / CDP people** — devrel, x402 Foundation contributors, Bazaar/Agentic.Market team
- **Base ecosystem builders** — anyone shipping on Base who touches agents
- **AI agent framework builders** — CrewAI, LangChain, AutoGen, AutoGPT, OpenHands, Aider maintainers
- **MCP / A2A people** — protocol contributors, MCP server publishers
- **ERC-8004 ecosystem** — Ethereum Foundation dAI team, projects with ERC-8004 registrations
- **Farcaster AI-native accounts** — narrative/research-layer builders (Cluster C from the ecosystem map)
- **Agents already indexed by AgentCrush** — especially the evidence-ranked top 40

**Reply discipline:** 10 min/day, 4-5 days/week. 3-5 substantive replies. Add specific remarks; never "cool project." Replies matter more than original posts at the current follower level.

**Soft weekly aim:** ~5 replies to target accounts, organic follow-ups when someone responds. Don't force this into a metric — let it stay a habit.

---

## Posting cadence

Three posts per week. Each lane has a clear job and won't run out of material.

### Monday — Agent Economy Brief

Cornerstone format. Five short items mixing ecosystem signal, agent worth watching, comparison, infrastructure note, and AgentCrush data point. Designed to never run out of material because each post is multi-topic, drawn from the dynamic data engine beneath the rankings — not from rank shuffles.

### Wednesday — Methodology note

Single-topic explainer of how AgentCrush thinks. Builds the credibility moat. Examples: why output examples matter for x402 discovery, why monitoring signals and ranking signals are kept separate, why ERC-8004 is read-only at AgentCrush, what evidence tiers actually mean. Short — 2-4 casts max.

### Friday — Ecosystem take

One Ajsa-fed observation about what happened that week in the agent economy. Reactive lane, judgment-led. Not "daily news" — one specific take with a clear opinion and a link.

---

## Agent Economy Brief format

```
Agent Economy Brief — Week N

1. [Ecosystem signal — one real number from the past week]
2. [Agent worth watching — concrete trajectory observation]
3. [Comparison — two agents where the data difference is the story]
4. [Infrastructure note — methodology / protocol / registry observation]
5. [AgentCrush data point — one verifiable internal metric]
```

**Operating rule (locked).** Every item must link to one of five surfaces:

- agent profile page (`/agent/[handle]`)
- comparison page (`/compare/[a]-vs-[b]`)
- `/agent-economy-index`
- `/how-we-rank`
- a blog/notes post

No orphan commentary. If an item can't link to a concrete surface, it doesn't belong in the AEB.

**Source discipline.** Every metric must be real and traceable. Numbers come from Ajsa, the dashboard, Supabase queries, or `/agent-economy-index`. Never from memory, never illustrative, never "approximately."

### AEB production checklist (weekly)

- **Thursday/Friday:** Ajsa proposes 10 candidate items based on the week's ecosystem activity.
- **Saturday/Sunday:** filter to 5 items, each with a target product surface link.
- **Sunday evening:** verify every number against the dashboard, Supabase, or live site. No item ships unverified.
- **Monday morning:** publish to main feed. Cross-share to `/base` if anything is x402/Coinbase-relevant.

**Skip rule:** if fewer than 3 verified items exist on Sunday, skip the AEB that week and publish a methodology note instead. Do not force five items. Filler dissolves the brand.

---

## Recycle loop

Every AEB should leave product residue. After publishing, at least one of these gets updated:

- Homepage Fresh Intel widget — surface the AEB items there too
- `/agent-economy-index` — add new metrics or surface tracked
- Intelligence Backlog (`docs/INTELLIGENCE_BACKLOG.md`) — log signals worth watching
- A comparison page — annotate with the comparison from the AEB
- An agent profile — add a "watched event" annotation
- Methodology backlog — capture topics surfaced by the AEB writing process

This turns Farcaster from a one-way broadcast into an input layer for product improvements. The AEB you write Monday should make some surface on agentcrush.xyz better by Tuesday.

---

## Evidence Check loop (reactive distribution)

The Monday/Wednesday/Friday cadence is *proactive* distribution — casts AgentCrush originates. The Evidence Check loop is the *reactive* counterpart — AgentCrush appearing where evidence improves an existing conversation about an agent.

This loop runs in parallel with the cadence. Both compound. Neither is sufficient alone.

### The principle

AgentCrush should not behave like "here's our weekly post." It should behave like "evidence requested." Reactive first; automation later.

### How it works (v0 — manual)

1. **Daily radar (~5 min, morning).** Use Neynar AI to surface 3-5 substantive Farcaster threads from the past 24-72h that discuss x402, MCP, ERC-8004, agent commerce, or specific frameworks (CrewAI, LangGraph, AutoGen, OpenHands, Aider).

2. **Filter for "evidence improves the discussion."** Skip hype threads, meme threads, low-signal token chatter, generic "AI is the future" takes. Reply only where AgentCrush data adds state clarity.

3. **Reply with an Evidence Check or Evidence Comparison card** (schemas below). Neutral tone. State, not judgment.

4. **Track engagement.** Likes, recasts, bookmarks, builder acknowledgment. Note what works.

### Activation threshold for automation

Build automated `@agentcrush check [handle]` reply bot only when the loop is genuinely demand-pulled. Suggested threshold: ~15 organic mentions of @agentcrush in 30 days, OR persistent manual friction (finding yourself wishing you didn't have to pull data manually for the third check that day).

Until then: stay manual. Bot-flavored replies signal "automated account" and dissolve the gravity that makes AgentCrush a reference layer.

### Pace

Realistic: 3-5 evidence checks per week. Not 50 in 6 weeks. Farcaster's volume on x402 / MCP / ERC-8004 specifically is thin — there aren't 50 high-signal threads per six weeks without diluting the bar. Restraint is what builds authority; this loop has scarcity baked in by design.

### Reactive ≠ replacement for proactive

The Mon/Wed/Fri cadence creates the threads that the Evidence Check loop later participates in. If the proactive cadence slows, the reactive loop has less ground to grow on. Run both.

---

## Card schemas

### Evidence Check card

Used for single-agent evidence replies. Neutral state description, not judgment.
```
Evidence check: [Agent name]
Indexed: yes/no
Tier: indexed / evidence-ranked
Rank: #X (only if evidence-ranked)
Last updated: [date]
Signal coverage:
  GitHub: active / detected / missing
  Package usage: detected / missing
  Dependency graph: detected / shadow / missing
  Docs quality: strong / partial / missing
  HN/discourse: detected / missing
  Ecosystem links: detected / missing
Protocol/context:
  MCP: detected / not detected
  x402/CDP: detected / not detected
  ERC-8004: registered / not registered
  Agentic.Market/Bazaar: listed / not listed
Full profile: agentcrush.xyz/[handle]
[Caveat line if coverage is partial]
```

**Tone rules:**
- Header: "Evidence check: X" — never "AgentCrush rates X"
- No adjectives like "top," "leading," "best"
- No bullish/bearish language
- Binary detection where possible (detected / not detected)
- Use AgentCrush's actual public states (indexed, evidence-ranked, signal coverage fields). Do not invent tiers like A1/B2 — those don't exist in the product.

### Evidence Comparison card

Used for two-agent comparison replies. Reads like a terminal diff, not a marketing graphic.
```
Evidence comparison: [Agent A] vs [Agent B]
Indexed:
  [A]: evidence-ranked (#X) / indexed / not indexed
  [B]: evidence-ranked (#Y) / indexed / not indexed
Last updated: [date]
Development signals:
  GitHub:        [A]: active        | [B]: active
  Dependency:    [A]: detected      | [B]: detected
  Package usage: [A]: detected      | [B]: missing
  Docs quality:  [A]: strong        | [B]: partial
  HN/Discourse:  [A]: detected      | [B]: missing
Protocol surface:
  MCP:           [A]: detected      | [B]: not detected
  x402/CDP:      [A]: detected      | [B]: not detected
  ERC-8004:      [A]: registered    | [B]: not registered
  Agentic.Mkt:   [A]: listed        | [B]: not listed
Full profiles:
  agentcrush.xyz/[A]
  agentcrush.xyz/[B]
```

**Tone rules:**
- Symmetrical layout — feels neutral
- No adjectives, no "winner"
- Lets the reader draw the conclusion
- Turns subjective debates into structured contrast

---

## Neynar AI usage rules

Neynar AI is a Farcaster radar. Strategy stays in Claude strategy chats. Posting stays manual.

### Use Neynar AI for

- **Daily radar:** "Find casts from the last 24-72h in /base, /coinbase, /ai, /agents about [topic]. Filter for casts with at least 1 reply or recast — signal, not voice-in-the-void posts. Show me the 3-5 highest-signal ones."
- **Account discovery:** "Find Farcaster accounts that have posted 3+ substantive casts in the past 30 days about [topic] in [channel]. Skip recast-only and comment-only accounts."
- **Mention monitoring:** "Show me casts from the past 7 days that mention 'agentcrush' or link to agentcrush.xyz that I haven't replied to."

### Do not use Neynar AI for

- ❌ Drafting replies. Substance + specificity is AgentCrush's moat. Bot-flavored replies, even good ones, signal automation.
- ❌ Strategy questions. It doesn't know AgentCrush's bets, the dashboard state, or the cross-protocol thesis.
- ❌ Posting on AgentCrush's behalf.

### When Neynar AI returns zero results

Don't read it as failure. Read it as "Farcaster's volume on this niche is low this window." Two responses:
- Widen the time window (24h → 72h → 7d)
- Switch to a different topic from the target list

If still zero after both, that's a reply-light day. Fine.

---

## CTAs by post type

Each lane has one intended behavior. No hard selling — just a clear next step.

- **AEB items →** "Check the full Agent Economy Index" or specific surface link
- **Methodology note →** "See how the ranking works" → `/how-we-rank`
- **Comparison spotlight →** "Compare these two agents" → `/compare/[a]-vs-[b]`
- **Builder-relevant post →** "Check if your agent is indexed" → `/submit` or `/explore`
- **x402 / API content →** "Read the post-mortem / inspect the endpoint" → blog or `/developers`
- **Reply (in-conversation) →** none. Replies don't carry CTAs.

---

## Posting rules

1. **Link discipline.** Every AEB item links to a product surface. Methodology posts link to `/how-we-rank` or a blog post. Friday posts link to whatever surface the take centers on.
2. **No fake metrics.** Verified data only. The credibility AgentCrush sells is dissolved by one made-up number.
3. **No consulting pitch.** "DMs are open" is fine as a soft signal at the end of a thread occasionally. Never as a primary message.
4. **Three-cast structure for threads.** Hook + link in cast 1. Utility / depth in cast 2. Optional positioning + soft availability in cast 3. Never bury the link in the last cast.
5. **One main-feed cast per day max.** Don't double-post.
6. **Cross-share, don't double-write.** Use Warpcast's "share to channel" rather than posting separate variants.
7. **Replies before originals.** If short on time on a posting day, prioritize the 10-min reply window over a forced original.
8. **Silence over filler.** No verified signal = no post. Reply-only days are fine. The brand is intelligence, not output volume.

---

## Mini App plan

Two phases. Don't conflate them.

### Phase 1 — Farcaster Share Cards

**What it is.** Embed metadata (`fc:miniapp` meta tags) on every `/agent/[handle]` page + manifest at `/.well-known/farcaster.json`. Every shared agent profile becomes a rich trust card in Farcaster feeds.

**What it is not.** A Mini App in the interactive sense. There is no separate UI to build.

**Why first.** ~1 day of work. Uses existing pages and existing data. Creates the distribution mechanic ("every shared agent link is a trust card") without displacing other priorities.

**Stack.** `@neynar/react` SDK package (Neynar Starter plan already paid). Cleaner manifest signature flow + analytics for free.

**Ships:** weekend of May 2-3, 2026.

### Phase 2 — Mini App (interactive lookup)

**What it is.** Dedicated lookup app at `agentcrush.xyz/lookup` (or similar). Search input → trust card → share button. Possibly a comparison version after.

**Why later.** 2-3 days of focused work. Real value, but build only after the homepage refactor stabilizes and after the first month of cadence shows what users actually want from Farcaster.

**Ships:** estimated 4-6 weeks out, after data from week 1-4 informs the spec.

---

## 30-day execution plan

### Week of April 30 (this week)

- **Thursday Apr 30:** publish x402 post-mortem to `/blog/x402-discovery-postmortem`. Add "Blog" to nav (after "Submit").
- **Friday May 1:** ship homepage refactor (use-case cards, Fresh Intel, agent-economy-index surfacing, comparison widget, Newly Indexed prominence, reduced movers dominance).
- **Saturday-Sunday May 2-3:** ship Farcaster Share Cards (manifest + embed metadata on agent profile pages). Finalize @agentcrush profile (bio, avatar, banner). Draft Week 1 Friday cast content.

### Week 1 — May 4 to 10

- **Monday May 4:** post-mortem cast thread fires (3 casts, link in cast 1). Pin cast 1. Cross-share to /base. Drop short version in x402 Discord ~6 hours later.
- **Wednesday May 6:** methodology cast — "Why monitoring signals and ranking signals are kept separate at AgentCrush."
- **Friday May 8:** ecosystem take — Ajsa-fed topic for that week.
- **Daily:** 10 min of replies to target-account categories.

### Week 2 — May 11 to 17

- **Sunday May 10:** AEB production — verify 5 items per the checklist.
- **Monday May 11:** **first Agent Economy Brief — Week 1.** Recurring format from here forward. Recycle: update homepage Fresh Intel + log to Intelligence Backlog.
- **Wednesday May 13:** methodology cast — pull topic from backlog.
- **Friday May 15:** Friday-lane ecosystem take.
- **Daily:** replies.

### Weeks 3-4 — May 18 to 31

Steady cadence. AEB Mon, methodology Wed, ecosystem Fri. Daily replies. Sunday review each week. First measurement check at end of week 4.

---

## Methodology post backlog

Topics for the Wednesday lane. Pull one each week. Update list as new ideas surface.

- Why monitoring signals and ranking signals are kept separate
- Why output examples matter for x402 discovery
- Why ERC-8004 is read-only at AgentCrush (for now)
- What evidence tiers actually mean
- How dependency graph signals are built
- Why "broad coverage" vs "partial coverage" is in the public ranking
- What gets an agent promoted from indexed to evidence-ranked
- Why GitHub stars aren't the whole story
- How AgentCrush handles agents that move repos or rebrand
- Why we don't auto-archive dead agents
- The case for tracking *across* protocols rather than picking one
- Why Reddit signal is still pending (and what that says about the scoring stack)
- Why ERC-8183 closes the gap that x402 + ERC-8004 don't (the "Job" primitive explained)
- What CROPS gets right about agent infrastructure (Censorship-Resistant / Open-source / Private / Secure)
- Why we don't pick ecosystems: tracking across OpenClaw, Bazaar, ACP, ERC-8004, Bittensor
- Why "open-source" isn't the same as "verifiable" for agents
- The four-standard stack — and which one most teams skip first
- Why subscription pricing beats token incentives for an intelligence layer (calibrated against SURF model)
- **[Top-tier] The trust layer is being built twice — TradFi side (Experian/Visa/Cloudflare/Skyfire) and crypto side (ERC-8004/x402/ACP). Why neither will win alone, and what builders should support first.**
- Why we publish AgentCrush as an OpenClaw skill, a Claude Code skill, and a uAgents skill — same data, three surfaces, zero ecosystem allegiance (Future Wednesday topic)
- **Builder Brain — what listening to builder discourse teaches us about agent commerce friction** (post when Builder Brain has 2+ weeks of data)
- The Belief Mechanism: why every audit pitch should lead with the post-mortem, not bury it
- Why blog posts are the top-of-funnel assets and Farcaster is the distribution layer (an essay on how AgentCrush allocates writing time)
- Why we publish AgentCrush across multiple agent registries (Bazaar, Agentverse, ERC-8004, future Kite Passport-aware catalogs) — same data, multiple surfaces, zero ecosystem allegiance.

---

## AEB content backlog

Themes for Monday Agent Economy Briefs. Each AEB pulls 5 items across themes.

- New x402 endpoints listed in Bazaar this week
- New ERC-8004 registrations on Base / Ethereum
- New evidence-ranked promotions
- Newly indexed agents with above-average initial coverage
- New agents reaching partial evidence coverage
- Comparison spotlights (drawn from `/compare`)
- Protocol coverage shifts — registries / marketplaces / frameworks added
- Methodology updates with measurable impact
- Quarterly retrospective items (every 12-13 weeks)
- Trajectory observations on persistent top movers (e.g. Autonolas's 3-week run)
- MCP server activity — new tools, query patterns observed
- OpenClaw ecosystem catalyst check-ins (KellyClaude approvals, Felix revenue, Clawd burn rate, etc.)
- Cross-protocol agents — agents that support 2+ standards (x402 + ERC-8004 + ACP + …)
- New x402 endpoints listed in CDP discovery week-over-week
- Tempo/MPP launch partners and named integrations as they appear
- Comparison spotlights drawn from new `/category/autonomous-software-factories` page
- Builder-outreach agent activity — first responses, claim conversions

---

## Upcoming long-form posts (cross-promotion)

These blog posts are queued for the next 2–4 weeks. Each one becomes Farcaster content (cast threads, Wednesday methodology spin-offs, AEB callouts).

1. **"The first cross-protocol agent: mapping ERC-8004 to x402 in production"** — CrewAI worked example. Cites Castle Labs' four-standard frame. Tags @davide.crapis (EF dAI lead) and Castle Labs at publish time. ETA: this week.
2. **"Agent Commerce Readiness Audit — CrewAI"** — first free audit case study. Public methodology, public findings. ETA: within 2 weeks.
3. **"Agent Commerce Readiness Audit — [target #2]"** — second free audit case study. ETA: within 3 weeks.
4. **"State of Autonomous Software Factories — May 2026"** — coverage of OpenClaw ecosystem agents using AgentCrush data. Cites Khala's Feb 26 catalysts and evaluates which hit. ETA: after Ajsa OpenClaw scan completes.
5. **"Frontier AI fails to identify which agents are real X% of the time"** — small benchmark post in the SURF/CAIA shape. Methodology + sample evaluation. Highly citable; positions AgentCrush as why-this-exists. ETA: within 4-6 weeks, after Builder Brain produces example failures.
6. **Builder Brain launch post** — methodology + first week of "builder pain language" examples. Cross-promotes the listening surface, not just the index. ETA: after Builder Brain ships and has 2 weeks of data.
7. **The cross-protocol stack post (long-form)** — an expanded version of the Friday cast on agent commerce splitting into layers. Each layer (MCP, x402, AP2, Kite Passport, ERC-8004, ERC-8183, Visa/Stripe) gets its own paragraph + which AgentCrush surface tracks it. ETA: within 3-4 weeks; informed by the Friday cast's reception.

Each post triggers: Farcaster cast thread (publication day), Wednesday methodology spin-off (following week), 1+ AEB item (next available Monday).

---

## Rejected approaches

Explicitly not doing. Stop these from resurfacing:

- ❌ Personal account alongside @agentcrush. Single brand-as-person account.
- ❌ Cross-posting from a Mike-style automated persona.
- ❌ Hashtag-driven memetic strategy. Farcaster runs on channels.
- ❌ Quiz / discovery Mini App. Lookup and comparison only.
- ❌ Consulting pitch as primary cast theme. Soft signal only.
- ❌ "We" voice. First-person throughout.
- ❌ "The trust / reputation / identity layer" framing. Always "across."
- ❌ Fake or illustrative metrics in any post.
- ❌ Burying the link in the last cast of a thread.
- ❌ More than one main-feed cast per day.
- ❌ Posting on cadence when there's no signal. Silence over filler.
- ❌ Returning to X.

---

## Weekly diagnostics

Reviewed every Sunday. Five metrics that matter at zero-to-low-follower stage:

- **Followers gained this week**
- **Casts posted** (target: 3 — Mon AEB, Wed methodology, Fri ecosystem)
- **Replies posted** (target: ~20 across the week)
- **Replies received** on AgentCrush casts (proxy for engagement quality)
- **Named ecosystem account engagement** — did anyone from Coinbase / x402 / ERC-8004 / known framework builders interact?

Track in a simple spreadsheet or Supabase table. Don't over-engineer.

**Decision rule at end of week 4:**
- If followers growing AND replies receiving responses: keep going as-is
- If followers flat BUT replies getting traction: stay the course; engagement compounds before follower count
- If neither happens: adjust channel mix and topic mix in week 5. Don't change voice or cadence.

After week 4, expand metrics to include: profile visits, agent profile clicks from Farcaster, AEB link clicks, inbound "is X indexed?" questions.

---

## Success criteria

### 30-day

- AEB published every Monday after May 11, with methodology substitute allowed if fewer than 3 verified items exist.
- Methodology cast every Wednesday for 4 weeks straight
- Friday ecosystem take every Friday for 4 weeks straight
- Daily 10-min replies — average 4 substantive replies per posting day
- Farcaster Share Cards live on all agent profile pages
- Manifest signed and verified at `/.well-known/farcaster.json`

### 60-day

- 100+ followers on @agentcrush
- 5+ inbound conversations from Farcaster (questions, claim requests, "is X indexed" asks)
- 1+ agent profile shared by an external account as a trust card
- 1+ AEB item that prompts a builder to claim or update their listing

### 90-day

- Mini App Phase 2 spec'd or in build
- 1+ Coinbase or x402-ecosystem account engaging with AgentCrush content regularly
- 1+ inbound consulting inquiry traceable to a Farcaster impression (Bet C signal)
- AEB recognized as a recurring format (someone references it without being prompted)

---

## Review cadence

**Weekly (Sunday review).** Did the three posts ship? Did daily replies happen? AEB production checklist run? Diagnostics logged? Anything Ajsa surfaced this week worth adding to the AEB or methodology backlog? Any voice or format adjustments? Recycle loop closed for the week's AEB? Update this doc as needed.

**Monthly.** Update success criteria progress. Decide if cadence needs to change. Decide if Mini App Phase 2 timeline holds. Refresh target accounts list.

**Quarterly.** Reassess goal order — has the audience shifted? Are the lanes still right?

---

## Active drafts — ready to fire Monday May 4

### Cast 1 (the hook — pin this)

> Working x402 payment isn't the same as working x402 discovery.
>
> I shipped 3 endpoints to Base mainnet. Payment landed, settlement worked, the route returned 200. But discovery still needed another layer of metadata before the services became properly catalogable.
>
> Wrote a post-mortem of the boring details that actually mattered:
>
> https://www.agentcrush.xyz/blog/x402-discovery-postmortem

### Cast 2 (utility — gets bookmarked)

> The checklist that worked, for anyone debugging a similar issue:
>
> – valid 402 challenge
> – successful paid settlement
> – /.well-known/x402(.json) live
> – discoverable: true
> – pathParamsSchema for dynamic routes
> – output.example, not just schema
> – fresh settlement AFTER any metadata change
>
> Debug CDP discovery before the marketplace UI.

### Cast 3 (positioning + soft availability)

> AgentCrush now has 3 paid endpoints live on x402, all on Base mainnet:
>
> – trust-summary ($0.02)
> – history ($0.02)
> – verification-status ($0.005)
>
> And a free MCP server for AI clients:
>
> https://www.agentcrush.xyz/developers/mcp
>
> If you're shipping an x402 service and want to talk through the discovery layer, my DMs are open.

### x402 Discord short version (post ~6 hours after the Farcaster thread)

> Wrote up what I learned getting AgentCrush indexed on Agentic.Market — TL;DR working x402 payment is not the same as working x402 discovery. Two metadata gotchas + a checklist that finally worked: https://www.agentcrush.xyz/blog/x402-discovery-postmortem

---

**End of document.**
