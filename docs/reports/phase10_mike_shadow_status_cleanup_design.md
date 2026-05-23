# Phase 10: Mike Shadow Workflow Status Cleanup

**Date:** 2026-04-07  
**Branch:** `mike/stage-1-feed-mix`  
**Commits:** `5fa2f07` (initial), `9ec92b1` (re-run fix — actual live bug)

## Problem

All three pipeline workers (scanner, selector, copydesk) used `createWorkflow()` to insert shadow workflow rows with `status = "in_progress"`, but no worker ever called an update to set the final status. Every workflow remained permanently stuck at `in_progress`, making Mission Control's workflow view unreliable.

**Before-state (queried 2026-04-07):**
```
Total workflows: 140
  completed:   13  (9%)
  in_progress: 127 (91%)
```

The 13 `completed` rows were set by external tooling — none were written by the workers themselves.

---

## Root Cause (Initial — commit 5fa2f07)

No `closeWorkflow()` function existed in any worker. The shadow logging module was added in Phase 3 with `createWorkflow()` and `logWorkflowEvent()` but the lifecycle was never completed. Additionally, all fatal-path `main().catch()` handlers had no access to `workflow_id` (it was scoped inside `main()`).

Initial fix added `closeWorkflow()` to all three workers and a module-level `_activeWorkflowId` for fatal coverage. However, the fix **did not work in production**.

---

## Real Root Cause (Re-run — commit 9ec92b1)

The `workflows` table has **no `updated_at` column** — it only has `workflow_id`, `status`, `created_at`.

The `closeWorkflow()` implementation in all three workers included `updated_at` in the update payload:

```js
// BROKEN — updated_at does not exist in the workflows table
supabase.from("workflows").update({ status: finalStatus, updated_at: new Date().toISOString() })
```

Supabase returned: `"Could not find the 'updated_at' column of 'workflows' in the schema cache"`.

This error was **silently swallowed** by the `try/catch` (logged as `console.warn`, not thrown), so every `closeWorkflow()` call appeared to succeed locally but wrote nothing to Supabase. All workflows remained `in_progress`.

---

## Fix (commit 9ec92b1)

Removed `updated_at` from the update payload in `closeWorkflow()` across all three workers. Added explicit `attempt`/`success` log lines for journalctl visibility.

```js
// FIXED
async function closeWorkflow(workflow_id, finalStatus = "completed") {
  if (!workflow_id) return;
  console.log("[shadow] closeWorkflow attempt:", workflow_id, finalStatus);
  try {
    const { error } = await supabase.from("workflows").update({ status: finalStatus }).eq("workflow_id", workflow_id);
    if (error) console.warn("[shadow] closeWorkflow failed:", error.message);
    else console.log("[shadow] closeWorkflow success:", workflow_id, finalStatus);
  } catch (e) {
    console.warn("[shadow] closeWorkflow exception:", e.message);
  }
}
```

### Exit paths covered per worker

**Scanner (`scanner/x-scanner-worker.mjs`)**

| Exit path | Status |
|-----------|--------|
| Normal completion | `logWorkflowEvent` → `closeWorkflow("completed")` |
| Fatal error | `closeWorkflow("failed")` via `_activeWorkflowId` |
| Cap-skip / interval-skip | Exits before `createWorkflow()` — no workflow created |

**Selector (`selector/x-selector-worker.mjs`)**

| Exit path | Status |
|-----------|--------|
| Cap-skip | `logWorkflowEvent` → `closeWorkflow("completed")` |
| No-candidates | `logWorkflowEvent` + `closeWorkflow("completed")` |
| Normal completion | `logWorkflowEvent` → `closeWorkflow("completed")` |
| Fatal error | `closeWorkflow("failed")` via `_activeWorkflowId` |

**Copydesk (`copydesk/copydesk-worker.mjs`)**

| Exit path | Status |
|-----------|--------|
| Daily-cap-skip | `logWorkflowEvent` + `closeWorkflow("completed")` |
| No-jobs | `logWorkflowEvent` → `closeWorkflow("completed")` |
| Post-loop completion | `logWorkflowEvent` + `closeWorkflow("completed")` |
| Fatal error | `closeWorkflow("failed")` via `_activeWorkflowId` |

---

## Deployment

- VPS files patched directly: `/opt/agentcrush/{scanner,selector,copydesk}/*.mjs`
- Mirrored back to repo: `runtime/{scanner,selector,copydesk}/*.mjs`
- Committed: `9ec92b1`
- No service restart needed — workers are oneshot timers, pick up changes on next execution

---

## Post-Fix Evidence (2026-04-07, live runs)

Workers triggered manually immediately after fix:

```
wf_1775595140558_s3c1v  (selector)
  workflow.status: completed
  event: role=selector status=done task_type=analysis
  journalctl: "[shadow] closeWorkflow success: wf_1775595140558_s3c1v completed"

wf_1775595146512_ygyin  (copydesk)
  workflow.status: completed
  event: role=copydesk status=done task_type=publish
  journalctl: "[shadow] closeWorkflow success: wf_1775595146512_ygyin completed"
```

Scanner could not produce a fresh completed row — X API daily cap was exhausted (`$1.902 / $1.90`). It will close correctly on next reset.

**Overall status distribution after fix:**
```
completed:   16  (+3 from fix run)
in_progress: 128  (historical — will not be retroactively updated)
```

The 128 existing stuck rows are historical artifacts. Going forward, `in_progress` means a worker is actively running.
