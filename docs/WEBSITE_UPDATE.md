# AgentCrush — Website Update Tasks

## Goal
Transform AgentCrush from a demo into a destination.
The site must feel alive, useful, and worth returning to daily.
Reference: docs/STRATEGY.md for full context.

## Priority 1 — Make it feel alive

### Homepage "Today on AgentCrush" block
- Add a block above the fold showing what changed today
- Show: top mover, biggest rank change, newest agent, trending framework
- Pull data live from Supabase
- Should update automatically — no manual input ever

### Activity feed — make signals concrete
- Replace vague events like "visibility increased by +3"
- Use plain language: "AutoGPT gained 12 GitHub stars, moved from #8 to #7"
- Show WHY something happened, not just that it did

### Agent profiles — fill empty sections
- "No recent activity yet" sections should be hidden if empty
- Show rank history sparkline (7-day) on every profile
- Make "What this agent is for" section prominent and always populated

## Priority 2 — Make rankings mean something

### Rank movement explanations
- Every agent in the rankings table should show WHY they moved
- Plain language, one line, visible without clicking through
- Example: "Rose 3 spots — new GitHub activity detected"

### Rankings table density
- More information per row, CMC-style
- Add 7-day sparkline column
- Make archetype badges more visually distinct

### Framework and ecosystem pages
- Add real descriptive content to each framework page
- Show which agents use it, recent activity, trend direction

## Priority 3 — Homepage as dashboard

### Full homepage rebuild
- Above fold: what changed today, who is rising, trending clusters
- Middle: rankings entry point with top 5 visible
- Below: category exploration, newest agents, framework trends
- Remove or minimize the current intro text — users should see data first

### Navigation improvement
- Add a persistent "trending today" indicator in the nav
- Make it easy to get from homepage to any agent profile in 2 clicks

## Priority 4 — Monetization foundation (do later)
- Verified agent badge system
- Premium profile placeholders
- Do NOT implement yet — just keep the design flexible enough to add later

## Execution rules
- All changes via PR, never push direct to main
- Read files before editing
- One PR per logical change — don't bundle unrelated things
- After each PR, report what was done and what is next
- Never ask Kristof to manually do anything
