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

echo "Deploy target: ${REMOTE_USER}@${AGENTCRUSH_PROD_HOST}"

ssh \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=accept-new \
  "${REMOTE_USER}@${AGENTCRUSH_PROD_HOST}" \
  /bin/sh <<'EOF'
set -eu

echo "=== AgentCrush Deploy ==="

cd /root/agentcrush-app

echo "[1] Pull latest code"
git pull origin main

echo "[2] Install dependencies"
npm install

echo "[3] Restart services"
systemctl restart x-scanner.timer || true
systemctl restart x-selector.timer || true
systemctl restart copydesk.timer || true
systemctl restart scheduler-prep.timer || true
systemctl restart approval-notifier.timer || true
systemctl restart approval-listener.timer || true
systemctl restart x-publisher.timer || true
systemctl restart canon-enqueuer.timer || true
systemctl restart canonkeeper.timer || true

echo "[4] Health check"
sleep 2
systemctl list-timers --all | egrep 'x-scanner|x-selector|copydesk|canon-enqueuer|scheduler-prep|approval-notifier|approval-listener|x-publisher|canonkeeper' || true
for svc in \
  x-scanner.service \
  x-selector.service \
  copydesk.service \
  canon-enqueuer.service \
  scheduler-prep.service \
  approval-notifier.service \
  approval-listener.service \
  x-publisher.service \
  canonkeeper.service
do
  printf "%-28s" "$svc"
  systemctl is-enabled "$svc" 2>/dev/null | tr '\n' ' '
  echo -n " / "
  systemctl is-active "$svc" 2>/dev/null || true
done

echo "=== Deploy Complete ==="
EOF
