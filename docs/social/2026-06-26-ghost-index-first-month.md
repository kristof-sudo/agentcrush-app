# Social copy — Ghost Index first month (2026-06-26)

Blog post: https://agentcrush.xyz/blog/ghost-index-first-month
OG image needed: og-ghost-index-first-month.png (Kris to create)

---

## X thread (7 tweets)

**Tweet 1 (hook)**
We've been pinging 1,354 AI agents every night for three weeks.

84% don't answer.

The Ghost Index — our first liveness snapshot of the agent economy. 🧵

**Tweet 2 (headline number)**
16.2% of indexed agents are alive.

That's 215 out of 1,354 responding to a basic HTTP probe as of our first tracking week.

The other 84%: launched, indexed, and gone quiet.

**Tweet 3 (methodology)**
What "alive" means: a nightly HEAD request to the agent's primary endpoint.

2xx or 3xx = alive.
Timeout / 4xx / DNS fail = ghost.

No subjectivity. No curation. Every agent in the index gets the same probe.

**Tweet 4 (why agents go ghost)**
The pattern we keep seeing: agents built for demos, not operations.

Launch → get attention → go quiet.

The agents that stay alive reversed this sequence — they found a paying use case first. Revenue motive is the most durable uptime motive in the data.

**Tweet 5 (payment rails correlation)**
Agents with x402 endpoints have structural uptime incentives.

If the endpoint is down, nobody pays.

We don't have enough cross-tab data to call this a rule yet. But it's the hypothesis we're testing.

**Tweet 6 (why we publish the ugly number)**
We could have filtered to only index agents we'd confirmed were alive.

The index would look healthier than the ecosystem is.

We didn't. The 84% ghost rate is the honest number — and it's what makes the 16.2% meaningful.

**Tweet 7 (CTA)**
The full breakdown — methodology, what each category likely looks like, what changes this — is live:

agentcrush.xyz/blog/ghost-index-first-month

Live score + history: agentcrush.xyz/api/ghost-index/v1

---

## Farcaster cast (first-person founder voice)

Been running nightly liveness checks on every agent in the AgentCrush index for three weeks.

84% of 1,354 agents don't answer.

The Ghost Index: 16.2% alive. Full analysis at agentcrush.xyz/blog/ghost-index-first-month

The agents that stay live have one thing in common: they had a paying use case before they had a demo.

---

## Notes for Kris

- OG image needed: dark background, large "16.2%" stat, subtitle "The Ghost Index", AgentCrush branding. Similar style to og-zero-interop.png.
- Best posting time: Friday 8–10am ET (same window as previous findings posts).
- The 16.2% figure is from June 11 data (STATE.md). Current live score may differ slightly — check /api/ghost-index/v1 before posting, update thread if materially different.
- The live Ghost Index score auto-updates nightly; the blog post is a point-in-time snapshot.
