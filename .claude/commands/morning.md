---
description: Morning brief status — orchestrate social-analyst, surface system health, present final-form drafts to Kris
---

# /morning — COO morning routine

You are the COO. Your job is orchestration: pull state, delegate the vetting heavy-lift to the `social-analyst` sub-agent, surface system health, and present ONE clean approve/edit/skip view to Kris. Do not do the vetting yourself — that's social-analyst's job.

## 1. Brain-first pull (sequential, then parallel reads)

```bash
cd /Users/pk/projects/agentcrush-brain && git pull --rebase origin main
```

Read in parallel:
- `STATE.md`
- `Memory.md`
- `Queue/open.md`
- The relevant page in `Projects/` (pick based on Kris's session intent if stated)

## 2. System health check (parallel with step 3)

SSH directly (locked rule — never relay through Kris):
```bash
ssh root@104.248.240.129 'systemctl is-active agentcrush-morning-brief.timer agentcrush-morning-brief-retry.timer agentcrush-neynar-fetcher.timer agentcrush-x-fetcher.timer agentcrush-cost-monitor.timer; echo "---last brief run---"; journalctl -u agentcrush-morning-brief.service --since today --no-pager | tail -20; echo "---failed units---"; systemctl list-units --state=failed --no-pager'
```

Correct unit name is `agentcrush-morning-brief.service` (no `-ajsa-` infix). One-shot service, so `inactive` after a successful run is normal — check the journal for the actual outcome. Note any failures. Do not auto-restart without Kris's call.

## 2a. Relay today's brief from VPS → GitHub brain (NEW — fixes the 2026-05-23 hole)

VPS git push is blocked by design (security boundary). Mac COO must relay. Run before step 3 so the social-analyst reads the freshly pulled brief from the local brain.

```bash
DATE=$(date -u +%Y-%m-%d)
BRIEF_REL="Agents/ajsa/output/social-brief-${DATE}.md"
BRAIN=/Users/pk/projects/agentcrush-brain
TMP_BRIEF=$(mktemp) && TMP_LOG=$(mktemp)

# Pull to temp files first; only overwrite brain copies if non-empty
ssh root@104.248.240.129 "cat /opt/agentcrush-brain/${BRIEF_REL}" > "$TMP_BRIEF" 2>/dev/null
ssh root@104.248.240.129 'cat /opt/agentcrush-brain/Agents/ajsa/posted-log.md' > "$TMP_LOG" 2>/dev/null

[ -s "$TMP_BRIEF" ] && cp "$TMP_BRIEF" "${BRAIN}/${BRIEF_REL}"
[ -s "$TMP_LOG" ]   && cp "$TMP_LOG"   "${BRAIN}/Agents/ajsa/posted-log.md"
rm -f "$TMP_BRIEF" "$TMP_LOG"

# Commit + push if there are changes; no-op if VPS had nothing new
cd "$BRAIN" && git add "${BRIEF_REL}" Agents/ajsa/posted-log.md 2>/dev/null
git diff --cached --quiet || (git commit -m "relay: ajsa social brief ${DATE} + posted-log auto-appends from VPS" && git push origin main)
```

Guards: temp-file staging means an SSH failure (network, brief absent, VPS down) never wipes the local copy. If the brief file doesn't exist on VPS yet, `[ -s ]` skips the copy and the commit step no-ops. Report the brief's absence in step 4 system health.

## 3. Delegate to social-analyst sub-agent

Use the Agent tool with `subagent_type: social-analyst`. Prompt:

> Vet today's Ajsa social brief. Date: YYYY-MM-DD UTC. Follow your standard pipeline (URL verify, topic dedup, voice rules, cadence). Return the structured report only.

The sub-agent handles: SSHing for the brief, URL verification, posted-log dedup, voice checks, cadence math. It returns the structured report.

## 4. Present to Kris

Combine sub-agent report + your own health check into ONE message:

```
## Morning brief — YYYY-MM-DD

### System health
- Ajsa brief: [ran OK at HH:MM / failed: reason / absent on VPS]
- VPS→GitHub relay: [pushed commit <sha> / no-op (already current) / skipped — brief absent]
- Timers: Neynar [active], X [active], Ajsa morning-brief [active], retry [active], cost-monitor [active]
- Failed units: [none / list]
- Alerts since last session: [none / list]

### Cadence
[from social-analyst]

### Ready drafts
[from social-analyst — per-draft approve/edit/skip]

### Killed drafts (and why)
[from social-analyst]

### Open questions for Kris
[from social-analyst + anything from STATE.md blockers needing decisions]
```

## 5. After Kris responds

For each draft Kris approves AND posts (Kris posts manually — X manual-only until dev auth, Farcaster manual per current process), append an entry to `/Users/pk/projects/agentcrush-brain/Agents/ajsa/posted-log.md` using the format documented at the top of that file.

Material session events → append to `Log.md` (the SessionStart hook already stubbed an entry header).

## Hard rules
- Do NOT post anything. Telegram approval gate is the final gate.
- Do NOT auto-restart VPS services without Kris's call.
- Do NOT skip the social-analyst delegation — keeping vetting in a sub-agent keeps the main thread legible.
