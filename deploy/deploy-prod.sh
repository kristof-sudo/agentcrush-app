#!/usr/bin/env bash
set -e

echo "=== AgentCrush Deploy ==="

APP_DIR="/root/agentcrush-app"

cd "$APP_DIR"

echo "[1] Pull latest code"
git pull origin main

echo "[2] Install website dependencies (if needed)"
npm install --omit=dev

echo "[3] Sync runtime from repo to VPS"
 /usr/local/bin/agentcrush-sync-runtime

echo "[4] Restart workers"
sudo systemctl restart x-scanner.timer || true
sudo systemctl restart x-selector.timer || true
sudo systemctl restart copydesk.timer || true
sudo systemctl restart scheduler-prep.timer || true
sudo systemctl restart approval-notifier.timer || true
sudo systemctl restart approval-listener.timer || true
sudo systemctl restart x-publisher.timer || true
sudo systemctl restart canon-enqueuer.timer || true
sudo systemctl restart canonkeeper.timer || true

echo "[5] Short health check"
sleep 2
./ops/health-check.sh

echo "=== Deploy Complete ==="
