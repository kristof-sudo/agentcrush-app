# Phase 9: Scout/Judge Reality Check

Executed 2026-04-07. Final evidence-based classification of what is proven vs. still synthetic.

---

## 1. What Has Been PROVEN

### Governance layer — CONFIRMED

| Claim | Evidence | Source |
|---|---|---|
| Governed workflow lifecycle works end-to-end | 10/10 repeated runs passed; workflow → event → review → outcome → completed writes cleanly | phase9_repeated_run_validation.md |
| Scout step writes workflow_events correctly | Scout event with role=scout, task_type=analysis, input/output/status fields confirmed in DB across all runs | run-scout-judge-workflow.mjs + repeated run data |
| Judge step writes workflow_events correctly | Judge event with role=judge, trace_id=`_02`, output.result confirmed in DB | same |
| workflow_reviews written by Judge correctly | review_id, workflow_id, trace_id, reviewer_role, review_status, review_notes all confirmed in DB | same |
| workflow_outcomes written correctly (both) | Two outcomes per Scout/Judge run: candidates_found + judge_result confirmed | same |
| Scout review bound to Scout trace_id only | Review uses `trScout` (_01); Judge event uses `trJudge` (_02) — no cross-contamination | code + DB data |
| Judge cannot review its own step | Judge event trace_id is `_02`; review covers `_01` — structurally enforced by separate trace_ids | contracts v1 + code |
| Workflow completes to `completed` status | Final `db.update({ status: 'completed' })` confirmed across 10 runs | phase9_repeated_run_validation.md |
| No orphan rows possible | FK: workflow_reviews(workflow_id, trace_id) REFERENCES workflow_events — confirmed live (T6 gate test) | phase9_review_gate_tests.md |
| Mission Control manual trigger works | POST /api/mission-control/run-scout-judge → spawnSync → workflow_id returned → trace visible in Workflow Traces panel | phase9_mission_control_validation.md |
| workflow_id uniqueness across runs | All 10 run IDs distinct (`wf_<timestamp>_<6char>` format) | phase9_repeated_run_validation.md |
| Scout/Judge contracts written and patched | Contracts v1 doc covers: retrieval-only Scout, evaluation-only Judge, dispatch requires parent step, no recursive dispatch | docs/contracts/scout_judge_contracts_v1.md |

**Summary:** The governance shell — tables, lifecycle, FK constraints, role separation, trace binding, and mission control surface — is proven and working.

---

## 2. What Has NOT Been Proven

### Discovery — NOT CONFIRMED

| Claim | Status | Reason |
|---|---|---|
| Scout can discover real, previously unknown agents | **NOT PROVEN** | Candidate pool is a hardcoded 7-entry list in `run-scout-judge-workflow.mjs` (lines 35–43). No external API call, no database query, no web search. |
| Discovered candidates are not already in the index | **NOT PROVEN** | Candidates (Magnitude, Praison AI, Letta, Aider, E2B, Composio, AgentGPT) have not been checked against the live `agents` table. Several (Aider, E2B, Composio, AgentGPT) almost certainly exist already. |
| Scout output quality is meaningful | **NOT PROVEN** | Output is deterministic by `workflow_id` hash — not a judgment call. A given `workflow_id` always produces the same 3-5 candidates from the same 7-entry pool. |

### Judge — NOT CONFIRMED

| Claim | Status | Reason |
|---|---|---|
| Judge evaluates candidate quality | **NOT PROVEN** | Judge event output is hardcoded: `result: 'approved', reason: '${count} valid candidates, bounded output, no side effects'`. It does not inspect individual candidates, cross-reference the index, or apply any real evaluation logic. |
| Judge can reject a Scout run | **NOT PROVEN** | No rejection path exists in the runner. The review is always `approved` regardless of what Scout returned. |
| Judge produces useful signal for indexing decisions | **NOT PROVEN** | Judge output is a count acknowledgement, not a quality assessment. |

### Production value — NOT CONFIRMED

| Claim | Status | Reason |
|---|---|---|
| Scout/Judge outputs inform real indexing decisions | **NOT PROVEN** | No output from any Scout/Judge run has been used to add, update, or reject an agent from the index. |
| Candidates surface agents with real discovery value | **NOT PROVEN** | The fixed pool was chosen for test convenience, not discovery merit. |
| Operator can act on Scout/Judge results | **PARTIALLY** | Mission Control shows workflow_id and candidates in output field, but no action surface (no "ingest this candidate" button, no downstream write path). |

