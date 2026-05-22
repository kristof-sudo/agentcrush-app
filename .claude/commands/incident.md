---
description: File an incident — capture when, what, impact, root cause, fix; write to brain Incidents/; flag as STATE blocker if still open
---

# /incident — file an incident report

Use whenever something broke that crosses a system boundary, surfaced a pattern worth tracking, or required a real diagnosis. Per-agent micro-failures (e.g. Ajsa's 529 retries) get logged automatically by the worker into its own `Agents/<name>/incidents.md` — do NOT use `/incident` for those unless they escalate.

Use `/incident` for things like:
- VPS outage / disk full / OOM
- Anthropic / X / Telegram / Supabase outage that broke the pipeline
- Deploy failed in a way that needed investigation
- Wrong content posted (or right content rejected by Kris)
- Cost spike / budget exceeded
- Architectural concern (e.g. "Bix hallucination pattern")
- Recurring micro-failure that needs a redesign, not another retry

## 1. Gather

Ask the user (or pull from session context) for:

| Field | Required? | Notes |
|---|---|---|
| Title | yes | Short noun phrase, e.g. "VPS disk 95% full" |
| When | yes | ISO timestamp of when the issue surfaced (UTC) |
| What happened | yes | 1-3 sentences, factual |
| Impact | yes | What broke / who was affected / how long |
| Root cause | if known | Skip if still investigating |
| Fix / workaround | if applied | What was done. Note if temporary. |
| Status | yes | `open` / `mitigated` / `resolved` |
| Severity | yes | `info` / `warn` / `crit` |

Do NOT fabricate. If root cause unknown, write `unknown — investigating`.

## 2. Write to brain

Filename: `Incidents/YYYY-MM-DD-<slug>.md` (kebab-case slug from title).

If the brain MCP `append_log` tool is registered, also append a Log.md entry pointing at the incident:
```
mcp__brain__append_log(
  agent: "Claude Code",
  did: ["filed incident: <title> → Incidents/<filename>"]
)
```

File template:

```markdown
---
date: YYYY-MM-DD
type: incident
title: <title>
severity: <info|warn|crit>
status: <open|mitigated|resolved>
filed_by: Claude Code
---

# <title>

## When
<ISO timestamp>

## What happened
<factual narrative, 1-3 sentences>

## Impact
<what broke / who was affected / duration>

## Root cause
<known cause OR "unknown — investigating">

## Fix / workaround
<what was done; mark temporary fixes explicitly>

## Status
<open / mitigated / resolved>

## Follow-ups
- [ ] <action items, if any>
```

Create the `Incidents/` directory if it doesn't exist (`mkdir -p /Users/pk/projects/agentcrush-brain/Incidents`).

## 3. Update STATE.md only if status=open

If status is `open` or `mitigated` (not `resolved`), add or update an entry in STATE.md's "Open blockers / decisions" section pointing at the incident file. Format:

```
N. **<severity emoji> <title>** — <one-line summary>. See [[Incidents/YYYY-MM-DD-<slug>]].
```

Severity emoji: 🔴 crit / 🟡 warn / 🔵 info.

When the incident later resolves, the operator (Kris or COO) edits the STATE.md entry to ~~strikethrough~~ + appends `RESOLVED YYYY-MM-DD` per the convention already in use.

## 4. Telegram alert if severity=crit

Only for `crit`. Use direct curl (don't depend on the brief worker):

```bash
source /opt/agentcrush/fetchers/.env 2>/dev/null || source ~/.agentcrush-secrets/telegram.env
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  -d "text=🚨 INCIDENT (crit) — <title>%0A<impact>%0AFiled at Incidents/<filename>"
```

If env not available locally, SSH the curl to the VPS: `ssh root@104.248.240.129 'source /opt/agentcrush/fetchers/.env && curl ...'`.

For `warn` and `info`, no Telegram push — the STATE.md entry is enough.

## 5. Report to Kris

Format:

```
Incident filed: <title>
Severity: <severity>
Status: <status>
File: Incidents/YYYY-MM-DD-<slug>.md
[STATE.md updated]   ← only if status != resolved
[Telegram sent]      ← only if severity=crit
Follow-ups: <count>
```

## Hard rules
- Never file an `/incident` without a real boundary-crossing failure (use per-agent incidents.md for routine retries/transient errors)
- Never push Telegram for warn/info — saves the alert channel for things Kris needs to see now
- Never mark resolved without a verifiable fix (no "probably fixed it" — that's mitigated)
- Never invent root causes; "unknown — investigating" is honest
