#!/bin/bash
# Brain auto-sync — Phase R-1.3
#
# Runs every 15 minutes on the VPS. Pulls origin/main, commits any new files
# the Layer 2 workers wrote (Ajsa briefs, build-suggestions, competitor reports,
# weekly digest audit copies, etc.), pushes back. Closes the "VPS writes, never
# pushes" gap that hid 14 Ajsa briefs in late May.
#
# Append-only logs (Agents/ajsa/posted-log.md, Agents/ajsa/incidents.md) get
# auto-concatenated on conflict via merge=union in .gitattributes, plus a
# defense-in-depth fallback below for cases the merge driver can't resolve.
#
# Logs to /var/log/agentcrush/brain-sync.log. Exits 0 even when nothing to do.

set -e
BRAIN="/opt/agentcrush-brain"
cd "$BRAIN"

# Files that are safe to auto-resolve via concatenation (append-only from both sides).
APPEND_ONLY_FILES=(
  "Agents/ajsa/posted-log.md"
  "Agents/ajsa/incidents.md"
)

# Resolve a conflicted append-only file by keeping content from both sides
# and stripping conflict markers.
resolve_append_only() {
  local f="$1"
  python3 - "$f" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
s = p.read_text()
pattern = re.compile(r'^<{7}.*?\n(.*?)^={7}\n(.*?)^>{7}.*?\n', re.DOTALL | re.MULTILINE)
s2 = pattern.sub(lambda m: m.group(1) + m.group(2), s)
p.write_text(s2)
PY
}

# Returns 0 if every conflicted file is in APPEND_ONLY_FILES.
conflicts_are_safe() {
  local conflicted="$1"
  [ -z "$conflicted" ] && return 1
  for f in $conflicted; do
    local ok=0
    for safe in "${APPEND_ONLY_FILES[@]}"; do
      [ "$f" = "$safe" ] && ok=1 && break
    done
    [ $ok -eq 0 ] && return 1
  done
  return 0
}

# Stash any unstaged + untracked changes so the pull is clean.
HAVE_LOCAL=$(git status --porcelain | head -1)
if [ -n "$HAVE_LOCAL" ]; then
  git stash push --include-untracked --quiet -m "brain-sync-autostash-$(date -u +%s)" >/dev/null 2>&1 || true
fi

# Pull origin/main, rebase.
if ! git pull --rebase --quiet origin main; then
  CONFLICTED=$(git diff --name-only --diff-filter=U)
  if conflicts_are_safe "$CONFLICTED"; then
    echo "[brain-sync] $(date -u +%FT%TZ) auto-resolving append-only rebase conflicts: $CONFLICTED"
    for f in $CONFLICTED; do
      resolve_append_only "$f"
      git add "$f"
    done
    if ! git -c user.email="vps@agentcrush.xyz" -c user.name="AgentCrush VPS" \
           rebase --continue --quiet; then
      echo "[brain-sync] $(date -u +%FT%TZ) rebase --continue FAILED after auto-resolve" >&2
      git rebase --abort 2>/dev/null || true
      git stash pop --quiet 2>/dev/null || true
      exit 1
    fi
  else
    echo "[brain-sync] $(date -u +%FT%TZ) pull/rebase FAILED — non-safe conflicts: $CONFLICTED" >&2
    git rebase --abort 2>/dev/null || true
    git stash pop --quiet 2>/dev/null || true
    exit 1
  fi
fi

# Pop the stash back. If pop conflicts on append-only files, auto-resolve.
if [ -n "$HAVE_LOCAL" ]; then
  if ! git stash pop --quiet 2>/dev/null; then
    CONFLICTED=$(git diff --name-only --diff-filter=U)
    if conflicts_are_safe "$CONFLICTED"; then
      echo "[brain-sync] $(date -u +%FT%TZ) auto-resolving append-only stash-pop conflicts: $CONFLICTED"
      for f in $CONFLICTED; do
        resolve_append_only "$f"
        git add "$f"
      done
      git stash drop --quiet 2>/dev/null || true
    else
      echo "[brain-sync] $(date -u +%FT%TZ) stash pop FAILED — non-safe conflicts: $CONFLICTED" >&2
      exit 1
    fi
  fi
fi

# Stage everything
git add -A

# Anything to commit?
if git diff --cached --quiet; then
  exit 0
fi

CHANGED=$(git diff --cached --name-only | awk -F/ '{print $1}' | sort -u | head -5 | tr '\n' ' ')
N=$(git diff --cached --name-only | wc -l)
MSG="auto-sync: $N file(s) — $CHANGED"

git -c user.email="vps@agentcrush.xyz" -c user.name="AgentCrush VPS" \
    commit -m "$MSG" --quiet

# Push with retry — another writer (main Claude session, cloud routines) may
# push between our rebase and our push; a non-fast-forward needs a re-rebase,
# not a failed unit (this raced 2x on 2026-07-02 alone).
for i in 1 2 3; do
  if git push --quiet origin main; then
    echo "[brain-sync] $(date -u +%FT%TZ) pushed: $MSG"
    exit 0
  fi
  echo "[brain-sync] $(date -u +%FT%TZ) push rejected (attempt $i) — re-rebasing"
  if ! git pull --rebase --quiet origin main; then
    echo "[brain-sync] $(date -u +%FT%TZ) rebase during push-retry FAILED" >&2
    exit 1
  fi
done
echo "[brain-sync] $(date -u +%FT%TZ) push FAILED after 3 attempts" >&2
exit 1
