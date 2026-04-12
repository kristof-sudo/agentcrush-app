# Phase 9: Cost Governance Validation

Executed 2026-04-07. Direct inspection of `workflow_costs`, existing spend tables, and runtime patterns.

---

## 1. workflow_costs Inspection

| Field | Value |
|---|---|
| Total rows | 1 |
| Real operational rows | 0 |
| Synthetic test rows | 1 |
| Workflows that wrote rows | `wf_test_001` (Phase 1 test script only) |

**The one row:**
```json
{
  "id": 1,
  "workflow_id": "wf_test_001",
  "cost_type": "other",
  "estimated_cost": 0.01,
  "actual_cost": 0.01,
  "created_at": "2026-04-07T11:56:08Z"
}
```

This row was inserted by `tools/phase1-workflow-test.mjs`. It is a synthetic test value with no real cost attribution.

**Conclusion:** `workflow_costs` is structurally live (schema applied, constraints working) but operationally empty.

---

## 2. Existing Spend Tracking Paths

### X API spend

**Location:** `workflow_events.input.estimated_usd` — surfaced inside selector shadow logs.

Every selector skip row contains:
```json
{ "reason": "x_api_cap_skip", "estimated_usd": 1.9019 }
```

This is real spend data (today's accumulated X API spend) flowing through the shadow log `input` field. It is NOT written to `workflow_costs`. It exists only as a JSONB field inside `workflow_events.input`, with no row-level attribution to cost_type or workflow.

**Budget cap enforcement:** Live on the VPS. When `estimated_usd` exceeds the daily cap, selector logs the skip and exits. This is real budget governance, but it lives entirely inside the runtime process — not in the workflow cost layer.

### OpenAI / model spend

**Location:** `copydesk_outputs.model_cost_usd` — queried by `src/app/api/mission-control/status/route.js`.

```js
supabase.from('copydesk_outputs').select('model_cost_usd').gte('created_at', startOfDay())
```

The `copydesk_outputs` table exists and is accessible. However, querying `model_cost_usd` returns `null` — the column either does not exist or contains no rows with that field populated today. The status route handles this gracefully (returns `null` rather than crashing), and the Cost Tracker panel in Mission Control shows `—` for OpenAI today/month.

**Conclusion:** OpenAI cost tracking infrastructure exists in code (status route) and table (copydesk_outputs) but the column is not populated. Real spend is not being captured.

### VPS runtime state files

No runtime cost tracking state files were found in the local repo or accessible from this machine. The X API spend figure appearing in selector shadow logs (`estimated_usd: 1.9019`) is computed inside the VPS process from a running total — the tracking mechanism is opaque to the repo.

---

## 3. Lane-by-Lane Classification

### A. Product / Build Lane

Scope: Build approval workflows, code changes, deploys.

| Criterion | Status |
|---|---|
| `workflow_costs` rows written | No — Phase 4 build approval flow does not write to `workflow_costs` |
| Spend tracked elsewhere | No — no cost attributed to build workflows anywhere |
| `estimated_cost` present before deploy | No — Phase 4 gate enforces review but does not require cost estimate |

**Classification: ABSENT**

No cost is tracked for any product/build workflow. The schema fields exist but nothing writes to them for this lane.

### B. Mike / Runtime Lane

Scope: X scanner, selector, copydesk.

| Criterion | Status |
|---|---|
| `workflow_costs` rows written | No |
| X API spend tracked elsewhere | Yes — `estimated_usd` in `workflow_events.input` (selector shadow log) |
| OpenAI spend tracked elsewhere | Partial — `copydesk_outputs.model_cost_usd` column exists but not populated today |
| Budget cap enforced | Yes — x_api_cap_skip runs when limit hit; enforced in VPS runtime |
| Cost truth in workflow layer | No — spend data is inside JSONB fields or a separate table, not in `workflow_costs` |

**Classification: PARTIAL**

Real X API spend flows through selector shadow logs as JSONB input. Budget cap is live and functional. But none of this is normalized into `workflow_costs`. OpenAI spend infrastructure exists but is not writing data.

### C. Scout / Judge Lane

Scope: Scout/Judge workflow runner and future agent-discovery runs.

| Criterion | Status |
|---|---|
| `workflow_costs` rows written | No — `tools/run-scout-judge-workflow.mjs` does not write to `workflow_costs` |
| Spend tracked elsewhere | No |
| LLM cost estimated | No — runner uses no external APIs, so no real cost to track |

**Classification: ABSENT**

Scout/Judge runner produces no real cost and writes nothing to `workflow_costs`. If the runner were wired to a real LLM or X API, no cost capture path exists yet.

---

## 4. Inspectability Assessment

**Can an operator inspect real spend from the workflow cost layer?**

No. The single source of real spend truth available today is:
- `workflow_events.input.estimated_usd` in selector shadow rows — readable but buried in JSONB, not surfaced in any Mission Control cost panel
- `workflow_costs` table — 1 synthetic row, no real data
- `copydesk_outputs.model_cost_usd` — queried but returning null today

The Cost Tracker panel in Mission Control shows:
- X API: `—` (tracking, not wired to `workflow_costs`)
- OpenAI Today: `—` (null from `copydesk_outputs`)
- OpenAI Month: `—` (null from `copydesk_outputs`)
- VPS: `$6.00` (static hardcoded)
- Vercel: `$0.00` (static hardcoded)

Cost truth is still almost entirely outside the workflow layer.

---

## 5. Evidence Summary

| Evidence | Source | Status |
|---|---|---|
| `workflow_costs` has 1 row | Direct query | Synthetic only |
| X API daily spend flows through selector shadow | `workflow_events.input.estimated_usd` | Real but not in cost layer |
| Budget cap enforcement is live | Selector x_api_cap_skip rows | Real and functional |
| OpenAI cost column exists | `copydesk_outputs.model_cost_usd` | Column exists, no data today |
| Product build lane has no cost write | Code inspection | Absent |
| Scout/Judge runner has no cost write | Code inspection | Absent |

---

## Overall Verdict

**STRUCTURAL_ONLY**

The `workflow_costs` schema is correct, constrained, and live in the database. One test row confirms writes work. But no operational process writes to it. Real spend data exists in two adjacent systems (selector shadow JSONB, copydesk_outputs) but is not normalized into the cost layer, not surfaced per workflow, and not inspectable from Mission Control.

---

## Top Cost Governance Gaps

1. **No lane writes to `workflow_costs`** — the schema is live but all three lanes (product, Mike/runtime, Scout/Judge) write zero real rows. The table is a structural placeholder.

2. **X API spend is buried in JSONB, not attributed per workflow** — `estimated_usd` in selector shadow `input` is real and accurate but cannot be aggregated, filtered by day, or surfaced per workflow without parsing JSONB manually. It is not normalized into `workflow_costs.estimated_cost`.

3. **OpenAI cost column exists but produces no data** — `copydesk_outputs.model_cost_usd` is queried by Mission Control's status route, which returns `null`. Either the column is unpopulated, the VPS is not writing it, or the field name mismatches. Real LLM spend is invisible to the operator.
