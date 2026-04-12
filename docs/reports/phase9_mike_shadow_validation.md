# Phase 9: Mike Shadow Logging Validation

Executed 2026-04-07. 30 rows analyzed from `workflow_events` (roles: scanner, selector, copydesk).

---

## 1. Sample Rows Per Role

### scanner (1 row total, all time)

```json
{
  "workflow_id": "wf_1775565130289_uqgnu",
  "trace_id":    "tr_ojs20bv",
  "role":        "scanner",
  "task_type":   "analysis",
  "input":  { "activity": "normal", "queries_scanned": 2, "accounts_scanned": 10 },
  "output": { "insert_errors": 0, "tweets_stored": 14, "replies_stored": 2 },
  "status":      "done",
  "created_at":  "2026-04-07T12:32:10Z"
}
```

### selector (7 rows total, all time — sample of 2)

```json
{
  "workflow_id": "wf_1775574566122_mr73d",
  "trace_id":    "tr_531x0ae",
  "role":        "selector",
  "task_type":   "analysis",
  "input":  { "reason": "x_api_cap_skip", "estimated_usd": 1.9019 },
  "output": { "skipped": true },
  "status":      "done",
  "created_at":  "2026-04-07T15:09:26Z"
}
```

All 7 selector rows are identical in shape: `x_api_cap_skip`, skipped=true, status=done.

### copydesk (31 rows total, all time — sample of 2)

```json
{
  "workflow_id": "wf_1775574326523_3nzzz",
  "trace_id":    "tr_l9482cf",
  "role":        "copydesk",
  "task_type":   "publish",
  "input":  { "reason": "no_jobs" },
  "output": { "skipped": true },
  "status":      "done",
  "created_at":  "2026-04-07T15:05:27Z"
}
```

All 31 copydesk rows are identical in shape: `no_jobs`, skipped=true, status=done.
Copydesk fires approximately every 5 minutes.

---

## 2. Coverage Assessment

### scanner

| Path | Status |
|---|---|
| Normal scan path | CONFIRMED — 1 row with real output (14 tweets, 2 replies, accounts_scanned: 10) |
| Early-return path | NOT YET LOGGED — scanner appears to have only run once since logging was added |

Observation: After the 12:32 scan, scanner has not run again today. Budget cap on X API is likely blocking selector from triggering further scans. Only 1 sample exists.

### selector

| Path | Status |
|---|---|
| Normal decision path | NOT CONFIRMED — no rows with normal decision output visible |
| x_api_cap_skip path | CONFIRMED — all 7 rows show this path; budget consistently capped at $1.90 |

Observation: Selector is hitting the X API budget cap on every run today. The normal decision path (where selector evaluates candidates) has not been exercised since shadow logging was introduced.

### copydesk

| Path | Status |
|---|---|
| Normal job execution path | NOT CONFIRMED — no rows with job content in output |
| no_jobs path | CONFIRMED — all 31 rows show no_jobs skip path |

Observation: Copydesk fires every 5 minutes and consistently finds no jobs in queue. The normal path (where copydesk generates post copy) has not been exercised since shadow logging was introduced.

---

## 3. Early-Return Coverage

| Role | Early-Return / Skip Path Logged | Notes |
|---|---|---|
| scanner | Not applicable in current data | One normal scan run. No partial/early-return logged. |
| selector | x_api_cap_skip confirmed | This IS the skip/early-return path. Logged correctly with reason + estimated_usd. |
| copydesk | no_jobs confirmed | This IS the skip/early-return path. Logged correctly with reason. |

Skip paths are logging correctly. Normal active paths have not been exercised yet.

---

## 4. Non-Invasiveness Confirmation

**Inspection method:** Code search across `runtime/` for any shadow-log writes. Result: shadow logging code is NOT present in the local repo — it exists only on the VPS (`/opt/agentcrush`). This is a repo-VPS divergence.

**Runtime evidence (from data):**
- Copydesk fires every 5 minutes as expected — pipeline cadence is unchanged
- Selector fires every ~30 minutes as expected — cadence unchanged
- Publishing, scheduling, and Telegram approval flow are not referenced in any shadow log output
- No shadow log rows contain `publish_ready`, `approval_token`, or `send_at` fields — the approval/publishing pipeline is untouched
- `estimated_usd` in selector input is the budget tracking field from the existing pipeline, surfaced in the log but not modified

**Conclusion:** Shadow logging is append-only to `workflow_events`. No modification to publishing logic, scheduling, or approval flow is detectable from the data or local code inspection.

**Outstanding risk:** The logging code is on the VPS and not reflected in the repo. If it modifies any pipeline state (e.g., sets a flag after logging), that cannot be confirmed from this machine. The data patterns suggest it does not.

---

## 5. Readiness Classification

**Classification: SHADOW_PARTIAL**

**Reasoning:**

| Criterion | Status |
|---|---|
| Scanner normal path logged | YES — 1 real run confirmed |
| Scanner early-return path | NOT YET |
| Selector skip path logged | YES — 7 runs confirmed |
| Selector normal decision path | NOT YET — budget capped all day |
| Copydesk skip path logged | YES — 31 runs confirmed |
| Copydesk normal job path | NOT YET — no jobs in queue |
| Structure valid (workflow_id, trace_id, role, status) | YES — all rows |
| Non-invasive | YES — pipeline cadence and approval flow unchanged |
| Logging code in repo | NO — VPS divergence, not reflected locally |

Shadow logging is running, structurally correct, and non-invasive. However:
- Only skip/early-return paths have been exercised
- Normal active execution paths for selector and copydesk have not been confirmed
- The logging code is not in the repo (must be reflected back per operating rules)
- Only 1 scanner sample exists

Upgrade to `SHADOW_STABLE` requires: normal active path logged for at least selector and copydesk, and VPS code reflected back to repo.
