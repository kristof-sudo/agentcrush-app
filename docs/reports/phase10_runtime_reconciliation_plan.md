# Phase 10: Runtime Reconciliation Plan

Created 2026-04-07. Defines exact steps to restore repo as source of truth for Mike/runtime.

This is a plan document. No code has been modified.

---

## 1. Affected Files

| File | Status | Basis |
|---|---|---|
| `runtime/scanner/x-scanner-worker.mjs` | **REPO BEHIND VPS** | Phase 9 shadow log shows `accounts_scanned` field in scanner output — not present in repo stats object. Shadow logging additions are VPS-only. |
| `runtime/selector/x-selector-worker.mjs` | **MIXED / NEEDS REVIEW** | VPS has `x_api_cap_skip` budget cap logic (confirmed live in 7/7 selector shadow rows) — completely absent from repo. Repo has partial markers (`// step-b test marker`, `// selector-hotfix-001 test marker`) that are VPS hotfix artifacts bled back incompletely. Debug log `SELECTOR PR DEBUG` still present. |
| `runtime/copydesk/copydesk-worker.mjs` | **REPO BEHIND VPS** | VPS shadow logging additions not present. Debug logs `COPYDESK PR DEBUG` and `COPYDESK FINAL OUTPUT DEBUG` still present (lines 777–778). `model_cost_usd` not written despite column existing in `copydesk_outputs`. Possibly different prompt or model configuration on VPS. |
| `ops/health-check.mjs` | **VPS-ONLY** | File exists on VPS at `/opt/agentcrush`. Not present in repo. No local copy. |
| `runtime/copydesk/approval-notifier.mjs` | **ASSUMED ALIGNED** | No divergence evidence found. Verify before treating as clean. |
| `runtime/copydesk/approval-listener.mjs` | **ASSUMED ALIGNED** | No divergence evidence found. Verify before treating as clean. |
| `runtime/copydesk/scheduler-prep.mjs` | **ASSUMED ALIGNED** | No divergence evidence found. Verify before treating as clean. |
| `runtime/copydesk/x-publisher.mjs` | **ASSUMED ALIGNED** | No divergence evidence found. Verify before treating as clean. |
| `runtime/copydesk/canon-enqueuer.mjs` | **ASSUMED ALIGNED** | No divergence evidence found. Verify before treating as clean. |

**Scope for this reconciliation:** The 4 confirmed/suspected divergent files. The 5 assumed-aligned files must be spot-checked during step 0 before being declared out of scope.

---

## 2. Canonicality Decision Framework

For each change block found during VPS inspection, apply this decision tree in order:

### Rule A — Adopt VPS into repo
Apply when ALL of the following are true:
1. The change is behavior-affecting (not just a test marker, debug log, or whitespace diff)
2. The VPS version is currently running in production without incident
3. The repo has no newer version of the same logic (i.e., repo is simply behind)
4. The change does not introduce unsafe scope (e.g., new external API calls, new write targets)

**Examples that meet Rule A:** X API budget cap logic in selector (`x_api_cap_skip`), shadow logging additions to scanner/selector/copydesk, `accounts_scanned` stat in scanner.

### Rule B — Reject VPS change, restore repo version
Apply when ANY of the following is true:
1. The VPS change is a debug artifact with no production purpose (debug console.logs, test markers)
2. The VPS change bypasses a safety gate or removes a constraint
3. The VPS change cannot be read from the VPS because it no longer exists (rolled back silently)
4. The VPS change conflicts with a deliberate repo design decision

**Examples that meet Rule B:** `SELECTOR PR DEBUG` console.log, `COPYDESK PR DEBUG` console.log, `// step-b test marker`, `// selector-hotfix-001 test marker`.

### Rule C — Manual split/review required
Apply when:
1. A VPS block partially overlaps with a repo block (same function, different logic)
2. The purpose of the VPS change is unclear from reading the code alone
3. The change affects the Telegram approval gate, publishing flow, or scheduled_posts writes
4. The change touches budget tracking, daily caps, or cost estimation

**Examples that require Rule C:** Any modification to `insertScheduledRepost`, `markPostProcessed`, approval-gate fields (`approved`, `publish_ready`), daily cap values in `DAILY_CAPS`, or any new action type not present in repo.

