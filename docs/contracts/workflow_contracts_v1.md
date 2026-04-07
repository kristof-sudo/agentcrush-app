# Workflow Contracts v1

Phase 0 contract pack. Defines the minimum required for governed workflows in Phase 1.

---

## 1. workflow_id / trace_id Standard

**workflow_id**
- Format: `wf_<YYYYMMDD>_<6-char-alphanum>`
- Example: `wf_20260407_a3f9kz`
- Generated once at workflow entry point (never inside a sub-task)
- Unique per workflow instance; no two workflows share a workflow_id
- Source of truth: the component that creates the workflow record in Supabase

**trace_id**
- Format: `tr_<workflow_id>_<step-index>`
- Example: `tr_wf_20260407_a3f9kz_01`
- Generated at each discrete step within a workflow
- step-index is zero-padded integer, increments sequentially
- Created by the executor at the start of each task step

**Rules**
- workflow_id is immutable once created
- trace_id must reference a valid workflow_id
- Neither is reused, recycled, or guessed

---

## 2. Workflow Lifecycle Model

**States**

| State | Description |
|---|---|
| `created` | Workflow record exists, no steps started |
| `in_progress` | At least one task step is executing |
| `review_required` | Step hit a critical gate; awaiting reviewer decision |
| `approved` | Reviewer approved; workflow may continue |
| `rejected` | Reviewer rejected; workflow must stop |
| `completed` | All steps finished successfully |
| `failed` | A step errored; workflow halted |

**Allowed Transitions**

```
created        → in_progress
in_progress    → review_required
in_progress    → completed
in_progress    → failed
review_required → approved
review_required → rejected
approved       → in_progress
rejected       → failed
```

No other transitions are valid.

**Who Can Trigger Each Transition**

| Transition | Triggered by |
|---|---|
| created → in_progress | product_executor (Claude) |
| in_progress → review_required | product_executor (Claude) |
| in_progress → completed | product_executor (Claude) |
| in_progress → failed | product_executor (Claude) or system error |
| review_required → approved | reviewer (Codex or fallback) |
| review_required → rejected | reviewer (Codex or fallback) |
| approved → in_progress | product_executor (Claude) |
| rejected → failed | product_executor (Claude) |

---

## 3. Task Envelope Schema (v1)

Spec only. Each task step is represented by one envelope.

| Field | Type | Required | Notes |
|---|---|---|---|
| `workflow_id` | string | yes | Parent workflow identifier |
| `trace_id` | string | yes | Step-level trace identifier |
| `role` | string | yes | Role executing this step (see Role Contract) |
| `task_type` | string | yes | Short label: `code_change`, `deploy`, `publish`, `analysis`, `migration` |
| `input` | object | yes | Inputs provided to this step |
| `decision` | object or null | yes | Null until reviewer acts; populated after review |
| `output` | object or null | yes | Null until step completes; populated on completion |
| `status` | string | yes | One of: `pending`, `executing`, `review_required`, `approved`, `rejected`, `done`, `failed` |
| `created_at` | ISO 8601 timestamp | yes | Set at envelope creation; immutable |

`decision` shape (when not null):
- `reviewer_role`: string
- `outcome`: `approved` or `rejected`
- `notes`: string or null

`output` shape (when not null):
- `summary`: string
- `artifacts`: array of strings (file paths, URLs, etc.) or empty array

---

## 4. Role Contract (v1)

**Template fields:**
- `role_name` — identifier used in envelopes
- `responsibilities` — what this role does
- `allowed_actions` — explicit list of what it may do
- `forbidden_actions` — explicit list of what it must not do
- `inputs` — what it receives
- `outputs` — what it produces

---

### Role: product_executor

- **role_name**: `product_executor`
- **responsibilities**: Executes discrete engineering tasks within a governed workflow. Reads specs, writes code, applies migrations, runs builds.
- **allowed_actions**:
  - Read any file in the repo
  - Write or edit repo files
  - Run read-only Supabase queries via bounded executor
  - Trigger allowed writes via `agentcrush-supabase.py` allowlist
  - Advance workflow state (created→in_progress, in_progress→review_required, in_progress→completed, in_progress→failed)
  - Request review by setting status to `review_required`
- **forbidden_actions**:
  - Approve or reject its own work
  - Execute deploys without reviewer approval
  - Publish to X or any social channel
  - Modify workflow_id or trace_id after creation
  - Bypass the Telegram approval gate
- **inputs**: Task envelope with `task_type`, `input`, and parent `workflow_id`
- **outputs**: Populated `output` field in the task envelope; updated `status`

---

### Role: reviewer

- **role_name**: `reviewer`
- **responsibilities**: Reviews completed task envelopes at critical gates. Approves or rejects. Primary reviewer is Codex; fallback is Kristof.
- **allowed_actions**:
  - Read any task envelope and its artifacts
  - Transition workflow state: review_required→approved or review_required→rejected
  - Add notes to the review record
- **forbidden_actions**:
  - Execute any code or repo write
  - Trigger deploys or publish actions directly
  - Modify task input or output fields
  - Skip writing a review record for any critical-step review
- **inputs**: Task envelope at `review_required` status
- **outputs**: Review record (see Section 5); updated workflow state

---

## 5. Review Record Schema

One record per review action.

| Field | Type | Required | Notes |
|---|---|---|---|
| `review_id` | string | yes | Format: `rv_<trace_id>` |
| `workflow_id` | string | yes | Parent workflow |
| `trace_id` | string | yes | Task step being reviewed |
| `reviewer_role` | string | yes | `reviewer` |
| `review_status` | string | yes | `approved` or `rejected` |
| `review_notes` | string or null | yes | Required if rejected; optional if approved |
| `created_at` | ISO 8601 timestamp | yes | Set at review creation; immutable |

---

## 6. Critical-Step Review Policy

The following step types REQUIRE a review gate before proceeding. The executor must set status to `review_required` and halt until a review record with `approved` is written.

| Step Type (`task_type`) | Reason |
|---|---|
| `code_change` | Any write to the repo requires reviewer sign-off |
| `deploy` | Any deploy action (Vercel, VPS) requires reviewer sign-off |
| `publish` | Any publish to X or social channel requires reviewer sign-off |
| `migration` | Any schema change to Supabase requires reviewer sign-off |

Steps of type `analysis` do not require review unless they are a direct precursor to a `code_change` or `deploy` within the same workflow.

---

## 7. Budget Tracking Baseline

Minimal cost record. One record per workflow step that incurs cost.

| Field | Type | Required | Notes |
|---|---|---|---|
| `workflow_id` | string | yes | Parent workflow |
| `cost_type` | string | yes | One of: `x_api`, `llm`, `other` |
| `estimated_cost` | number (USD) | yes | Set before step executes |
| `actual_cost` | number (USD) or null | no | Set after step completes; null if unknown |

X scanner budget cap: $3/day max. If estimated_cost would breach this, the step must not execute without explicit reviewer approval.
