#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

echo "=== AgentCrush Founder Daily Summary ==="
echo "Generated: $STAMP"
echo

issues=0

check_timer () {
  local unit="$1"
  local label="$2"

  enabled="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
  active="$(systemctl is-active "$unit" 2>/dev/null || true)"

  if [ "$enabled" = "enabled" ] || [ "$enabled" = "static" ]; then
    echo "- $label: ENABLED / $active"
  else
    echo "- $label: NOT ENABLED / $active"
    issues=$((issues+1))
  fi
}

echo "[1] Executive status"
check_timer "x-scanner.timer" "Scanner timer"
check_timer "x-publisher.timer" "Publisher timer"
check_timer "approval-listener.timer" "Approval listener timer"

echo
echo "[2] Recent risk signals (last 6h)"

scanner_503=$(journalctl -u x-scanner.service --since "6 hours ago" --no-pager 2>/dev/null | grep -c 'X API 503' || true)
scanner_402=$(journalctl -u x-scanner.service --since "6 hours ago" --no-pager 2>/dev/null | grep -c 'CreditsDepleted\|X API 402' || true)
publisher_errors=$(journalctl -u x-publisher.service --since "6 hours ago" -p err --no-pager 2>/dev/null | grep -c . || true)
canon_errors=$(journalctl -u canon-enqueuer.service --since "6 hours ago" -p err --no-pager 2>/dev/null | grep -c . || true)

echo "- Scanner 503: $scanner_503"
echo "- Scanner 402: $scanner_402"
echo "- Publisher errors: $publisher_errors"
echo "- Canon errors: $canon_errors"

if [ "$scanner_402" -gt 0 ]; then
  echo "  ACTION: X credits depleted"
  issues=$((issues+1))
fi

if [ "$publisher_errors" -gt 5 ]; then
  echo "  ACTION: Publisher unstable"
  issues=$((issues+1))
fi

if [ "$canon_errors" -gt 5 ]; then
  echo "  ACTION: Canon unstable"
  issues=$((issues+1))
fi

echo
echo "[3] Mike flow check"

check_activity () {
  local unit="$1"
  local label="$2"

  if journalctl -u "$unit" -n 20 --no-pager 2>/dev/null | grep -qiE 'Finished|posted|queued|complete|Deactivated successfully'; then
    echo "- $label: PRESENT"
  else
    echo "- $label: UNCLEAR"
  fi
}

check_activity "x-publisher.service" "Publisher"
check_activity "copydesk.service" "Copydesk"
check_activity "canon-enqueuer.service" "Canon"

echo
echo "[4] Founder decision"

if [ "$issues" -eq 0 ]; then
  echo "STATUS: NO ACTION NEEDED"
elif [ "$issues" -eq 1 ]; then
  echo "STATUS: REVIEW RECOMMENDED"
else
  echo "STATUS: ACTION NEEDED"
fi

echo
echo "[5] Context (last events)"
echo "- Scanner:"
journalctl -u x-scanner.service -n 5 --no-pager 2>/dev/null || true
echo
echo "- Publisher:"
journalctl -u x-publisher.service -n 5 --no-pager 2>/dev/null || true

echo
echo "=== End Summary ==="