### Override — Never adopt without review
Regardless of rules A/B/C, the following require explicit sign-off before adoption:
- Any change to `approved`, `publish_ready`, or `send_at` field handling
- Any new external API call (new endpoint, new service)
- Any change that alters when or whether the Telegram approval gate fires
- Any new `action_type` value not currently in the repo

---

## 3. Reconciliation Order

Ordered from lowest production risk to highest. Each step must be completed and verified before the next begins.

### Step 0 — VPS read and diff (prerequisite, no changes)
**What:** SSH into the VPS. For each of the 4 in-scope files, produce a unified diff between `/opt/agentcrush/<path>` and the repo version.

**For each file:**
```
diff -u runtime/scanner/x-scanner-worker.mjs /opt/agentcrush/scanner/x-scanner-worker.mjs
diff -u runtime/selector/x-selector-worker.mjs /opt/agentcrush/selector/x-selector-worker.mjs
diff -u runtime/copydesk/copydesk-worker.mjs /opt/agentcrush/copydesk/copydesk-worker.mjs
cat /opt/agentcrush/ops/health-check.mjs  # VPS-only, no repo version to diff
```

Also spot-check the 5 assumed-aligned files. If any diff is non-trivial, move that file into scope.

**Output:** Four diff files saved locally. These are the source documents for all subsequent steps.

**Proof required:** Diff files exist. No reconciliation step proceeds without them.

---

### Step 1 — ops/health-check.mjs (VPS-only → repo)
**Risk level: LOW** — this file monitors runtime state; it does not write to production tables or trigger publishing.

**What to do:**
1. Read the VPS version in full.
2. Verify it reads-only (no writes to `scheduled_posts`, `interaction_jobs`, `x_observed_posts`).
3. If read-only: copy verbatim into `ops/health-check.mjs` in repo.
4. If it writes anything: apply Rule C — flag for manual review before copying.
5. Commit to repo.

**Change categories to evaluate:**
- Shadow logging: note if present; adopt per Rule A
- Debug logging: remove per Rule B if no production purpose
- Budget/cap reads: read-only is fine to adopt; writes require Rule C
- Any other behavior: document in commit message

**Proof required:**
- `ops/health-check.mjs` exists in repo with content matching VPS version (minus Rule B removals)
- `git log` shows commit
- Running `node ops/health-check.mjs` locally (with env vars) exits 0 or produces expected output

---

### Step 2 — x-scanner-worker.mjs (repo behind VPS → adopt)
**Risk level: LOW-MEDIUM** — scanner reads from X API and writes to `x_observed_posts` and `events`. It does not write to `scheduled_posts` or trigger publishing.

**What to do:**
1. Apply the Step 0 diff for scanner.
2. For each block in the diff, apply Rule A / B / C.
3. Expected Rule A adoptions: shadow logging block, `accounts_scanned` stat field, any watchlist additions.
4. Expected Rule B removals: any test markers, debug console.logs without production purpose.
5. Write the reconciled version into repo.
6. Commit.
7. Deploy to VPS.

**Change categories to evaluate:**
- **Shadow logging additions:** Adopt per Rule A. This is the known missing block — scanner's one real run produced `accounts_scanned: 10` in the shadow log, which is not in the repo stats object. Adopt whatever adds this.
- **Watchlist / rotation logic:** If VPS has an expanded or rotated `WATCHLIST` array, adopt per Rule A. If the change is a debug test account, reject per Rule B.
- **X API cap logic:** If budget cap check is present in scanner (distinct from selector), apply Rule C — verify it doesn't double-count against the same cap the selector uses.
- **Debug logging:** Remove per Rule B.
- **New write targets:** Any write to a table not currently in repo scanner → Rule C.
- **Search query changes:** Adopt if they are legitimate ecosystem queries; reject test queries per Rule B.

**Proof required:**
- Repo file matches VPS file (minus Rule B removals) — verified by re-running diff after deploy
- VPS scanner systemd service restarts cleanly: `systemctl status agentcrush-scanner`
- Next scheduled scanner run completes and produces a shadow log row in `workflow_events` with role=scanner and status=done
- `accounts_scanned` field present in shadow log output after the run
- No new errors in `journalctl -u agentcrush-scanner`

---

### Step 3 — x-selector-worker.mjs (MIXED → split)
**Risk level: HIGH** — selector decides what content enters the publishing pipeline. Changes here directly affect what Mike posts.

