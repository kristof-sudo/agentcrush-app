#!/usr/bin/env bash
set -euo pipefail

echo "=== AgentCrush Queue State ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo
echo "[1] Relevant timers"
systemctl list-timers --all | egrep 'copydesk|canon-enqueuer|scheduler-prep|approval-notifier|approval-listener|x-publisher' || true
echo
echo "[2] Recent scheduler-prep log"
journalctl -u scheduler-prep.service -n 20 --no-pager 2>/dev/null || true
echo
echo "[3] Recent approval-notifier log"
journalctl -u approval-notifier.service -n 20 --no-pager 2>/dev/null || true
echo
echo "[4] Recent approval-listener log"
journalctl -u approval-listener.service -n 20 --no-pager 2>/dev/null || true
echo
echo "[5] Recent x-publisher log"
journalctl -u x-publisher.service -n 20 --no-pager 2>/dev/null || true
echo
echo "=== End Queue State ==="
