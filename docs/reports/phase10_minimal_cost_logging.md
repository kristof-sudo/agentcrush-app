# Phase 10: Minimal Real Cost Logging

**Date:** 2026-04-07  
**Branch:** `mike/stage-1-feed-mix`  
**Commit:** `d99db64`

## Chosen Lane

**Mike/runtime** — the only lane with real X API cost signals and per-call budget tracking already in place.

## Chosen Cost Source

**X API cost (scanner only)** — `cost_type: "x_api"`.

The scanner is the only worker that:
- Makes actual X API calls (via `recordXApiCalls()`)
- Has a per-call cost tracked in `state/x-api-cost.mjs` ($0.0077/call)
- Has a cumulative daily state file (`state/x_api_cost.json`) that reflects real spend

Per-run cost is computed as the delta in `estimated_usd` before vs after the scan phase:
```js
const preScanUsd = checkScannerCap().estimatedUsd;   // snapshot before scan
// ... scanning happens, recordXApiCalls(1) called per API response ...
const finalCap = checkScannerCap();                   // snapshot after scan
const runCostUsd = Math.max(0, finalCap.estimatedUsd - preScanUsd);
await logWorkflowCost(workflow_id, runCostUsd);
```

**LLM/model cost was not included.** The copydesk worker tracks token counts (`usage.prompt_tokens`, `usage.completion_tokens`) but does not calculate a USD equivalent. Including fabricated per-token estimates would not be truthful. Skipped per task requirement.

## Files Changed

**`runtime/scanner/x-scanner-worker.mjs`** (VPS + repo)

Added:
1. `logWorkflowCost(workflow_id, estimatedCost)` — fail-silent function that inserts into `workflow_costs` with `cost_type: "x_api"`. Logs `[cost] logWorkflowCost attempt/success/failed` for journalctl visibility.
2. `preScanUsd` snapshot immediately after `createWorkflow()`.
3. `runCostUsd = Math.max(0, finalCap.estimatedUsd - preScanUsd)` + `logWorkflowCost()` call after `closeWorkflow()`.

No other files changed.

## Anti-Double-Count Rule

**Only the scanner writes `x_api` workflow_costs rows.**

- Selector calls `checkXApiCap()` but makes zero X API calls. It must not write an `x_api` cost row.
- Copydesk makes no X API calls. It must not write an `x_api` cost row.
- Scanner writes exactly one row per scan run (zero rows if `runCostUsd <= 0`).

## workflow_costs Schema Used

```
id             — auto
workflow_id    — FK → workflows.workflow_id (must exist)
cost_type      — "x_api" (enum: x_api | llm | other)
estimated_cost — per-run USD delta (DECIMAL)
actual_cost    — null (X API has no exact per-call billing line)
created_at     — auto
```

## Live Evidence Status

**Code complete and deployed to VPS.** Insert mechanism verified correct via integration test — a real `workflow_costs` row was inserted and confirmed against Supabase using a live `workflow_id`.

**No authentic runtime row exists today.** The X API daily cap was exhausted before this fix was deployed (`$1.902` spent, scanner cap = `$1.40`). The scanner's cap-skip path exits *before* `createWorkflow()`, so no workflow is created and no cost row is triggered.

Today's scanner runs (real data from `runs` table):

| Time (UTC) | x_api_calls | x_api_cost_usd | calls_today | cost_today |
|---|---|---|---|---|
| 00:30:34 | 23 | $0.0759 | 28 | $0.2156 |
| 02:30:56 | 23 | $0.0759 | 64 | $0.4928 |
| 04:31:09 | 23 | $0.0759 | 89 | $0.6853 |
| 06:31:13 | 23 | $0.0759 | 143 | $1.1011 |

Each of these runs would have produced a `workflow_costs` row had the fix been deployed earlier.

**First authentic row** will appear at UTC midnight reset (2026-04-08), when the scanner cap resets and the next scheduled scan runs.

## Remaining Cost Governance Gap

| Gap | Status |
|---|---|
| Copydesk LLM cost (`llm` rows) | Not implemented — tokens are tracked but no USD calculation exists in runtime |
| Selector cost | N/A — no external API calls, no cost to attribute |
| Scanner `actual_cost` | Always null — X API does not provide per-call billing; estimated only |
| Historical cost rows | Not backfilled — 4 scanner runs today have no cost rows |
| Cross-lane cost aggregation | Not implemented — `workflow_costs` has no lane or agent field |
