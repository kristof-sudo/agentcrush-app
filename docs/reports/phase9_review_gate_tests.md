# Phase 9: Review Gate Adversarial Tests

Executed 2026-04-07. 7 attack tests + 1 control = 8 total.

---

## Method

The gate logic from `src/app/api/build-approvals/ship/route.js` was tested directly
against Supabase — no HTTP server needed, no deploy triggered.

The gate query under test:
```sql
SELECT review_id, review_status FROM workflow_reviews
WHERE workflow_id = $workflowId
  AND trace_id    = $traceId
  AND review_status = 'approved'
```

Decision rules (exact mirror of ship/route.js):
- query error  → BLOCKED (500)
- 0 rows       → BLOCKED (400)
- 2+ rows      → BLOCKED (400)
- exactly 1 row → ALLOWED

Each test set up data conditions in Supabase then ran the gate query and recorded the outcome.

---

## Test Matrix

| # | Test | Setup | Expected | Actual | Pass |
|---|---|---|---|---|---|
| T1 | Missing review | workflow + event, no review | BLOCKED | BLOCKED | PASS |
| T2 | Mismatched trace_id | review on `tr_01`, gate checks `tr_02` | BLOCKED | BLOCKED | PASS |
| T3 | Mismatched workflow_id | review on `wf_other`, gate checks `wf_target` | BLOCKED | BLOCKED | PASS |
| T4 | Duplicate approved reviews | 2 approved rows for same (workflow_id, trace_id) | BLOCKED | BLOCKED | PASS |
| T5 | Stale review reuse | old workflow has approval, new workflow has none | BLOCKED | BLOCKED | PASS |
| T6 | Orphan review (no event) | attempted review insert without backing workflow_event | BLOCKED | BLOCKED | PASS |
| T7 | Cross-step reuse | approval from `tr_01`, gate checks `tr_02` same workflow | BLOCKED | BLOCKED | PASS |
| — | Control: valid review | exact match workflow + trace + approved | ALLOWED | ALLOWED | PASS |

---

## Findings Per Test

**T1 — Missing review**
Gate returned 0 rows. Blocked with "no approved review for this step". No bypass possible without an explicit insert.

**T2 — Mismatched trace_id**
Gate is bound to exact `trace_id`. A review for `tr_01` does not satisfy a gate query for `tr_02`. Blocked cleanly.

**T3 — Mismatched workflow_id**
Gate is bound to exact `workflow_id`. An approval under any other workflow has zero effect on the target workflow's gate.

**T4 — Duplicate approved reviews**
Gate explicitly checks `reviews.length > 1` and blocks. Inserting two approvals for the same step does not bypass — it makes the step more blocked. No escalation path through duplication.

**T5 — Stale review reuse**
Gate binds to workflow_id. An approval from a prior workflow cannot be transplanted to a new one. Blocked.

**T6 — Orphan review (no backing event)**
The database FK `workflow_reviews(workflow_id, trace_id) REFERENCES workflow_events(workflow_id, trace_id)` rejected the insert before the gate was reached. The DB layer is enforcing event linkage — the gate never even needs to handle this case. Blocked at insert time.

**T7 — Cross-step reuse**
Gate binds to trace_id. An approval for step `_01` cannot satisfy the gate for step `_02` within the same workflow. Blocked cleanly.

**Control — Valid single review**
Single approved review matching both workflow_id and trace_id returned ALLOWED. Confirmed the gate passes the legitimate path.

---

## Bypasses Found

**None.**

All 7 attack vectors were blocked. The control case passed correctly.

---

## Fixes Required

**None required.**

One observation worth noting (not a bug):
- The `build_approvals.status === 'approved'` check (existing pre-Phase 4 gate) and the workflow_reviews gate are two separate layers. The workflow_reviews gate is the harder constraint — it is the one tested here. Both must pass for ship to proceed.

---

## Final Verdict

**SECURE — 8 / 8**

The review gate is:
- bound to exact `workflow_id` (no cross-workflow reuse)
- bound to exact `trace_id` (no cross-step reuse)
- fails closed on 0 rows, multiple rows, and query error
- protected at the DB layer by FK (no orphan reviews possible)
- correctly permissive for one valid matching approval
