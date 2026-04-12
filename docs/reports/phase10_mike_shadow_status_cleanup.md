# Phase 10: Mike Shadow Workflow Status Cleanup Verification

Executed 2026-04-07T~20:50 UTC. Direct Supabase query against live data.

---

## Verdict Up Front

**The VPS patch has not taken effect.**

Every Mike runtime workflow created after the claimed patch time still shows `wf_status=in_progress` while `event_status=done`. The divergence between workflow status and event status is unchanged from the Phase 9 baseline. No workflows have been closed by the patch.

---

## 1. Total Workflow Population

| Metric | Count |
|---|---|
| Total workflows in DB | 141 |
| `completed` | 13 |
| `in_progress` | 128 |

**The 13 completed workflows are 100% synthetic test artifacts:**

| workflow_id | Source |
|---|---|
| `wf_val_1775568530499_feq1xv` through `wf_val_1775568532372_3mfup9` | Phase 9 repeated-run validation (5 governed workflow runs) |
| `wf_1775568532974_1sqsi4` through `wf_1775568536773_mj0jgh` | Phase 9 Scout/Judge runs (5 runs) |
| `wf_1775567488660_ia4n0r` | Phase 8/9 Scout test |
| `wf_scout_test_001` | Phase 8 Scout test |
| `wf_test_001` | Phase 1 test script |

Zero of the 13 `completed` rows are real Mike runtime workflows. All 128 `in_progress` rows are real Mike runtime workflows.

---

## 2. Role-Level Breakdown

### Copydesk

| Metric | Value |
|---|---|
| Total workflow_events with role=copydesk | 98 |
| Distinct workflows | 98 (one event per workflow) |
| workflow status: in_progress | **98 / 98** |
| event status: done | 98 / 98 |
| Most recent event | 2026-04-07T20:47 UTC |

**Sample rows (most recent 3):**

| workflow_id | wf_status | event_status | event input | created_at |
|---|---|---|---|---|
| `wf_1775594828115_04fo9` | in_progress | done | `{"reason":"no_jobs"}` | 2026-04-07T20:47 |
| `wf_1775594526760_ugr67` | in_progress | done | `{"reason":"no_jobs"}` | 2026-04-07T20:42 |
| `wf_1775594209033_r3i33` | in_progress | done | `{"reason":"no_jobs"}` | 2026-04-07T20:36 |

Pattern: every copydesk workflow is `wf_status=in_progress`, `event_status=done`. The no_jobs skip path still logs correctly. The workflow itself is never closed.

---

### Selector

| Metric | Value |
|---|---|
| Total workflow_events with role=selector | 18 |
| Distinct workflows | 18 |
| workflow status: in_progress | **18 / 18** |
| event status: done | 18 / 18 |
| Most recent event | 2026-04-07T20:41 UTC |

**Sample rows (most recent 3):**

| workflow_id | wf_status | event_status | event input | created_at |
|---|---|---|---|---|
| `wf_1775594461042_69hen` | in_progress | done | `{"reason":"x_api_cap_skip","estimated_usd":1.9019}` | 2026-04-07T20:41 |
| `wf_1775592659676_yo5jc` | in_progress | done | `{"reason":"x_api_cap_skip","estimated_usd":1.9019}` | 2026-04-07T20:10 |
| `wf_1775590825952_7b3th` | in_progress | done | `{"reason":"x_api_cap_skip","estimated_usd":1.9019}` | 2026-04-07T19:40 |

Pattern: every selector workflow is `wf_status=in_progress`, `event_status=done`. Budget cap skip path logs correctly (`x_api_cap_skip`, `estimated_usd`). Workflow never closed.

---

### Scanner

| Metric | Value |
|---|---|
| Total workflow_events with role=scanner | 1 |
| workflow status: in_progress | **1 / 1** |
| event status: done | 1 / 1 |
| Most recent event | 2026-04-07T12:32 UTC |

**Sample row:**

| workflow_id | wf_status | event_status | event input | event output |
|---|---|---|---|---|
| `wf_1775565130289_uqgnu` | in_progress | done | `{"activity":"normal","queries_scanned":2,"accounts_scanned":10}` | `{"tweets_stored":14,"replies_stored":2,"insert_errors":0}` |

