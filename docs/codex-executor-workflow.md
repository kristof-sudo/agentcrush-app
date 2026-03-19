# AgentCrush Codex ↔ Executor Workflow

Purpose: make runtime-safe implementation and validation persistent so new chats do not need to re-explain how repo work, runtime checks, and bounded operations should be handled.

## Operating model

- ChatGPT = strategy / diagnosis / sequencing
- Codex = repo implementation lane
- Executor = bounded runtime inspection + bounded operational actions
- Kristof = approvals, priorities, budget, acceptance

## Repo-first rule

- Normal changes are authored in the repo first.
- Avoid direct VPS code edits except emergency fixes.
- Prefer narrow diffs.
- Show exact changed files.
- Runtime changes should be reflected back into repo state immediately.

## Executor rule

Use executor for:
- file reads
- grep/search
- service status
- timer status
- health checks
- deploy wrapper
- bounded Supabase read actions
- bounded Supabase write actions that are explicitly allowlisted

Do not use executor for:
- arbitrary destructive shell actions
- broad DB mutation
- schema edits outside migrations
- uncontrolled restarts
- anything that increases X spend without explicit approval

## Supabase rule

Read lane:
- tools/agentcrush-supabase.py

Write lane:
- only explicit allowlisted actions
- currently:
  - cancel_stale_queued_posts
  - reschedule_post_by_id

Schema changes:
- migration-first, versioned in repo

## Deploy rule

Canonical path:
1. review diff
2. validate build
3. run deploy wrapper
4. run smoke checks
5. review health output
6. then confirm complete

Primary wrapper:
- ops/deploy-and-smoke.sh

## Founder burden rule

Prefer work that reduces:
- manual log relay
- manual DB inspection
- manual DB routine fixes
- manual deploy stitching
- repeated explanation of runtime structure

Map work to one of:
- Mike change test
- UI change test
- ingestion/ops change test

## Scope discipline

- Fix the stated problem with the smallest durable change.
- Do not silently expand scope.
- Do not replace working architecture unless necessary.
- Stabilize first, optimize second.