**This file requires manual split. Do not bulk-adopt.**

**What to do:**
1. Apply the Step 0 diff.
2. Work through the diff block by block:

**Block-by-block handling:**

| Expected Block | Rule | Action |
|---|---|---|
| `x_api_cap_skip` budget cap check | Rule A | Adopt — this is live production logic running 7+ times/day |
| Shadow logging additions | Rule A | Adopt |
| `// step-b test marker` (line 947) | Rule B | Remove |
| `// selector-hotfix-001 test marker` (line 949) | Rule B | Remove |
| `console.log("SELECTOR PR DEBUG", ...)` (line 651) | Rule B | Remove |
| Any new action_type values | Rule C | Manual review required |
| Any change to `DAILY_CAPS` values | Rule C | Manual review — document old vs. new values, confirm intentional |
| Any change to `WATCHLIST_PRIORITY` set | Rule A if ecosystem accounts; Rule B if test accounts |
| Any change to `insertScheduledRepost` | Rule C — Telegram gate adjacent |
| Any change to `approved` or `publish_ready` fields | Override — explicit sign-off required |

**What MUST be confirmed before deploy:**
- `x_api_cap_skip` block: confirm the cap threshold value matches the current $1–2/day budget target
- `DAILY_CAPS` values: confirm they match operational intent (current repo: reply=2, quote=3, repost=2, roundup_candidate=6)
- No new `action_types` added without a corresponding handler in downstream workers

**Proof required:**
- Repo file matches VPS file (minus Rule B removals) — verified by re-diff
- `systemctl status agentcrush-selector` healthy after deploy
- Next selector run produces a shadow log row with role=selector, status=done
- If budget is capped: shadow log shows `x_api_cap_skip` with `estimated_usd` field — confirms cap logic still present
- If budget is not capped: shadow log shows a decision output (candidate evaluated) — confirms normal path works
- `SELECTOR PR DEBUG` log line is ABSENT from `journalctl` output
- `selector-hotfix-001` and `step-b` strings are ABSENT from the repo file

---

### Step 4 — copydesk-worker.mjs (repo behind VPS → adopt)
**Risk level: HIGH** — copydesk generates post content and writes to `copydesk_outputs` which feeds the publishing pipeline.

**What to do:**
1. Apply the Step 0 diff.
2. For each block, apply Rule A / B / C.

**Change categories to evaluate:**

| Category | Expected finding | Rule |
|---|---|---|
| Shadow logging additions | Present on VPS, missing from repo | Rule A — adopt |
| `COPYDESK PR DEBUG` console.log (line 777) | Debug artifact | Rule B — remove |
| `COPYDESK FINAL OUTPUT DEBUG` console.log (line 778) | Debug artifact | Rule B — remove |
| `model_cost_usd` write to `copydesk_outputs` | If VPS adds this: adopt (Phase 9 found column exists but null) | Rule A |
| Model name (`OPENAI_MODEL`) | Confirm VPS default matches repo (`gpt-4.1-mini`) | Rule C if different |
| Prompt changes (Mike voice, banned patterns, style guides) | Adopt if VPS prompt is more refined | Rule A if no scope change |
| Synthesis / model split logic | If VPS routes different job_types to different models: Rule C | Manual review |
| Briefing / context injection | If VPS injects additional context fields (briefing, watchlist state): Rule C |
| Dedup logic (Jaccard threshold, recent post window) | Adopt if threshold changed | Rule A — document old vs. new value |
| New job_type handlers | Rule C if new type not in repo |
| Any change touching `approved`, `publish_ready`, `run_at` | Override — explicit sign-off |

**What MUST be confirmed before deploy:**
- Shadow logging block does not alter the return value or error behavior of the main processing loop
- `model_cost_usd` write (if present) matches the `copydesk_outputs` column name exactly (Phase 9 found null — confirm column name is not `model_cost` or similar)
- No new job_type added without a corresponding prompt builder and schema

**Proof required:**
- Repo file matches VPS file (minus Rule B removals) — verified by re-diff
- `systemctl status agentcrush-copydesk` healthy after deploy
- Next copydesk run produces a shadow log row with role=copydesk, status=done
- If jobs are queued: a `copydesk_outputs` row is written with non-null `x_text`
- If no jobs: shadow log shows `no_jobs` skip — confirms skip path still intact
- `COPYDESK PR DEBUG` and `COPYDESK FINAL OUTPUT DEBUG` are ABSENT from `journalctl` output
- If `model_cost_usd` was added: `copydesk_outputs.model_cost_usd` is non-null on the next completed job

