# Migration safety — the view-guard rules (B21)

Why this exists: on 2026-06-08, migration `20260608_0920` replaced
`agent_score_model_family_v1` with a simpler version missing columns the
rankings page selected. `/rankings/model-families` was broken in production
until an urgent restoration migration. That incident class is now guarded.

## The rules

1. **Consumers define the contract.** The columns a view must return are
   whatever `src/app` selects from it. `tests/view-contracts.mjs` encodes
   those contracts — derived from real consumer queries, not from the SQL.

2. **Never `DROP VIEW` (or `CREATE OR REPLACE` with fewer columns) without
   re-creating the full consumer contract in the same migration file.** If
   you must rename or restructure, ship the new view AND keep the old name as
   a compatibility view in the same file.

3. **Changing a view? Same PR must update:** the migration, every consumer in
   `src/app`, and the contract in `tests/view-contracts.mjs`. CI fails the PR
   otherwise.

4. **After applying any migration in the Supabase SQL editor, run the
   contracts** — locally (`node tests/view-contracts.mjs`) or wait for the
   nightly CI run (05:00 UTC), which exists precisely because migrations are
   applied outside the deploy pipeline.

5. **Scoring weights never change as a side-effect.** Per Memory rules, any
   change to scoring inputs/weights is an explicit operator (Kris) decision —
   a migration that alters them needs that decision referenced in its header.

## View → consumer map

| View | Page / API route |
|---|---|
| `agent_score_v2_top50_public_candidate` | `/rankings`, `/rankings/developer-agents` |
| `agent_score_model_family_v1` | `/rankings/model-families` |
| `agent_score_tokenized_v1` | `/rankings/tokenized-agents` |
| `agent_score_service_v1` | `/rankings/service-agents` |
| `agent_score_mcp_server_v1` | `/rankings/mcp-servers` |
| `ghost_index_daily`, `ghost_index_live` | `/ghost-index`, `/api/ghost-index/v1` |
| `changes_today_v1` | `/changes`, `/api/changes/v1`, `/changes.xml` |
| `agent_protocol_compatibility_v1` | `/api/pcs/v1` |

When adding a new view consumed by a page, add it to `tests/view-contracts.mjs` in
the same PR as the page. Mark it `optional: true` until the migration is confirmed
applied, then remove the flag in a follow-up.

## CI

`docs/ci/ci.yml` → move to `.github/workflows/ci.yml` to activate (Kris action — see PR #[B21]):
- every PR + push to main: lint + production build + view contracts
- nightly 05:00 UTC: view contracts against live prod (catches SQL-editor
  applies with no accompanying commit)

**Required secret:** add `SUPABASE_ANON_KEY` at
`Settings → Secrets and variables → Actions → New repository secret`.
Value: the `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`. It is the
public anon key — publishable by design, safe to store as a repo secret.
Until configured, CI warns and skips the view-contract step rather than
blocking PRs.

## When a contract fails

1. Read the failure: it names the view and the missing columns.
2. Check `migrations/MIGRATION_LOG.md` for recent migrations touching that view.
3. If a migration broke it: revert or issue a restore migration, then update the
   consumer page and the contract in one PR.
4. Never mark a failing contract `optional: true` to silence CI — that defeats
   the guard. `optional` is only valid for views whose migration is genuinely
   pending apply.
