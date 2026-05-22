---
description: End-of-day routine — summarize work, append Log.md entry, update STATE.md if material, ensure brain commits cleanly
---

# /end-day — COO end-of-day routine

Companion to `/morning`. Run before closing the session so the brain reflects today accurately and tomorrow's `/morning` starts from clean state.

## 1. Take stock — what actually happened today

Review the session transcript (your context). For each item, classify:

- **Shipped** — code merged + deployed, content posted, system live
- **Decided** — directional call made, nothing built
- **Discovered** — finding that changes future work (bug, blocker, opportunity)
- **Open** — work started but not closed; needs continuation

Do not pad. If nothing material happened, the entry can be one bullet under "Did" and that's fine — empty days are honest data.

## 2. Append Log.md entry

Use the brain MCP server (registered as `brain`):

```
mcp__brain__append_log(
  agent: "Claude Code",
  did: ["..."],
  decided: ["..."],     // omit if nothing decided
  open: ["..."],        // omit if nothing left open
  handoff: ["..."]      // omit if no specific note for next session
)
```

If the MCP server is not registered, fall back to a direct append:
```bash
cd /Users/pk/projects/agentcrush-brain
# Append entry matching the format at the top of Log.md
```

The SessionStart hook already stubbed a header earlier — your append goes BELOW that stub. Either fill the stub in or leave it (stubs are fine; the SessionEnd hook commits them).

## 3. Update STATE.md ONLY if material

Update STATE.md when:
- A phase status changed (item ✅ that was ⏳, item added/removed)
- A blocker resolved or new blocker surfaced
- A KPI / metric changed enough to be worth recording
- A "what's running daily" entry needs adjustment

Do NOT update STATE.md for:
- Routine completions inside a phase already documented
- Drafts that posted (those go in `Agents/ajsa/posted-log.md`)
- One-off bugs that got fixed (those live in commit messages)

If unsure, skip — STATE.md noise is worse than missing detail.

## 4. Update Queue/open.md if any item closed or new item started

Tick checkboxes for completed items. Add new lines for items that surfaced. Group placement matters (critical path / product / distribution / done).

## 5. Refresh brain indexes (auto)

If any files were added/renamed/removed in the brain this session, regenerate the per-directory `_index.md` listings:

```bash
node /Users/pk/projects/agentcrush-brain/tools/index-sweep.mjs
```

Idempotent — skips unchanged directories. Safe to run unconditionally at end of every session.

## 6. Verify brain will commit cleanly

The SessionEnd hook commits + pushes brain on session close. Quick sanity:

```bash
cd /Users/pk/projects/agentcrush-brain && git status --short
```

If there are files you do NOT want auto-committed (e.g. work-in-progress in Inbox/ that you want to leave un-pushed for now), either stash them or move them to `tmp/` (gitignored). Otherwise the hook will sweep them.

## 7. Post final summary to Kris

One message, 3-5 lines:

```
End of day — YYYY-MM-DD

Shipped: ...
Decided: ...
Open for tomorrow: ...
Brain: committed + pushed (X files)
```

That's it. No links unless Kris specifically needs one.

## Hard rules
- NEVER skip the Log.md append on a material day. Future sessions rely on it.
- NEVER add a STATE.md entry for non-material work just to look productive.
- NEVER auto-commit code with `git push` on `agentcrush-app` from this command — that's deliberate. SessionEnd hook only touches brain.
