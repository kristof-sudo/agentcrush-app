#!/usr/bin/env bash
# deploy-prod.sh — Deploy latest AgentCrush code to production.
#
# Services managed by this deploy:
#   agentcrush.service                     — main API / web server (persistent)
#   agentcrush-github-snapshot.timer       — snapshot + signal worker (every ~8h)
#   agentcrush-weekly-ingest.timer         — GitHub discovery + agent insert (Mon 06:00 UTC)
#   x-scanner.timer                        — X/Twitter scanner (every ~3h)
#   agentcrush-founder-summary.timer       — founder summary job
#
# Worker pipeline documented in: ops/restart-worker.sh
#
# Schema notes:
#   daily_snapshots          — one row per UTC date, ecosystem-level aggregates
#                              (written by tools/record-daily-snapshot.mjs, NOT this worker)
#   agent_daily_snapshots    — one row per (agent_id, snapshot_date), per-agent scores
#                              (written by scanner/github-snapshot-worker.mjs step 6)
#   agents.weekly_delta      — integer, updated by snapshot worker step 7
#
# Usage:
#   sudo ./ops/deploy-prod.sh

set -euo pipefail

cd /opt/agentcrush

echo "[deploy] Pulling latest code..."
git pull

echo "[deploy] Installing scanner dependencies..."
(cd scanner && npm install --omit=dev)

echo "[deploy] Reloading systemd unit files..."
systemctl daemon-reload

echo "[deploy] Restarting main API server..."
systemctl restart agentcrush.service
systemctl status agentcrush.service --no-pager -l

echo ""
echo "[deploy] Done."
echo "  Timers will fire on their normal schedule."
echo "  To force an immediate snapshot run: sudo ./ops/restart-worker.sh"
