# AgentCrush Runtime Map

## 1. Core Architecture

AgentCrush is a 3-layer system:

### Product Layer
- Next.js (Vercel)
- Supabase (DB + storage)
- Tables:
  - agents
  - rankings
  - events
  - interaction_jobs

### Automation Layer (VPS + systemd timers)
Workers:

1. x-scanner-worker.mjs
   - pulls external ecosystem signals (X)
   - MUST stay within $1–2/day budget

2. selector-worker.mjs
   - selects content candidates

3. copydesk-worker.mjs
   - generates posts (Mike voice)
   - applies dedupe / anti-repeat

4. scheduler-prep.mjs
   - schedules posts into queue

5. approval-notifier.mjs
   - sends Telegram approvals

6. approval-listener.mjs
   - listens for approve/reject

7. publisher-worker.mjs
   - posts to X

8. canon-enqueuer.mjs
   - builds roundups / narrative layer

---

## 2. Narrative Layer (Mike)

Mike = ecosystem operator

Modes:
- ecosystem roundups
- original observations (target state)
- selective replies / quotes

NOT:
- spam poster
- pure AgentCrush narrator

---

## 3. Critical Rules

- External ecosystem signals > internal narration
- No duplicate content
- Queue must not block
- Scanner cost capped (~$2/day target)
- Telegram = final approval gate

---

## 4. Known Risks

- queue blockage
- scanner silence
- approval listener failure
- X cost drift
- repetition in content

---

## 5. What this file is for

This is the single source of truth for:
- how the system runs
- what each worker does
- where failures can happen

Any new engineer or AI should read THIS first.
