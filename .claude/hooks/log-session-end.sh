#!/usr/bin/env bash
# SessionEnd hook: commit + push brain. Brain-only (never touches agentcrush-app).
# If the SessionStart stub was never filled in, leave it — better to have an empty entry
# than to lose track of when sessions ran.
set -euo pipefail

BRAIN=/Users/pk/projects/agentcrush-brain
[ -d "$BRAIN" ] || exit 0

cd "$BRAIN"

git add -A
if git diff --cached --quiet; then
  echo "[$(date -u +%FT%TZ)] SessionEnd: nothing to commit"
  exit 0
fi

git commit -m "session: auto-commit on session end" --no-verify
git push origin main
echo "[$(date -u +%FT%TZ)] SessionEnd: pushed"
