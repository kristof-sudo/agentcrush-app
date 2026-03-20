#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${AGENTCRUSH_DEPLOY_CONFIG:-$ROOT_DIR/ops/deploy/prod.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

: "${AGENTCRUSH_PROD_HOST:?Missing AGENTCRUSH_PROD_HOST. Configure ops/deploy/prod.env from the example file.}"

REMOTE_USER="${AGENTCRUSH_PROD_USER:-root}"
REMOTE_EXEC="${AGENTCRUSH_REMOTE_EXEC:-/root/agentcrush-app/tools/agentcrush-exec.py}"

echo "Post-check target: ${REMOTE_USER}@${AGENTCRUSH_PROD_HOST}"
echo "Bounded executor: ${REMOTE_EXEC} health-request.json"

ssh \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=accept-new \
  "${REMOTE_USER}@${AGENTCRUSH_PROD_HOST}" \
  /bin/sh -s -- "$REMOTE_EXEC" <<'EOF'
set -eu

remote_exec="$1"
request_file="$(mktemp /tmp/health-request.XXXXXX.json)"

cleanup() {
  rm -f "$request_file"
}

trap cleanup EXIT

cat >"$request_file" <<'JSON'
{
  "actions": [
    { "action": "health" }
  ]
}
JSON

python3 "$remote_exec" "$request_file"
EOF
