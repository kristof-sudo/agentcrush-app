#!/usr/bin/env bash
set -euo pipefail

echo "=== AgentCrush X Cost Sanity Check ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo
echo "Target daily spend: ideal \$1-2/day, hard warning around \$3/day"
echo
echo "[1] Scanner cadence"
systemctl list-timers --all | grep x-scanner || true
echo
echo "[2] Recent scanner runs"
journalctl -u x-scanner.service -n 20 --no-pager 2>/dev/null || true
echo
echo "[3] Notes"
echo "- This script is a lightweight operating check."
echo "- Real cost accounting should later pull from DB/vendor ledger if available."
echo "- Current rule: do not increase scanner aggressiveness without explicit reason."
echo
echo "=== End X Cost Check ==="
