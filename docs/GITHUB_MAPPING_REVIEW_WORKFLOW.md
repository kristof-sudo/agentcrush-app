# GitHub Mapping Review Workflow

**Created:** May 2, 2026
**Owner:** Kris
**Status:** Ready — migration + scripts created; table not yet applied to Supabase

---

## Why this exists

AgentCrush's evidence ranking is gated on `agents.github_full_name`. Only agents with a GitHub anchor can accumulate GitHub, docs-quality, dependency-graph, and package signals. Currently only ~65 of ~1,245 indexed agents have this field set.

The VPS website evidence probe discovered **376 high-confidence + 65 medium-confidence GitHub repo candidates** by scraping agent website URLs and matching them to GitHub repos. Auto-applying these matches would risk data quality regressions. This workflow provides a guarded human-review path before any mapping is written to production.

---

## Evidence probe result summary

| Metric | Count |
|---|---|
| Agents probed (had website_url, no github_full_name) | 635 |
| Reachable websites | 578 |
| High-confidence GitHub candidates found | 376 |
| Medium-confidence GitHub candidates found | 65 |
| Estimated new GitHub anchors after review | ~408 |
| Current agents with github_full_name | ~65 |
| Projected coverage after apply | ~473 |

This is the primary path to grow evidence coverage beyond the current GitHub-limited ceiling. Growing from ~65 to ~473 anchored agents would unlock full evidence signal collection for ~408 additional agents and substantially expand the evidence-ranked tier over subsequent Sunday promotion cycles.

---

## Migration

**File:** `supabase/migrations/20260502_1000_create_agent_github_mapping_candidates.sql`

Table: `agent_github_mapping_candidates`

Apply via Supabase SQL editor. Log in `migrations/MIGRATION_LOG.md`.

**Never auto-apply VPS probe output directly to `agents.github_full_name`.**
All writes go through this table and require human approval.

---

## Import flow

1. VPS probe generates a JSON file of candidates (run separately on VPS).
2. Copy/transfer the JSON file to the Mac repo directory.
3. Preview candidates without writing:
   ```
   node scripts/import-github-mapping-candidates.mjs \
     --file probe-output.json \
     --min-confidence high
   ```
4. When satisfied, import to the review table:
   ```
   node scripts/import-github-mapping-candidates.mjs \
     --file probe-output.json \
     --min-confidence high \
     --write
   ```
5. Optionally import medium-confidence candidates separately:
   ```
   node scripts/import-github-mapping-candidates.mjs \
     --file probe-output.json \
     --min-confidence medium \
     --write
   ```

The import script:
- Preserves `review_status`, `reviewed_by`, `reviewed_at`, `review_notes`, `applied_at` on already-reviewed rows
- Only updates probe metadata (confidence, signals, website_url, probe_run_date) on existing reviewed rows
- Skips rows with missing agent_id or invalid owner/repo format
- Accepts probe output as a root array or an object with `candidates` / `githubCandidates` / `results` key

---

## Review flow

1. List pending high-confidence candidates:
   ```
   node scripts/list-github-mapping-candidates.mjs \
     --status pending \
     --min-confidence high \
     --limit 50
   ```
2. For each candidate, verify the repo is the correct one for the agent.
3. Update `review_status` directly in the Supabase dashboard (or via SQL):
   ```sql
   update agent_github_mapping_candidates
   set review_status = 'approved',
       reviewed_by   = 'kris',
       reviewed_at   = now(),
       review_notes  = 'confirmed via website link'
   where id = '<uuid>';
   ```
   Or to reject:
   ```sql
   update agent_github_mapping_candidates
   set review_status = 'rejected',
       reviewed_by   = 'kris',
       reviewed_at   = now(),
       review_notes  = 'wrong repo, agent uses different codebase'
   where id = '<uuid>';
   ```

**Valid review_status values:** `pending` → `approved` / `rejected` / `needs_more_info` / `superseded` / `applied`

---

## Apply flow

1. Dry-run first — see what would be applied:
   ```
   node scripts/apply-approved-github-mappings.mjs --limit 25
   ```
2. Apply approved mappings:
   ```
   node scripts/apply-approved-github-mappings.mjs --limit 25 --write
   ```

The apply script:
- Only processes rows with `review_status='approved'` and `applied_at IS NULL`
- Never overwrites an existing `agents.github_full_name` — skips and marks candidate `superseded` instead
- After a successful write: sets `review_status='applied'`, `applied_at=now()`
- No tier promotion, no scoring changes, no GitHub scans triggered

Work in batches of 25–50 per session. Review the output before increasing batch size.

---

## Pipeline after approved mappings are applied

Once `agents.github_full_name` is set for newly anchored agents, run the existing evidence pipeline in order:

1. **GitHub snapshot worker** — collect commits, stars, forks, releases for new anchors
2. **docs-quality worker** — score documentation quality for newly anchored agents
3. **package-discovery worker** — detect npm/PyPI packages linked to the GitHub repo
4. **package-download worker** — collect download trends for discovered packages
5. **tier-promotion dry-run** — verify new agents meet evidence thresholds before promoting

Run tier-promotion as a dry-run first. Only promote after confirming evidence signals are populated and plausible.

---

## Warnings

- **Never auto-apply candidates from the VPS probe.** The probe may produce false positives, especially for agents with common names or shared infrastructure repos.
- **Never overwrite an existing `github_full_name`** — the apply script enforces this, but do not bypass it manually.
- **Do not let a large apply batch trigger a tier-promotion run immediately.** Let the GitHub snapshot worker collect data first (1+ Sunday cycle).
- **Medium-confidence candidates require extra scrutiny** before approval.

---

## File map

| File | Purpose |
|---|---|
| `supabase/migrations/20260502_1000_create_agent_github_mapping_candidates.sql` | Create the review table |
| `scripts/import-github-mapping-candidates.mjs` | Import probe output JSON into review table |
| `scripts/list-github-mapping-candidates.mjs` | List candidates for human review |
| `scripts/apply-approved-github-mappings.mjs` | Apply approved mappings to agents.github_full_name |