---

## 3. Data Reality Classification

| Layer | Classification | Basis |
|---|---|---|
| Governance structure (tables, lifecycle, FKs) | **REAL_PRODUCT_STATE** | Live in production Supabase, proven through adversarial tests and repeated runs |
| Scout workflow_events rows | **SYNTHETIC_TEST** | All Scout events contain fixed-pool candidates, not real discovery output |
| Judge workflow_events rows | **SYNTHETIC_TEST** | Judge output is a hardcoded approval string, not real evaluation |
| workflow_reviews rows | **SYNTHETIC_TEST** | All reviews are auto-approved; no real human or LLM evaluation |
| workflow_outcomes rows | **SYNTHETIC_TEST** | Count-based outcomes only; no quality signal |
| Mission Control trigger | **REAL_PRODUCT_STATE** | The trigger mechanism, API route, and UI surface are real and functional |
| Candidate discovery | **SYNTHETIC_TEST** | Fixed 7-agent pool, deterministic selection by hash |

**Overall Scout/Judge data reality: SYNTHETIC_TEST**

The governance shell is REAL_PRODUCT_STATE. Everything inside the shell — what Scout finds, what Judge evaluates, what outcomes record — is synthetic test data.

---

## 4. Activation Readiness Classification

**GOVERNED_BUT_SYNTHETIC**

### Reasoning

The Scout/Judge system is governed correctly. The workflow lifecycle, FK enforcement, role contracts, trace binding, and Mission Control surface are all proven. If real discovery logic and real evaluation logic were swapped in, the governance layer would hold them correctly.

However, the system has never performed an actual discovery task. It has never found an agent that wasn't already in a predefined list. Judge has never rejected a Scout run. No Scout/Judge output has influenced the live index. The entire operational value of the system — finding real agents, evaluating real candidates, informing real indexing decisions — is unvalidated.

**NOT_READY** would apply if the governance layer itself had critical gaps. It does not.
**READY_FOR_REAL_DATA_PILOT** would apply if real discovery had been exercised at least once and produced inspectable, usable output. It has not.

**GOVERNED_BUT_SYNTHETIC** is the accurate state: correct shell, no real fill.

---

## 5. Prerequisites for Moving Beyond Synthetic

These are the minimum preconditions before Scout/Judge can be used for real discovery work. No shortcuts.

1. **Scout must query a real source** — replace the hardcoded CANDIDATE_POOL with at least one live query (e.g., `agents` table for agents with low signals, or an X search result, or a GitHub ingestion batch). The output must not be predictable from the workflow_id alone.

2. **Candidates must be deduplication-checked** — Scout output must be cross-referenced against the live `agents` table (by handle or name) before being passed to Judge. Discovering already-indexed agents produces no value.

3. **Judge must inspect individual candidates** — Judge evaluation must examine each candidate's fields (identity_type, builder_attribution, ecosystem_layer) and produce a per-candidate recommendation, not a batch approval string. At minimum, Judge should be able to reject candidates that fail a quality bar.

4. **At least one rejection path must be exercised** — Judge must produce at least one `rejected` outcome in a real or realistic run before the system can be trusted to filter noise.

5. **One Scout/Judge output must result in an indexing action** — a candidate discovered and approved by Scout/Judge must be written (or explicitly not written) to the `agents` table, with the workflow_id recorded as provenance. Until outputs connect to the index, the system produces no product value.

---

## Summary

| Section | Finding |
|---|---|
| **Proven** | Governance shell: lifecycle, FK constraints, Scout/Judge role separation, trace binding, repeated-run stability, Mission Control trigger |
| **Not yet proven** | Real discovery, candidate quality, Judge evaluation logic, rejection path, production indexing impact |
| **Data reality** | **SYNTHETIC_TEST** (inside the governance shell); governance shell itself is **REAL_PRODUCT_STATE** |
| **Activation readiness** | **GOVERNED_BUT_SYNTHETIC** |
| **Next-step prerequisites** | Real source query, dedup check, per-candidate Judge evaluation, at least one rejection, one indexing action from output |
