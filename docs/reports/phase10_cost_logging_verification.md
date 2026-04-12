# Phase 10: Cost Logging Verification

Executed 2026-04-08T~02:10 UTC. Direct Supabase query against live data after X API budget cap reset at UTC midnight.

---

## Verdict Up Front

**PASS**

Real scanner cost rows are being written to `workflow_costs`. Two scanner runs since UTC reset have each produced a `cost_type=x_api` row with a non-zero `estimated_cost` tied to a real runtime workflow. The `workflow_costs` table has moved from STRUCTURAL_ONLY (Phase 9 verdict) to operationally live for the scanner lane.

---

## 1. Scanner Workflows Since UTC Reset

Three scanner events exist in total. Two are from today (post-reset); one is from yesterday.

| workflow_id | created_at | status | input.activity | tweets_stored |
|---|---|---|---|---|
| `wf_1775613608921_y7raw` | 2026-04-08T02:00 UTC | **completed** | HIGH | 46 |
| `wf_1775606408380_u9bps` | 2026-04-08T00:00 UTC | **completed** | NORMAL | 49 |
| `wf_1775565130289_uqgnu` | 2026-04-07T12:32 UTC | in_progress | normal | 14 |

**Two observations beyond cost logging:**

1. **Workflow status is now `completed` for scanner.** Yesterday's scanner run was stuck `in_progress` — the Phase 10 VPS patch is working for the scanner process. The fix has not yet reached selector or copydesk (still `in_progress` as of last night's verification), but scanner is closing correctly.

2. **`input.activity` field has been promoted to uppercase** (`NORMAL`, `HIGH` vs. yesterday's `normal`). This is a minor VPS-side code evolution visible in the shadow log — another signal of repo/VPS divergence that will need reconciliation in Step 2 of the Phase 10 runtime reconciliation plan.

---

## 2. Latest Scanner Workflow Detail

**workflow_id:** `wf_1775613608921_y7raw`

**Workflow row:**

| Field | Value |
|---|---|
| workflow_id | `wf_1775613608921_y7raw` |
| status | `completed` |
| created_at | 2026-04-08T02:00:09 UTC |

**workflow_events row:**

| Field | Value |
|---|---|
| trace_id | `tr_bn2g5mg` |
| role | `scanner` |
| task_type | `analysis` |
| status | `done` |
| input | `{"activity":"HIGH","queries_scanned":1,"accounts_scanned":10}` |
| output | `{"insert_errors":0,"tweets_stored":46,"replies_stored":0}` |
| created_at | 2026-04-08T02:00:15 UTC |

---

## 3. workflow_costs Row for Latest Scanner Run

| Field | Value |
|---|---|
| id | 18 |
| workflow_id | `wf_1775613608921_y7raw` |
| cost_type | `x_api` |
| estimated_cost | **0.1386** |
| actual_cost | null |
| created_at | 2026-04-08T02:00:15 UTC |

---

## 4. Full workflow_costs Table (All Rows)

| id | workflow_id | cost_type | estimated_cost | actual_cost | created_at |
|---|---|---|---|---|---|
| 18 | `wf_1775613608921_y7raw` | x_api | **0.1386** | null | 2026-04-08T02:00:15 |
| 17 | `wf_1775606408380_u9bps` | x_api | **0.2156** | null | 2026-04-08T00:00:15 |
| 1 | `wf_test_001` | other | 0.01 | 0.01 | 2026-04-07T11:56:08 |

Row 1 is the Phase 1 synthetic test row. Rows 17 and 18 are real, post-reset scanner costs.

**Today's total X API scanner spend (workflow_costs):** $0.1386 + $0.2156 = **$0.3542**

---

## 5. Verification Checklist

| Criterion | Result |
|---|---|
| Real row exists in `workflow_costs` | **PASS** — 2 rows today (ids 17 and 18) |
| `cost_type = x_api` | **PASS** — both rows |
| `estimated_cost` is non-zero | **PASS** — $0.1386 and $0.2156 |
| Tied to real runtime workflow (not synthetic) | **PASS** — both `workflow_id` values match scanner events with role=scanner, status=done |
| Workflow status is `completed` | **PASS** — scanner workflows now close correctly (VPS patch working for scanner) |
| `actual_cost` populated | **NOT YET** — null on both rows; actual_cost write path not yet implemented or runs at job close |

---

## 6. Remaining Cost Governance Gaps

These gaps persist from Phase 9 and are not resolved by this scanner fix:

| Gap | Status |
|---|---|
| Selector X API spend not in `workflow_costs` | Still absent — selector runs as `x_api_cap_skip` (cap already hit by scanner before selector fires) |
| OpenAI / copydesk cost not in `workflow_costs` | Still absent — `copydesk_outputs.model_cost_usd` still null |
| `actual_cost` never written | Confirmed — both scanner rows have `actual_cost=null` |
| Product/build lane has no cost write | Unchanged |
| Scout/Judge has no cost write | Unchanged |

The scanner lane is now the only lane writing real cost data to `workflow_costs`. It is also the only lane with corrected workflow status (`completed`). Selector and copydesk remain unpatched.

---

## 7. Phase 9 Baseline vs. Now

| Metric | Phase 9 (2026-04-07) | Now (2026-04-08) |
|---|---|---|
| Real rows in `workflow_costs` | 0 | **2** |
| Scanner workflow status | in_progress (stuck) | **completed** |
| Cost coverage (scanner lane) | None | **$0.3542 today** |
| Cost coverage (selector lane) | JSONB only | JSONB only (unchanged) |
| Cost coverage (copydesk lane) | None | None |

---

## Overall Result

**PASS — scanner cost logging is live.**

The `workflow_costs` table has transitioned from STRUCTURAL_ONLY to operationally active for the scanner lane. Two real `x_api` cost rows exist for today's scanner runs. Workflow status closes correctly for scanner. This is a meaningful step forward from Phase 9.

The Phase 9 cost governance verdict of STRUCTURAL_ONLY should now be updated to PARTIAL — one lane (scanner) is writing real cost data; two lanes (selector, copydesk) are not.
