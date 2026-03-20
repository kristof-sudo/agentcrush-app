#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VALIDATE_SCRIPT="$ROOT_DIR/ops/validate/runtime-sanity.sh"
DEPLOY_SCRIPT="$ROOT_DIR/deploy/deploy-prod.sh"
POST_CHECK_SCRIPT="$ROOT_DIR/ops/health-check.sh"

APPROVE_DEPLOY=0
SHOW_DIFF=0

usage() {
  cat <<'EOF'
Usage: ./ops/deploy-and-smoke.sh [--show-diff] [--approve-deploy]

Canonical path:
  review diff -> validate -> founder approval gate -> deploy -> post-check
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --approve-deploy)
      APPROVE_DEPLOY=1
      shift
      ;;
    --show-diff)
      SHOW_DIFF=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

for required in "$VALIDATE_SCRIPT" "$DEPLOY_SCRIPT" "$POST_CHECK_SCRIPT"; do
  if [[ ! -f "$required" ]]; then
    echo "Missing required script: $required" >&2
    exit 1
  fi
done

cd "$ROOT_DIR"

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  DIFF_BASE="HEAD"
else
  DIFF_BASE="$(git hash-object -t tree /dev/null)"
fi

echo "== Review: git status =="
git status --short
echo

echo "== Review: diff stat (working tree) =="
git diff --stat
echo

echo "== Review: diff stat (staged) =="
git diff --cached --stat "$DIFF_BASE"
echo

if [[ "$SHOW_DIFF" -eq 1 ]]; then
  echo "== Review: working tree diff =="
  git diff
  echo
  echo "== Review: staged diff =="
  git diff --cached "$DIFF_BASE"
  echo
fi

echo "== Validate =="
"$VALIDATE_SCRIPT"
echo

if [[ "$APPROVE_DEPLOY" -ne 1 ]]; then
  echo "Validation passed. Founder approval gate is still closed."
  echo "Rerun with --approve-deploy to continue into deploy and post-check."
  exit 0
fi

echo "== Deploy =="
"$DEPLOY_SCRIPT"
echo

echo "== Post-check =="
"$POST_CHECK_SCRIPT"
