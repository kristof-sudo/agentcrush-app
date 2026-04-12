# Phase 9: Proof Inventory

Validation artifact for Phases 0–8. Documents what was built, what tables are in use,
what proof must be collected, and what is known to be incomplete entering Phase 9.

---

## 1. Files Created / Modified

### Contracts / Docs
| File | Phase | Action |
|---|---|---|
| `docs/contracts/workflow_contracts_v1.md` | 0 | Created |
| `docs/contracts/scout_judge_contracts_v1.md` | 8 | Created + patched |

### Supabase Migrations
| File | Phase | Action |
|---|---|---|
| `supabase/migrations/phase1_workflow_foundation.sql` | 1 | Created + applied |
| `supabase/migrations/phase2_trust_fields.sql` | 2 | Created + applied |
| `supabase/migrations/phase5_memory.sql` | 5 | Created + applied |
| `supabase/migrations/phase6_identity_graph_fields.sql` | 6 | Created + applied |

### Product / API Routes
| File | Phase | Action |
|---|---|---|
| `src/app/agent/[handle]/page.js` | 2 | Modified — trust fields added to select + UI |
| `src/app/api/build-approvals/create/route.js` | 4 | Modified — workflow gate added |
| `src/app/api/build-approvals/approve/route.js` | 4 | Modified — review record + workflow advance |
| `src/app/api/build-approvals/ship/route.js` | 4 | Modified — hard review gate enforced |

### Mission Control
| File | Phase | Action |
|---|---|---|
| `src/app/mission-control/page.js` | 7–8 | Modified — 5 new panels + orchestration trigger |
| `src/app/api/mission-control/workflow-traces/route.js` | 7 | Created |
| `src/app/api/mission-control/reviews-outcomes/route.js` | 7 | Created |
| `src/app/api/mission-control/exception-queue/route.js` | 7 | Created |
| `src/app/api/mission-control/build-approvals/route.js` | 7 | Created |
| `src/app/api/mission-control/run-scout-judge/route.js` | 8 | Created |

### Mike VPS Runtime
| File | Phase | Status |
|---|---|---|
| `runtime/scanner/x-scanner-worker.mjs` | 3 | Pre-existing; confirmed writing to `workflow_events` |
| Other runtime workers (selector, copydesk) | 3 | Pre-existing; shadow logging not yet confirmed |

### Scripts / Tools
| File | Phase | Action |
|---|---|---|
| `tools/phase1-workflow-test.mjs` | 1 | Created + executed |
| `tools/phase2-trust-test.mjs` | 2 | Created + executed |
| `tools/phase3-verify-shadow-log.mjs` | 3 | Created + executed |
| `tools/phase5-memory-test.mjs` | 5 | Created + executed |
| `tools/phase6-backfill.mjs` | 6 | Created + executed |
| `tools/run-scout-judge-workflow.mjs` | 8 | Created + executed |

---

## 2. Supabase Tables / Fields in Use

### `workflows`
- `workflow_id` TEXT PK — deterministic, entry-point generated
- `status` TEXT — lifecycle state (created → in_progress → review_required → approved/rejected → completed/failed)
- `created_at` TIMESTAMPTZ

### `workflow_events` (append-only)
- `workflow_id`, `trace_id` — composite unique key
- `role` TEXT — product_executor / scout / judge / scanner / selector / copydesk
- `task_type` TEXT — code_change / deploy / publish / analysis / migration
- `input`, `decision`, `output` JSONB
- `status` TEXT

### `workflow_reviews`
- `review_id` TEXT PK — format: `rv_<trace_id>`
- `workflow_id`, `trace_id` — FK → workflow_events unique key (event linkage enforced)
- `reviewer_role` TEXT — constrained to `reviewer`
- `review_status` TEXT — approved / rejected
- `review_notes` TEXT — required when rejected

### `workflow_costs`
- `workflow_id`, `cost_type` (x_api / llm / other), `estimated_cost`, `actual_cost`

### `workflow_decisions`
- `workflow_id`, `trace_id`, `decision` JSONB — Judge output only

### `workflow_outcomes`
- `workflow_id`, `outcome` JSONB

### `workflow_summaries`
- `workflow_id`, `summary` TEXT

### `agents` — trust fields (Phase 2)
- `claimed_by` TEXT
- `claim_status` TEXT — unclaimed / claimed / verification_requested / verified
- `verified_source` BOOLEAN

### `agents` — identity/composition fields (Phase 6)
- `identity_type` TEXT — agent / tool / framework / runtime / organization
- `builder_attribution` TEXT
- `framework` TEXT
- `runtime` TEXT
- `dependencies` JSONB

---

## 3. Proof Artifact Checklist

| # | Artifact | Tag | Status |
|---|---|---|---|
| 1 | Real workflow trace (wf_test_001) | SYNTHETIC_TEST | Confirmed |
| 2 | Real review record (rev_001) | SYNTHETIC_TEST | Confirmed |
| 3 | Real outcome record (wf_test_001) | SYNTHETIC_TEST | Confirmed |
| 4 | Trust-visible product surface (agent page) | REAL_PRODUCT_STATE | Code deployed; visible if trust fields populated |
| 5 | Mike shadow event — scanner | REAL_RUNTIME | Confirmed (1 row, 12:32 UTC) |
| 6 | Mike shadow event — selector | REAL_RUNTIME | Not yet confirmed |
| 7 | Mike shadow event — copydesk | REAL_RUNTIME | Not yet confirmed |
| 8 | Scout/Judge workflow run | MIXED | Confirmed synthetic; real dispatch not yet wired |
| 9 | Mission Control panel proof | REAL_PRODUCT_STATE | Panels exist; real-data utility unvalidated |
| 10 | Cost governance proof | SYNTHETIC_TEST | Schema + 1 test row; no real cost writes yet |
| 11 | Identity/composition validation sample | REAL_PRODUCT_STATE | 5 agents backfilled (autogpt, devin, langgraph, semantickernel, crewaiecosystem) |

---

## 4. Data Reality Tags

| Tag | Meaning |
|---|---|
| `REAL_RUNTIME` | Written by a live runtime process (VPS workers, real pipeline runs) |
| `REAL_PRODUCT_STATE` | Reflects real product state (deployed UI, real agent rows, real build approvals) |
| `SYNTHETIC_TEST` | Written by a test script; deterministic but not from a live process |
| `MIXED` | Partially real (schema, governance layer) but execution is synthetic |

---

## 5. Known Incomplete Areas Entering Phase 9

- **Cost governance** — `workflow_costs` schema exists and has 1 synthetic row; no real cost writes from runtime workers yet. X API and LLM spend is not flowing into the table.
- **Scout/Judge** — currently synthetic only. Runner exists and is callable from Mission Control, but is not wired to a real signal source or real dispatch path. Candidates are drawn from a fixed pool.
- **Identity/composition** — only 5 rows backfilled manually. Remaining ~N agents have null identity fields. No systematic backfill process exists.
- **Mission Control real-data usefulness** — panels exist and render; real operational value is unconfirmed. Exception queue and build approvals panels have not been exercised with real failure or real build approval data visible in session.
- **Mike shadow promotion readiness** — scanner is logging to `workflow_events`, but selector and copydesk are unconfirmed. No promotion path from shadow log to governed workflow action has been defined or tested.
- **Dual-agent reviewer path** — the contract defines `reviewer` as Codex or fallback reviewer, but no automated Codex-as-reviewer path has been built or validated. All reviews in the system are currently operator-inserted or script-inserted.
