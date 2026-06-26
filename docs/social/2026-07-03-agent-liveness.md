# Social copy — Three tiers of alive (2026-07-03)

Blog post: https://agentcrush.xyz/blog/agent-liveness
OG image needed: og-agent-liveness.png (Kris to create)

---

## X thread (7 tweets)

**Tweet 1 (hook)**
We published the wrong Ghost Index number. Then the correction turned out to be more interesting than the original.

16.2% → 58.8%. Here's what the gap actually means. 🧵

**Tweet 2 (the two numbers)**
The original: 16.2% of 1,354 agents showed recent pipeline activity.

The corrected: 58.8% of 1,387 agents respond to a live endpoint probe.

Different question. Different answer. Both numbers are real — they just measure different things.

**Tweet 3 (the three tiers)**
Put them together and you get three distinct populations:

→ 58.8% endpoint-alive: infrastructure is running
→ ~16% recently active: observable activity in last 30 days
→ ~9% evidence-ranked: verified across 3+ independent signal families

**Tweet 4 (the operational-but-dormant tier)**
The 590-agent gap between 58.8% and 16% is worth naming.

These agents are running. Server answers. Nobody's home.

Operational infrastructure, zero observable demand. They exist; they're not yet agents.

**Tweet 5 (why evidence-ranking is the right metric)**
For buyers, the 9% evidence-ranked tier is where you start.

Not "does the endpoint answer" — but "does GitHub confirm active development? Does Base confirm payment activity? Do 3 independent signals agree this agent is real?"

That bar filters out demo infrastructure from operating infrastructure.

**Tweet 6 (why we publish the funnel)**
The funnel from 1,387 indexed to 120+ evidence-ranked is not a flaw in the index.

It's the index doing its job.

An agent directory that showed only its healthiest tier would be measuring itself, not the ecosystem.

**Tweet 7 (CTA)**
Full breakdown — what each tier means, what changes these numbers, what the middle tier predicts about where the economy goes next:

agentcrush.xyz/blog/agent-liveness

Live data: Ghost Index at /ghost-index + evidence-ranked at /explore

---

## Farcaster cast (first-person founder voice)

Published a Ghost Index number. It was wrong. Corrected it.

The corrected number — 58.8% alive vs 16.2% — turns out to explain something more interesting: there are three different ways to be "alive" in the agent economy, and only one of them matters for buyers.

Wrote it up: agentcrush.xyz/blog/agent-liveness

---

## Notes for Kris

- OG image needed: dark background, contrasting "16.2%" crossed out + "58.8%" in a larger font, subtitle "The Ghost Index — Three Tiers of Alive", AgentCrush branding. Similar dark style to og-zero-interop.png.
- Best posting time: Friday 8–10am ET.
- The 58.8% figure is from June 24 data (PR #175 correction). Current live score may differ slightly — check /api/ghost-index/v1?live=true before posting and update the thread if materially different.
- The ~16% "recently active" figure is derived from the original stale measurement for explanatory contrast. It is an approximate figure used for the analysis, not a live API metric.
- Evidence-ranked count: STATE.md says "120+" as of June 11. Update to current live count before posting if the number has materially changed.
- The post URL is /blog/agent-liveness — add to blog index (already done in this PR).