Only one scanner run today (budget cap on X API has blocked further scans since 12:32). That run is also stuck in_progress.

---

## 3. Before / After Comparison

| Metric | Before patch (Phase 9 baseline) | After patch (now) | Change |
|---|---|---|---|
| Total workflows | 140 | 141 | +1 |
| `in_progress` | 127 | 128 | +1 |
| `completed` (Mike runtime) | 0 | 0 | 0 |
| `completed` (synthetic tests) | 13 | 13 | 0 |
| Newest Mike workflow status | in_progress | in_progress | unchanged |
| event_status=done but wf_status=in_progress | 114 | 128 | +14 |

The only change since Phase 9 is that 14 more Mike runtime workflows have been created and stuck in_progress. The patch has produced zero `completed` Mike runtime workflows.

---

## 4. What IS Working

These findings are unchanged and confirmed working:

| Behavior | Status |
|---|---|
| Shadow event logging (copydesk) | **WORKING** — 98 events with correct role, input, output, status=done |
| Shadow event logging (selector) | **WORKING** — 18 events with correct role, input (`x_api_cap_skip`, `estimated_usd`), status=done |
| Shadow event logging (scanner) | **WORKING** — 1 event with correct `accounts_scanned`, `tweets_stored`, status=done |
| Event structure (workflow_id, trace_id, role, task_type) | **CORRECT** on all rows |
| Skip paths log truthfully | **CORRECT** — no_jobs and x_api_cap_skip logged with accurate reason |
| Budget cap enforcement | **WORKING** — selector cap at $1.9019 still enforced; x_api_cap_skip fires on every run |

---

## 5. What Is NOT Working

| Behavior | Status |
|---|---|
| VPS patch closing workflows to `completed` | **NOT WORKING** — zero Mike runtime workflows have been closed |
| VPS patch closing workflows to `failed` | **NOT WORKING** — no failed transitions observed either |
| `workflows.status` reflecting run outcome | **BROKEN** — always `in_progress`, regardless of event outcome |
| Operator ability to distinguish active vs. finished workflows | **IMPOSSIBLE** — all workflows appear "running" forever |

---

## 6. Diagnosis

The bug is precisely localized:

```
VPS worker behavior (current):
  1. INSERT INTO workflows (status='in_progress')     ← happens
  2. INSERT INTO workflow_events (status='done')       ← happens
  3. UPDATE workflows SET status='completed'           ← MISSING / failing silently
```

Step 3 is either:
- **Not present in the VPS code** — the patch was not applied, or applied to the wrong file/process
- **Present but failing silently** — the UPDATE runs but hits an error that is swallowed, so `workflows.status` is never changed
- **Applied to a non-running process** — the systemd service was not restarted after the patch, so the old code is still executing

The data cannot distinguish between these three sub-cases. That requires direct VPS inspection: check the deployed file (`/opt/agentcrush/`) and the systemd service restart timestamp (`systemctl status agentcrush-copydesk`).

---

## 7. Shadow Readiness Classification

**NOT_READY** (for status cleanup specifically)

**SHADOW_PARTIAL** (overall, unchanged from Phase 9)

The event logging layer is stable and working. But the claim that the VPS patch fixed workflow status closure is false — the patch has not taken effect, or has not been applied correctly. Until at least one real Mike runtime workflow closes to `completed` or `failed`, status cleanup cannot be classified as working.

---

## Required Next Action

Before this verification can be re-run with a better outcome:

1. **Confirm patch is deployed:** SSH into VPS, verify the deployed file at `/opt/agentcrush/` contains the `UPDATE workflows SET status='completed'` call.
2. **Confirm service restarted:** `systemctl status agentcrush-copydesk` — check `Active:` timestamp to confirm it was restarted after the file was changed.
3. **Confirm no silent error:** Add a visible log line immediately after the status update so the outcome of the UPDATE is visible in `journalctl`.
4. **Re-run this verification** after the next copydesk tick (fires every ~5 minutes) and check whether the newest workflow closes.
