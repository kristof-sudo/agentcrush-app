#!/usr/bin/env bash
# Deploy R-5 scheduled routines to VPS.
# Run from: agentcrush-app repo root
# Usage: bash ops/deploy/deploy-r5-scheduled-routines.sh
set -euo pipefail

VPS="root@104.248.240.129"
RUNTIME="/opt/agentcrush/runtime/decision-card"
SYSTEMD="/etc/systemd/system"

echo "=== R-5: Deploying scheduled routines to VPS ==="

# 1. Copy new worker scripts
echo "→ Copying worker scripts..."
scp runtime/decision-card/scheduled-executor.mjs "${VPS}:${RUNTIME}/scheduled-executor.mjs"
scp runtime/decision-card/midday-check.mjs      "${VPS}:${RUNTIME}/midday-check.mjs"

# 2. Copy systemd units
echo "→ Copying systemd units..."
for unit in \
  agentcrush-executor-morning.service \
  agentcrush-executor-morning.timer \
  agentcrush-midday-check.service \
  agentcrush-midday-check.timer \
  agentcrush-executor-overnight.service \
  agentcrush-executor-overnight.timer; do
  scp "ops/systemd/${unit}" "${VPS}:${SYSTEMD}/${unit}"
done

# 3. Reload systemd + enable + start timers
echo "→ Enabling timers on VPS..."
ssh "${VPS}" bash <<'REMOTE'
set -euo pipefail
systemctl daemon-reload

for timer in \
  agentcrush-executor-morning \
  agentcrush-midday-check \
  agentcrush-executor-overnight; do
  echo "  enabling ${timer}.timer..."
  systemctl enable "${timer}.timer"
  systemctl start  "${timer}.timer"
done

echo "=== Timer status ==="
systemctl list-timers --no-pager | grep -E 'executor|midday' || true
REMOTE

echo ""
echo "=== R-5 deploy complete ==="
echo ""
echo "New timers:"
echo "  07:00 UTC — agentcrush-executor-morning.timer   (mid-morning ship)"
echo "  11:00 UTC — agentcrush-midday-check.timer       (13:00 Budapest status)"
echo "  21:00 UTC — agentcrush-executor-overnight.timer (overnight safe-ship)"
echo ""
echo "Verify:"
echo "  ssh root@104.248.240.129 systemctl list-timers --no-pager | grep -E 'executor|midday'"