---

## 4. Rollback Rule

**If any deployed file breaks runtime behavior:**

1. **Immediate:** `systemctl stop agentcrush-<worker>` on VPS
2. **Restore:** Copy the pre-reconciliation VPS version back to `/opt/agentcrush/<path>` from the backup taken in Step 0 (the VPS copy IS the backup — do not overwrite it until the reconciled version is confirmed stable for at least one full scheduled run)
3. **Restart:** `systemctl start agentcrush-<worker>`
4. **Verify:** Confirm next run completes and shadow log row is written with status=done
5. **Document:** Create a `docs/reports/phase10_rollback_<worker>.md` noting exactly which block caused the failure

**Holding period rule:** After each Step 1–4 deploy, wait for at least **2 consecutive successful scheduled runs** before proceeding to the next step. For scanner (runs every ~30 min) this means 1 hour minimum. For selector and copydesk (run every ~5–30 min) this means 10–60 minutes minimum.

**Do NOT proceed to the next file if the previous file's systemd status shows any failures.**

---

## 5. Completion Condition

Repo is source of truth for Mike/runtime when ALL of the following are true:

| Condition | How to verify |
|---|---|
| `diff` between repo and VPS is empty for all 4 in-scope files | Re-run Step 0 diffs post-reconciliation; all diffs show no output |
| `ops/health-check.mjs` exists in repo | `ls ops/health-check.mjs` |
| All Rule B artifacts removed from repo and VPS | grep for `SELECTOR PR DEBUG`, `COPYDESK PR DEBUG`, `step-b test marker`, `selector-hotfix-001 test marker` returns nothing in both repo and VPS files |
| Shadow logging present and confirmed in all 3 workers | `workflow_events` has rows with role=scanner, role=selector, role=copydesk written after the reconciliation deploys |
| No runtime errors in 24 hours post-reconciliation | `journalctl -u agentcrush-scanner -u agentcrush-selector -u agentcrush-copydesk` shows no fatal errors for 24h window |
| Telegram approval gate still fires | Confirm `approval-notifier.mjs` and `approval-listener.mjs` are unchanged and `scheduled_posts` `publish_ready` gate is intact |
| Budget cap still enforced | Selector shadow log continues to show `x_api_cap_skip` with `estimated_usd` when daily limit is reached |
| Repo commit history shows reconciliation commits | `git log runtime/ ops/` shows one commit per file with reconciliation message |

**The completion state is NOT:**
- "VPS and repo look similar" — diffs must be empty
- "No new incidents" — positive confirmation of continued operation is required
- A one-time check — the 24-hour window is a minimum, not a snapshot

---

## Appendix: Known Divergence Evidence (Phase 9)

| Evidence | Source | Implication for reconciliation |
|---|---|---|
| Scanner shadow log `accounts_scanned: 10` field not in repo stats | phase9_mike_shadow_validation.md | VPS scanner has different stats object; reconcile in Step 2 |
| Selector: all 7 shadow rows are `x_api_cap_skip`; no cap logic in repo | phase9_mike_shadow_validation.md | VPS selector has budget cap block; adopt in Step 3 |
| Copydesk: 31 shadow rows logged; no shadow logging code in repo copydesk | phase9_mike_shadow_validation.md | Shadow logging block present on VPS only; adopt in Step 4 |
| `model_cost_usd` column exists, returns null | phase9_cost_governance_validation.md | VPS copydesk either doesn't write it or writes wrong field name; investigate in Step 4 |
| `// step-b test marker` at line 947, `// selector-hotfix-001 test marker` at line 949 | repo x-selector-worker.mjs direct read | VPS hotfix artifacts in repo; remove per Rule B |
| `SELECTOR PR DEBUG` console.log at line 651 | repo x-selector-worker.mjs direct read | Debug artifact; remove per Rule B |
| `COPYDESK PR DEBUG` at line 777, `COPYDESK FINAL OUTPUT DEBUG` at line 778 | repo copydesk-worker.mjs direct read | Debug artifacts; remove per Rule B |
| `ops/health-check.mjs` not in repo | file system check | VPS-only file; copy in Step 1 |
