#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/agentcrush-app"
LOG_DIR="$APP_DIR/ops/logs"
STAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
DAY_FILE="$LOG_DIR/daily-summary-$(date -u '+%Y-%m-%d').log"

mkdir -p "$LOG_DIR"

{
  echo "========================================"
  echo "AgentCrush Daily Summary"
  echo "Generated: $STAMP"
  echo "========================================"
  echo

  "$APP_DIR/ops/health-check.sh"
  echo

  echo "[5] Git status"
  cd "$APP_DIR"
  git status --short || true
  echo

  echo "[6] Last 5 commits"
  git log --oneline -5 || true
  echo

  echo "[7] Recent publisher log (last 20 lines)"
  journalctl -u x-publisher.service -n 20 --no-pager 2>/dev/null || true
  echo

  echo "[8] Recent canon-enqueuer log (last 20 lines)"
  journalctl -u canon-enqueuer.service -n 20 --no-pager 2>/dev/null || true
  echo

} | tee -a "$DAY_FILE"
