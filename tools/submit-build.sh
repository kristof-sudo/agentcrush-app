#!/usr/bin/env bash
set -euo pipefail

RAW_TASK="${1:-}"

json_error() {
  python3 - "$1" <<'PY'
import json, sys
print(json.dumps({
  "ok": False,
  "changed_files": [],
  "diff_summary": "",
  "commit": "",
  "pr_number": None,
  "pr_url": "",
  "error": sys.argv[1]
}))
PY
}

if [ -z "$RAW_TASK" ]; then
  json_error "missing task"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  json_error "codex cli not installed"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  json_error "git not installed"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  json_error "curl not installed"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  json_error "working tree not clean"
  exit 1
fi

TASK="$RAW_TASK"
TASK="${TASK#SUBMIT_BUILD }"
TASK="${TASK%\"}"
TASK="${TASK#\"}"

BASE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BRANCH="codex/$(date +%Y%m%d-%H%M%S)"

git checkout -b "$BRANCH" >/dev/null 2>&1

cleanup_no_changes() {
  git checkout "$BASE_BRANCH" >/dev/null 2>&1 || true
  git branch -D "$BRANCH" >/dev/null 2>&1 || true
}

codex exec --sandbox workspace-write "$TASK"

if git diff --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  cleanup_no_changes
  json_error "no changes produced"
  exit 1
fi

git add -N . >/dev/null 2>&1 || true

CHANGED_FILES_JSON="$(
  git diff --name-only --cached -- . 2>/dev/null | python3 -c 'import sys,json; print(json.dumps([x.strip() for x in sys.stdin if x.strip()]))'
)"

if [ "$CHANGED_FILES_JSON" = "[]" ]; then
  CHANGED_FILES_JSON="$(
    git diff --name-only -- . | python3 -c 'import sys,json; print(json.dumps([x.strip() for x in sys.stdin if x.strip()]))'
  )"
fi

DIFF_SUMMARY="$(git diff --stat --cached -- . 2>/dev/null | tr '\n' '; ')"

if [ -z "$DIFF_SUMMARY" ]; then
  DIFF_SUMMARY="$(git diff --stat -- . | tr '\n' '; ')"
fi

git add -A
git commit -m "codex: ${TASK:0:120}" >/dev/null 2>&1 || {
  json_error "commit failed"
  exit 1
}

COMMIT_SHA="$(git rev-parse HEAD)"

git push -u origin "$BRANCH" >/dev/null 2>&1 || {
  json_error "push failed"
  exit 1
}

REMOTE_URL="$(git remote get-url origin)"
REPO_SLUG="$(printf '%s' "$REMOTE_URL" | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
CODEX_SUMMARY="$(printf '%s' "$TASK" | cut -c1-160)"

PR_URL=""
PR_NUMBER="None"

APPROVAL_API_BASE="${APPROVAL_API_BASE:-http://localhost:3000}"

APPROVAL_PAYLOAD="$(RAW_TASK="$RAW_TASK" CODEX_SUMMARY="$CODEX_SUMMARY" DIFF_SUMMARY="$DIFF_SUMMARY" python3 - <<PY
import json
import os

print(json.dumps({
  "repo": "$REPO_SLUG",
  "branch": "$BRANCH",
  "commit_sha": "$COMMIT_SHA",
  "pr_number": None if "$PR_NUMBER" == "None" else int("$PR_NUMBER"),
  "request_text": os.environ["RAW_TASK"].replace("\n", " "),
  "codex_summary": os.environ["CODEX_SUMMARY"].replace("\n", " "),
  "diff_summary": os.environ["DIFF_SUMMARY"].replace("\n", " ")
}))
PY
)"

APPROVAL_RESPONSE="$(curl -sS -X POST \
  "$APPROVAL_API_BASE/api/build-approvals/create" \
  -H "Content-Type: application/json" \
  -d "$APPROVAL_PAYLOAD" || true)"

if [ -z "$APPROVAL_RESPONSE" ]; then
  json_error "approval create failed"
  exit 1
fi

python3 - <<PY
import json
changed_files = $CHANGED_FILES_JSON
print(json.dumps({
  "ok": True,
  "changed_files": changed_files,
  "diff_summary": """$DIFF_SUMMARY""",
  "commit": "$COMMIT_SHA",
  "pr_number": None if "$PR_NUMBER" == "None" else int("$PR_NUMBER"),
  "pr_url": "$PR_URL",
  "error": ""
}))
PY
