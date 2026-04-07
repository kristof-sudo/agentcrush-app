# Phase 10: Mike Shadow Workflow Status Cleanup

**Date:** 2026-04-07  
**Branch:** `mike/stage-1-feed-mix`  
**Commit:** `5fa2f07`

## Problem

All three pipeline workers (scanner, selector, copydesk) used `createWorkflow()` to insert shadow workflow rows with `status = "in_progress"`, but no worker ever called an update to set the final status. Every workflow remained permanently stuck at `in_progress`, making Mission Control's workflow view unreliable.

**Before-state (queried 2026-04-07):**
```
Total workflows: 140
  completed:   13  (9%)
  in_progress: 127 (91%)
```

The 13 `completed` rows were set manually or by external tooling — none were written by the workers themselves.

## Root Cause

No `closeWorkflow()` function existed in any worker. The shadow logging module was added in Phase 3 with `createWorkflow()` and `logWorkflowEvent()` but the lifecycle was never completed. Additionally, all fatal-path `main().catch()` handlers had no access to `workflow_id` (it was scoped inside `main()`).

## Fix

Added `closeWorkflow(workflow_id, finalStatus)` to each worker (fail-silent, same pattern as existing shadow functions). Added a module-level `_activeWorkflowId` variable so `main().catch()` can close the workflow as `"failed"` on fatal errors.

### Scanner (`scanner/x-scanner-worker.mjs`)

| Exit path | Before | After |
|-----------|--------|-------|
| Normal completion | `logWorkflowEvent` → STUCK | `logWorkflowEvent` → `closeWorkflow("completed")` |
| Fatal error | No update | `closeWorkflow("failed")` via `_activeWorkflowId` |
| Cap-skip / interval-skip | Exit before `createWorkflow()` | No change needed (workflow never created) |

### Selector (`selector/x-selector-worker.mjs`)

| Exit path | Before | After |
|-----------|--------|-------|
| Cap-skip | `logWorkflowEvent` → STUCK | `logWorkflowEvent` → `closeWorkflow("completed")` |
| No-candidates | No event, no close → STUCK | `logWorkflowEvent` + `closeWorkflow("completed")` |
| Normal completion | `logWorkflowEvent` → STUCK | `logWorkflowEvent` → `closeWorkflow("completed")` |
| Fatal error | No update | `closeWorkflow("failed")` via `_activeWorkflowId` |

### Copydesk (`copydesk/copydesk-worker.mjs`)

| Exit path | Before | After |
|-----------|--------|-------|
| Daily-cap-skip | No event, no close → STUCK | `logWorkflowEvent` + `closeWorkflow("completed")` |
| No-jobs | `logWorkflowEvent` → STUCK | `logWorkflowEvent` → `closeWorkflow("completed")` |
| Post-loop completion | No event, no close → STUCK | `logWorkflowEvent` + `closeWorkflow("completed")` |
| Fatal error | No update | `closeWorkflow("failed")` via `_activeWorkflowId` |

## Deployment

Changes synced to VPS paths:
- `/opt/agentcrush/scanner/x-scanner-worker.mjs`
- `/opt/agentcrush/selector/x-selector-worker.mjs`
- `/opt/agentcrush/copydesk/copydesk-worker.mjs`

Workers are timer-triggered oneshot units — no restart required. Changes take effect on next scheduled run.

## Expected After-State

All new workflow rows created after this fix will transition from `in_progress` → `completed` (or `"failed"` on fatal errors). The 127 existing stuck rows are historical and will not be retroactively updated.

Mission Control can now trust that `in_progress` means a worker is actively running (not a stale ghost from a previous run).
