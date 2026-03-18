#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/agentcrush-app"
STAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

echo "=== AgentCrush Founder Daily Summary ==="
echo "Generated: $STAMP"
echo

echo "[1] Executive status"

issues=0

scanner_active=$(systemctl list-timers --all | grep -c 'x-scanner.timer' || true)
publisher_active=$(systemctl list-timers --all | grep -c 'x-publisher.timer' || true)
approval_listener_active=$(systemctl list-timers --all | grep -c 'approval-listener.timer' || true)

if [ "$scanner_active" -eq 0 ]; then
  echo "- Scanner timer: MISSING"
  issues=$((issues+1))
else
  echo "- Scanner timer: OK"
fi

if [ "$publisher_active" -eq 0 ]; then
  echo "- Publisher timer: MISSING"
  issues=$((issues+1))
else
  echo "- Publisher timer: OK"
fi

if [ "$approval_listener_active" -eq 0 ]; then
  echo "- Approval listener timer: MISSING"
  issues=$((issues+1))
else
  echo "- Approval listener timer: OK"
fi

echo
echo "[2] Recent risk signals (last 6h)"

scanner_503=$(journalctl -u x-scanner.service --since "6 hours ago" --no-pager 2>/dev/null | grep -c 'X API 503' || true)
scanner_402=$(journalctl -u x-scanner.service --since "6 hours ago" --no-pager 2>/dev/null | grep -c 'CreditsDepleted\|X API 402' || true)
publisher_errors=$(journalctl -u x-publisher.service --since "6 hours ago" -p err --no-pager 2>/dev/null | grep -c . || true)
canon_errors=$(journalctl -u canon-enqueuer.service --since "6 hours ago" -p err --no-pager 2>/dev/null | grep -c . || true)

echo "- Scanner transient/API 503 count: $scanner_503"
echo "- Scanner credit/API 402 count: $scanner_402"
echo "- Publisher error count: $publisher_errors"
echo "- Canon enqueuer error count: $canon_errors"

if [ "$scanner_402" -gt 0 ]; then
  echo "  ACTION: X credits depleted or billing issue detected."
  issues=$((issues+1))
fi

if [ "$publisher_errors" -gt 5 ]; then
  echo "  ACTION: Publisher error rate elevated."
  issues=$((issues+1))
fi

if [ "$canon_errors" -gt 5 ]; then
  echo "  ACTION: Canon enqueuer error rate elevated."
  issues=$((issues+1))
fi

echo
echo "[3] Mike flow check"

last_publisher_lines=$(journalctl -u x-publisher.service -n 20 --no-pager 2>/dev/null || true)
last_copydesk_lines=$(journalctl -u copydesk.service -n 20 --no-pager 2>/dev/null || true)
last_canon_lines=$(journalctl -u canon-enqueuer.service -n 20 --no-pager 2>/dev/null || true)

if echo "$last_publisher_lines" | grep -qiE 'Finished|Deactivated successfully|posted|publish'; then
  echo "- Publisher recent activity: PRESENT"
else
  echo "- Publisher recent activity: UNCLEAR"
fi

if echo "$last_copydesk_lines" | grep -qiE 'Finished|Deactivated successfully|queued|candidate|complete'; then
  echo "- Copydesk recent activity: PRESENT"
else
  echo "- Copydesk recent activity: UNCLEAR"
fi

if echo "$last_canon_lines" | grep -qiE 'Finished|Deactivated successfully|queued|candidate|complete'; then
  echo "- Canon recent activity: PRESENT"
else
  echo "- Canon recent activity: UNCLEAR"
fi

echo
echo "[4] Founder decision"

if [ "$issues" -eq 0 ]; then
  echo "STATUS: NO ACTION NEEDED"
  echo "Interpretation: system looks operational; founder can stay at review/approval level."
elif [ "$issues" -eq 1 ]; then
  echo "STATUS: REVIEW RECOMMENDED"
  echo "Interpretation: one meaningful risk signal detected; review before making product changes."
else
  echo "STATUS: ACTION NEEDED"
  echo "Interpretation: multiple operational risks detected; stabilize before further changes."
fi

echo
echo "[5] Short supporting context"
echo "- Last scanner lines:"
journalctl -u x-scanner.service -n 8 --no-pager 2>/dev/null || true
echo
echo "- Last publisher lines:"
journalctl -u x-publisher.service -n 8 --no-pager 2>/dev/null || true

echo
echo "=== End Founder Daily Summary ==="
