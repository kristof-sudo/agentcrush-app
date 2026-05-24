#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

OUTPUT=$(cat <<EOT
=== AgentCrush Founder Summary ===
Generated: $STAMP
EOT
)

issues=0

check_timer () {
  local unit="$1"
  local label="$2"

  enabled="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
  active="$(systemctl is-active "$unit" 2>/dev/null || true)"

  if [ "$enabled" = "enabled" ] || [ "$enabled" = "static" ]; then
    OUTPUT="$OUTPUT\n- $label: ENABLED / $active"
  else
    OUTPUT="$OUTPUT\n- $label: NOT ENABLED / $active"
    issues=$((issues+1))
  fi
}

OUTPUT="$OUTPUT\n\n[1] Executive status"
check_timer "x-scanner.timer" "Scanner"
check_timer "x-publisher.timer" "Publisher"
check_timer "approval-listener.timer" "Approval listener"

scanner_402=$(journalctl -u x-scanner.service --since "6 hours ago" --no-pager 2>/dev/null | grep -c 'CreditsDepleted\|X API 402' || true)

OUTPUT="$OUTPUT\n\n[2] Risk signals"
OUTPUT="$OUTPUT\n- Scanner 402: $scanner_402"

if [ "$scanner_402" -gt 0 ]; then
  OUTPUT="$OUTPUT\n  ACTION: credits issue"
  issues=$((issues+1))
fi

if [ "$issues" -eq 0 ]; then
  STATUS="NO ACTION NEEDED"
elif [ "$issues" -eq 1 ]; then
  STATUS="REVIEW"
else
  STATUS="ACTION NEEDED"
fi

OUTPUT="$OUTPUT\n\n[3] Decision: $STATUS"

echo -e "$OUTPUT"

# === TELEGRAM SEND ===

set -a
source /opt/agentcrush/copydesk/.env
set +a

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_OPS_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${TELEGRAM_OPS_CHAT_ID}\",
    \"text\": \"${OUTPUT}\"
  }" > /dev/null
