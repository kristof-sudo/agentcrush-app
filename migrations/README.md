# AgentCrush Migrations

## Rule

From this point forward, every Supabase schema change must be written here first as a versioned `.sql` file.

No normal production DB edits should be treated as "real" unless the SQL is also saved in this folder and committed to GitHub.

## Naming format

Use:

YYYYMMDD_HHMM_description.sql

Example:

20260318_1535_add_roundup_candidate_constraint.sql

## Process

1. Identify required DB change
2. Create a migration file in this folder
3. Paste the exact SQL
4. Commit to GitHub
5. Apply to Supabase
6. Mark result in `migrations/MIGRATION_LOG.md`

## Scope

This includes:
- new columns
- constraints
- indexes
- views
- functions
- worker-related schema updates
- queue logic changes

## Emergency rule

If a direct production DB edit is ever required urgently, the matching SQL migration must still be written and committed immediately afterward.

