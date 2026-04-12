# Phase 9: Mission Control Operational Validation

Executed 2026-04-07. Live data pulled from Supabase for each panel.

---

## Panel 1: Workflow Traces

**Route:** `GET /api/mission-control/workflow-traces`
**Tables:** `workflows`, `workflow_events`
**Data reality:** MIXED (REAL_RUNTIME events, broken workflow status)

**Live state:**
- 65 total workflows in database
- Latest 5 are from VPS workers (copydesk, selector) — real runtime activity
- Every recent workflow shows `status: in_progress` — including ones whose events show `status: done`
- Events for the latest 5 correctly show real roles (copydesk, selector) with real task_types

**Root cause of status problem:** The VPS shadow logging code creates a workflow row with `in_progress` and logs the event, but never updates the workflow to `completed` after the event is done. This means all 65 Mike runtime workflows are permanently stuck at `in_progress`.

**Operator question:** *"What is the latest governed workflow?"*
- Can be partially answered: you can see the latest workflow_ids and their events (roles, task_types, trace_ids)
- Cannot be answered cleanly: the status column is meaningless for Mike workflows — everything reads `in_progress`

**Population quality:** Populated but weak — real events present, lifecycle status broken.

---

## Panel 2: Reviews & Outcomes

**Route:** `GET /api/mission-control/reviews-outcomes`
**Tables:** `workflow_reviews`, `workflow_outcomes`
**Data reality:** SYNTHETIC_TEST

**Live state:**
- 20 reviews — all from Phase 9 gate tests (`gt_` prefix) and Phase 8 Scout/Judge test runs
- 20 outcomes — all from Scout/Judge synthetic runs (candidates_found, judge_result)
- Zero reviews from real build approvals
- Zero outcomes from real Mike pipeline activity

**Operator question:** *"Was a review approved or rejected?"*
- Technically answerable from the data shown, but the reviews visible are all synthetic test artifacts from adversarial gate testing — not real operational decisions
- A real build approval review (from the build-approval flow) would show up here, but none have been created since Phase 4 was deployed

**Population quality:** Mostly synthetic — not operationally useful yet.

---

## Panel 3: Exception Queue

**Route:** `GET /api/mission-control/exception-queue`
**Tables:** `workflows` (failed/rejected), `workflow_reviews` (rejected)
**Data reality:** REAL_PRODUCT_STATE

**Live state:**
- 0 failed workflows
- 0 rejected reviews
- Panel correctly shows "No exceptions ✓"

**Operator question:** *"Are there any exceptions?"*
- Correctly answered: No. Queue is empty and accurately reflects that.

**Population quality:** Empty — not because it's broken, but because no exceptions have occurred. Accurate.
**Note:** This panel is the only one that accurately reflects real product state without noise from synthetic data.

---

## Panel 4: Build Approvals

**Route:** `GET /api/mission-control/build-approvals`
**Tables:** `build_approvals`
**Data reality:** REAL_PRODUCT_STATE

**Live state:**
- 13 total build approvals
- All from 2026-03-24 (2 weeks before this validation)
- 1 approved (`debug/final-telegram-check`), 12 pending (stale debug/codex branches)
- No approvals have been created since Phase 4 review gate was deployed

**Operator question:** *"What is the current approval state?"*
- Historical approvals are visible and real
- There is no current approval activity — the last real approval is 2 weeks old
- The 12 `pending` rows are stale from debug sessions and unlikely to be actioned

**Population quality:** Populated but stale — historical reality, not current operational state.

---

## Panel 5: Scout/Judge Trigger

**Route:** `POST /api/mission-control/run-scout-judge` (trigger), `GET /api/mission-control/workflow-traces` (visibility)
**Component:** `ScoutJudgeTrigger` in Mission Control
**Data reality:** SYNTHETIC_TEST

**Live state:**
- Button works: triggers `tools/run-scout-judge-workflow.mjs` and returns workflow_id + stdout
- 7 scout + 7 judge events in `workflow_events` (from Phase 8 and Phase 9 validation runs)
- Candidates come from a fixed internal pool — no external API call
- Run results appear in Workflow Traces panel immediately after trigger

**Operator question:** *"Did the latest Scout/Judge run succeed?"*
- YES — triggerable from Mission Control, workflow_id visible in result, trace visible in panel below
- But: the run is always synthetic; it does not reflect real agent discovery

**Population quality:** Functional but synthetic.

---

## Panel Scorecard

| Panel | Data Reality | Populated? | Operationally Useful? | Key Issue |
|---|---|---|---|---|
| Workflow Traces | MIXED | Yes — 65 workflows | Partially | All Mike workflows stuck at `in_progress` status |
| Reviews & Outcomes | SYNTHETIC_TEST | Yes — 20 each | No | Only test artifacts; no real build reviews |
| Exception Queue | REAL_PRODUCT_STATE | Yes — empty | Yes (accurately empty) | None |
| Build Approvals | REAL_PRODUCT_STATE | Yes — 13 rows | Partially | Stale (2 weeks), no current activity |
| Scout/Judge Trigger | SYNTHETIC_TEST | Yes — functional | Partially | Synthetic only; candidates not real |

---

## Overall Verdict

**PARTIAL**

Three of five panels have data. Exception Queue is accurate. Build Approvals shows real history. Workflow Traces shows real runtime events but with a broken status field. Reviews and outcomes panels show only synthetic test artifacts.

---

## Top 3 Gaps Preventing Stronger Operator Usefulness

**1. Mike VPS workflows are permanently stuck at `in_progress`**
The VPS shadow logging creates workflow rows but never updates them to `completed`. Every runtime workflow in the table shows `in_progress` regardless of event status. This makes the status column on Workflow Traces meaningless. Fix required: VPS workers must update `workflows.status` to `completed` after logging the event.

**2. Reviews & Outcomes panel contains only synthetic test data**
No real build approval reviews exist in `workflow_reviews` since Phase 4 was deployed. The panel is populated entirely by Phase 9 gate tests and Scout/Judge synthetic runs. It cannot answer operational questions about real code review decisions. Fix required: trigger a real build approval flow so a real review row is written.

**3. Logging code is on the VPS but not in the repo**
The shadow logging behavior visible in data has no corresponding code in `runtime/`. An operator reading the repo cannot understand or reproduce what the VPS is doing. This makes it impossible to audit, fix the `in_progress` bug, or extend coverage to selector/copydesk normal paths. Fix required: pull the VPS logging code back into the repo.
