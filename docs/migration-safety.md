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

## CI

`.github/workflows/ci.yml`:
- every PR + push to main: production build + view contracts
- nightly 05:00 UTC: view contracts against live prod (catches SQL-editor
  applies with no accompanying commit)

The anon key used is publishable by design (it ships in every browser
bundle); CI prefers the `SUPABASE_ANON_KEY` repo variable/secret if set.
