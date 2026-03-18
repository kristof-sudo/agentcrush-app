#!/usr/bin/env bash
set -euo pipefail

echo "=== AgentCrush Health Check ==="
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo

echo "[1] Timers"
systemctl list-timers --all | egrep 'x-scanner|x-selector|copydesk|canon-enqueuer|scheduler-prep|approval-notifier|approval-listener|x-publisher|canonkeeper' || true
echo

echo "[2] Service states"
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
echo

echo "[3] Recent failures (targeted)"
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
  count=$(journalctl -u "$svc" --since "30 minutes ago" -p err --no-pager 2>/dev/null | grep -c . || true)
  printf "%-28s %s errors in last 30m\n" "$svc" "$count"
done
echo

echo "[4] Disk / memory"
df -h / | tail -n 1
free -m
echo

echo "=== End Health Check ==="
