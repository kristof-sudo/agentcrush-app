# Phase 10: Mission Control Trust Cleanup

Executed 2026-04-07. Minimum code changes to make Mission Control trustworthy for an operator.

This is not a redesign. No schema changes. No new panels. Correctness and data-reality labeling only.

---

## 1. Problem Statement (Phase 9 baseline)

| Panel | Phase 9 verdict | Root cause |
|---|---|---|
| Workflow Traces | PARTIAL — misleading | All Mike runtime workflows show `in_progress` even when events are `done` |
| Reviews & Outcomes | SYNTHETIC only | 20 reviews / 20 outcomes from gate tests and Scout/Judge synthetic runs; 0 real |
| Exception Queue | REAL, accurate | No exceptions — correctly empty |
| Build Approvals | REAL but stale | 13 rows from 2+ weeks ago; no current activity |
| Scout/Judge Trigger | SYNTHETIC | Fixed 7-entry candidate pool; always auto-approved |

No panel distinguished real from synthetic data. An operator had no way to know which data was trustworthy.

---

## 2. Files Changed

| File | Change |
|---|---|
| `src/app/api/mission-control/workflow-traces/route.js` | Added `classifyWorkflow()` — annotates each workflow with `data_reality` (REAL_RUNTIME / REAL_PRODUCT_STATE / SYNTHETIC_TEST / UNKNOWN) and `events_all_done` boolean (true when wf=in_progress but all its events=done) |
| `src/app/api/mission-control/reviews-outcomes/route.js` | Added `classifyWorkflowId()` — annotates each review and outcome with `data_reality`; returns `all_synthetic: true` when all entries are synthetic |
| `src/app/mission-control/page.js` | Added `DataRealityBadge` component; added trust labels and notes to all 5 panels (see section 3) |

---

## 3. Trust Labeling Added Per Panel

### Workflow Traces

**Change:** Each workflow row now shows a small colored badge before the workflow_id:

| Badge | Color | Meaning |
|---|---|---|
| `runtime` | sky/blue | REAL_RUNTIME — scanner, selector, or copydesk event |
| `product` | emerald/green | REAL_PRODUCT_STATE — product_executor event |
| `synthetic` | dim white | SYNTHETIC_TEST — wf_val_*, gt_*, scout/judge runs |
| `?` | very dim | UNKNOWN — no events or unclassified |

**Classification logic (API):**
- `wf_val_*`, `gt_*`, `wf_test_*`, `wf_scout_test_*` prefixes → SYNTHETIC_TEST
- Events with role in `{scanner, selector, copydesk}` → REAL_RUNTIME
- Events with role `product_executor` → REAL_PRODUCT_STATE
- Events with role in `{scout, judge}` → SYNTHETIC_TEST

**Status trust fix:** When a REAL_RUNTIME workflow shows `in_progress` but all its events are `status=done`, the row now displays:
```
runtime events done · workflow status not updated by VPS
```
This replaces the previous silent misleading `in_progress` with an honest explanation of the VPS patch issue. The status column is not altered — the annotation is additive.

---

### Reviews & Outcomes

**Change:** Panel-level synthetic warning + per-row badge.

Panel header note (shown when all entries are synthetic):
```
All entries are SYNTHETIC_TEST — validation runs and gate tests only. No real build reviews exist yet.
```

Per-row: each review and outcome now shows a `[synthetic]` badge. When a real build review from a `wf_ba_*` workflow appears, it will show `[product]` instead.

**Classification logic (API):**
- `gt_*` → SYNTHETIC_TEST (Phase 9 adversarial gate tests)
- `wf_val_*` → SYNTHETIC_TEST (Phase 9 repeated-run validation)
- `wf_ba_*` → REAL_PRODUCT_STATE (real build approval reviews)
- Others (standard Scout/Judge runs) → SYNTHETIC_TEST (fixed pool, auto-approved)
- `all_synthetic: true` returned when no real entries exist

---

### Exception Queue

**Change:** When empty, the "No exceptions ✓" line now shows `REAL_PRODUCT_STATE` label on the right.

No functional change — this panel was already accurate. The label confirms to the operator that the empty state is a real product signal, not a data gap.

---

### Build Approvals

**Change:** When rows exist, a note bar appears above the list:
```
REAL_PRODUCT_STATE · last activity [age] — no new approvals since Phase 4 deploy
```

This tells the operator the data is real but stale, and why (Phase 4 review gate deployed but no new builds have been reviewed since).

---

### Scout/Judge Trigger (Orchestration)

**Change:** Inline note next to the trigger button:
```
SYNTHETIC_TEST · fixed candidate pool
```

This makes clear to any operator that triggering a Scout/Judge run produces synthetic test data, not real discovery.

---

## 4. Panels Hidden or Filtered

**None hidden.**

Every panel remains visible. Labels and notes are added to explain data reality without removing any information. The only suppression is the stale note on Build Approvals (which adds context rather than hiding rows).

---

## 5. Operator Usefulness Check (Post-Implementation)

| Operator question | Answerable? | How |
|---|---|---|
| What is the latest real runtime workflow? | **YES** | Workflow Traces — look for rows tagged `[runtime]`; most recent is the latest Mike VPS run |
| Is the runtime workflow status trustworthy? | **YES (with context)** | `[runtime]` rows now show "runtime events done · workflow status not updated by VPS" when applicable — operator understands the in_progress state is a VPS patch issue, not active processing |
| What is the latest synthetic Scout/Judge run? | **YES** | Workflow Traces — rows tagged `[synthetic]` with role=scout or role=judge; `wf_*_` prefix without val_ or gt_ |
| Are reviews/outcomes real or synthetic? | **YES** | Reviews & Outcomes shows panel-level "All entries are SYNTHETIC_TEST" warning and per-row `[synthetic]` badge. When a real review appears (wf_ba_*), it will show `[product]`. |
| Are there any exceptions? | **YES** | Exception Queue shows "No exceptions ✓ · REAL_PRODUCT_STATE" — operator knows this is a real signal, not a data gap |
| What is the latest approval state? | **YES (with staleness context)** | Build Approvals shows rows with "REAL_PRODUCT_STATE · last activity X — no new approvals since Phase 4 deploy" note |

**All 5 operator questions are now answerable.**

---

## 6. Pre-Existing Build Error

`src/app/api/mission-control/run-scout-judge/route.js` has a pre-existing Turbopack build error (`Can't resolve <dynamic>` on `spawnSync`). This error exists before and after this change set — it is not introduced by this cleanup. It requires a separate fix (the route works at runtime via Node.js but Turbopack cannot statically resolve the dynamic child_process import).

---

## 7. Data Reality Classification Summary

| Panel | Classification |
|---|---|
| Workflow Traces — Mike runtime rows | **REAL_RUNTIME** (tagged) |
| Workflow Traces — Scout/Judge rows | **SYNTHETIC_TEST** (tagged) |
| Workflow Traces — validation rows | **SYNTHETIC_TEST** (tagged) |
| Reviews & Outcomes | **SYNTHETIC_TEST** (panel warning + per-row badge) |
| Exception Queue | **REAL_PRODUCT_STATE** (label confirmed) |
| Build Approvals | **REAL_PRODUCT_STATE** (stale note added) |
| Scout/Judge Trigger | **SYNTHETIC_TEST** (inline note on button) |
