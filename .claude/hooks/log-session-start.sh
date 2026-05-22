#!/usr/bin/env bash
# SessionStart hook: scaffold a Log.md entry stub so Claude has a place to write during the session.
# Idempotent: if a stub already exists for this session (same minute), don't add another.
set -euo pipefail

BRAIN=/Users/pk/projects/agentcrush-brain
LOG="$BRAIN/Log.md"
[ -d "$BRAIN" ] || exit 0
[ -f "$LOG" ] || exit 0

cd "$BRAIN"
git pull --rebase origin main >/dev/null 2>&1 || true

TS=$(date -u +"%Y-%m-%d %H:%M")
HEADER="## $TS — Claude Code"

# Skip if we already added this exact header in the last 5 minutes' worth of entries
if tail -50 "$LOG" | grep -qF "$HEADER"; then
  exit 0
fi

# Stub — Claude fills in during session. SessionEnd commits whatever is there.
cat >> "$LOG" <<EOF

$HEADER

**Did:**
- _(session in progress — fill before close)_

**Decided:**
-

**Open:**
-

**Hand-off:**
-

EOF

echo "[$(date -u +%FT%TZ)] SessionStart: stubbed Log.md entry for $TS"
