#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_BIN="${NODE_BIN:-}"

if ! command -v rg >/dev/null 2>&1; then
  echo "Missing required command: rg" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Checking git diff for conflict markers and whitespace issues..."
git diff --check
git diff --cached --check

echo "Scanning for unresolved merge markers..."
if rg -n '^(<<<<<<<|=======|>>>>>>>)' AGENTS.md runtime deploy ops >/dev/null 2>&1; then
  echo "Found unresolved merge markers." >&2
  exit 1
fi

echo "Syntax-checking shell wrappers..."
bash -n deploy/deploy-prod.sh
bash -n ops/deploy-and-smoke.sh
bash -n ops/health-check.sh
bash -n ops/validate/runtime-sanity.sh

if [[ -z "$NODE_BIN" ]]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="node"
  elif command -v nodejs >/dev/null 2>&1; then
    NODE_BIN="nodejs"
  else
    echo "Missing required command: node (or set NODE_BIN to a compatible executable)." >&2
    exit 1
  fi
fi

echo "Syntax-checking runtime .mjs files..."
while IFS= read -r file; do
  "$NODE_BIN" --check "$file"
done < <(find runtime -type f -name '*.mjs' | sort)

echo "Syntax-checking ops .mjs files..."
while IFS= read -r file; do
  "$NODE_BIN" --check "$file"
done < <(find ops -type f -name '*.mjs' | sort)

echo "Validation OK."
