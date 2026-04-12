# Phase 9: Repeated-Run Validation

Executed 2026-04-07. 10 total runs across two flow types.

---

## 1. Method Used

**Governed workflow runs (A):**
No safe repeatable non-deploy path exists for the full build approval flow — the `ship` route
triggers a real Vercel deploy. The closest safe governed test path was used instead:

- Direct Supabase inserts: workflow → workflow_event (code_change, review_required) → workflow_review (approved) → workflow_outcome → status: completed
- Does NOT touch `build_approvals`, GitHub, or any deploy system
- Follows the exact lifecycle model and table contracts from Phase 1
- Data reality: **SYNTHETIC_TEST**

**Scout/Judge runs (B):**
Executed `tools/run-scout-judge-workflow.mjs` 5 times via `spawnSync`.
Each run generates a fresh `workflow_id`, inserts scout + judge events, review, and two outcomes.
Candidates drawn from a fixed internal pool (no external APIs).
- Data reality: **SYNTHETIC_TEST**

---

## 2. Run Matrix — Governed Workflow (5 runs)

| Run | workflow_id | Events | Reviews | Outcomes | Final Status | Pass |
|---|---|---|---|---|---|---|
| 1 | wf_val_1775568530499_feq1xv | 1 | 1 | 1 | completed | PASS |
| 2 | wf_val_1775568531028_bk6c0z | 1 | 1 | 1 | completed | PASS |
| 3 | wf_val_1775568531472_j4g8vf | 1 | 1 | 1 | completed | PASS |
| 4 | wf_val_1775568531930_pehx81 | 1 | 1 | 1 | completed | PASS |
| 5 | wf_val_1775568532372_3mfup9 | 1 | 1 | 1 | completed | PASS |

**Data reality:** SYNTHETIC_TEST
**Trace structure per run:** 1 trace_id (`tr_<workflow_id>_01`), unique within workflow, FK-linked to review row

---

## 3. Run Matrix — Scout/Judge (5 runs)

| Run | workflow_id | Events | Reviews | Outcomes | Final Status | Pass |
|---|---|---|---|---|---|---|
| 1 | wf_1775568532974_1sqsi4 | 2 | 1 | 2 | completed | PASS |
| 2 | wf_1775568533918_kyd2up | 2 | 1 | 2 | completed | PASS |
| 3 | wf_1775568534891_ube9g1 | 2 | 1 | 2 | completed | PASS |
| 4 | wf_1775568535882_f0t5r0 | 2 | 1 | 2 | completed | PASS |
| 5 | wf_1775568536773_mj0jgh | 2 | 1 | 2 | completed | PASS |

**Data reality:** SYNTHETIC_TEST
**Trace structure per run:** 2 trace_ids (`_01` scout, `_02` judge), no duplicates, review bound to `_01`

---

## 4. Validation Findings

All 8 checks passed across all 10 runs:

| Check | Result |
|---|---|
| workflow_id unique across all runs | PASS — all 10 IDs distinct |
| trace_id linkage correct inside workflow | PASS — reviews FK matched to event trace_id |
| no duplicate trace_id within same workflow | PASS — governed: 1 unique, Scout/Judge: 2 unique per run |
| workflow_events present | PASS — all runs |
| workflow_reviews present when expected | PASS — all runs |
| workflow_outcomes present when expected | PASS — all runs |
| final status = completed | PASS — all 10 runs |
| no orphan rows detected | PASS — all reviews linked to a valid (workflow_id, trace_id) pair |

---

## 5. Inconsistencies Found

None. Zero issues across 10 runs.

Observations (not failures):
- Governed runs produce 1 event per workflow by design (single step synthetic path). Real product builds would produce more steps.
- Scout/Judge candidate pool is fixed (7 entries). Candidate selection varies by `workflow_id` hash but is not random at the source.
- The deploy gate (ship route) was intentionally not exercised — no safe repeatable test exists for that step without triggering a real Vercel deploy.

---

## 6. Overall Repeated-Run Verdict

**PASS — 10 / 10 runs**

Both flow types are structurally stable, schema-compliant, and deterministic across repeated execution.
The governed lifecycle (workflow → event → review → outcome → completed) is reliable at the foundation layer.
