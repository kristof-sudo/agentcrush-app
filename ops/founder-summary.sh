#!/usr/bin/env bash
set -euo pipefail

cd /root/agentcrush-app

STAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
STATUS="OK"
ISSUES=()

add_issue() {
  ISSUES+=("$1")
  if [ "$STATUS" = "OK" ]; then
    STATUS="WARNING"
  fi
}

add_critical() {
  ISSUES+=("$1")
  STATUS="CRITICAL"
}

check_unit() {
  local unit="$1"
  local label="$2"
  local enabled active
  enabled="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
  active="$(systemctl is-active "$unit" 2>/dev/null || true)"
  echo "- $label: enabled=$enabled active=$active"
  if ! { [ "$enabled" = "enabled" ] || [ "$enabled" = "static" ]; }; then
    add_issue "$label not enabled"
  fi
}

scheduled_json="$(python3 tools/agentcrush-supabase.py scheduled_posts_summary 2>/dev/null || true)"
alerts_json="$(python3 tools/agentcrush-supabase.py alerts_open 2>/dev/null || true)"
runs_json="$(python3 tools/agentcrush-supabase.py runs_recent 2>/dev/null || true)"
spend_json="$(python3 tools/agentcrush-supabase.py spend_summary 2>/dev/null || true)"

x_today_usd="$(printf '%s' "$spend_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"\${d.get('result',{}).get('x_today_usd','?'):.3f}\")" 2>/dev/null || echo '?')"
x_mtd_usd="$(printf '%s' "$spend_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"\${d.get('result',{}).get('x_mtd_usd','?'):.2f}\")" 2>/dev/null || echo '?')"
oai_mtd_usd="$(printf '%s' "$spend_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"\${d.get('result',{}).get('oai_mtd_usd','?'):.2f}\")" 2>/dev/null || echo '?')"
combined_mtd_usd="$(printf '%s' "$spend_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"\${d.get('result',{}).get('combined_mtd_usd','?'):.2f}\")" 2>/dev/null || echo '?')"

queued_count="$(printf '%s' "$scheduled_json" | grep -c '"status": "queued"' || true)"
sent_count="$(printf '%s' "$scheduled_json" | grep -c '"status": "sent"' || true)"
cancelled_count="$(printf '%s' "$scheduled_json" | grep -c '"status": "cancelled"' || true)"
approved_waiting_count="$(printf '%s' "$scheduled_json" | grep -c '"approved": false' || true)"
open_alerts_count="$(printf '%s' "$alerts_json" | grep -c '"id":' || true)"
failed_runs_count="$(printf '%s' "$runs_json" | grep -c '"status": "failed"' || true)"
scanner_402="$(journalctl -u x-scanner.service --since "24 hours ago" --no-pager 2>/dev/null | grep -c 'CreditsDepleted\|X API 402' || true)"
scanner_runs="$(journalctl -u x-scanner.service --since "24 hours ago" --no-pager 2>/dev/null | grep -c "Starting" || true)"

if [ "$open_alerts_count" -gt 0 ]; then
  add_issue "open alerts present ($open_alerts_count)"
fi

if [ "$failed_runs_count" -gt 0 ]; then
  add_issue "recent failed runs present ($failed_runs_count)"
fi

if [ "$queued_count" -gt 6 ]; then
  add_issue "queued posts unusually high ($queued_count)"
fi

if [ "$scanner_402" -gt 0 ]; then
  add_issue "scanner hit X API credit/rate issue in last 24h ($scanner_402)"
fi

if [ "$scanner_runs" -gt 48 ]; then
  add_issue "scanner running too frequently ($scanner_runs runs/24h)"
fi

PIPELINE_BLOCK="$(cat <<EOT
$(check_unit "x-scanner.timer" "Scanner")
$(check_unit "x-selector.timer" "Selector")
$(check_unit "copydesk.timer" "CopyDesk")
$(check_unit "approval-listener.timer" "Approval listener")
$(check_unit "x-publisher.timer" "Publisher")
EOT
)"

OUTPUT="=== AgentCrush Founder Summary ===
Generated: $STAMP

[1] Overall status
- STATUS: $STATUS

[2] Core pipeline
$PIPELINE_BLOCK

[3] Queue snapshot
- queued posts: $queued_count
- sent posts in window: $sent_count
- cancelled posts in window: $cancelled_count
- approval waiting count: $approved_waiting_count

[4] Estimated spend
- X today: \$$x_today_usd
- X month-to-date: \$$x_mtd_usd
- OpenAI month-to-date: \$$oai_mtd_usd
- Combined month-to-date: \$$combined_mtd_usd

[5] Risk signals
- open alerts: $open_alerts_count
- recent failed runs: $failed_runs_count
- scanner 402/rate issues (24h): $scanner_402
- scanner runs (24h): $scanner_runs

[6] Issues"

if [ "${#ISSUES[@]}" -eq 0 ]; then
  OUTPUT="$OUTPUT
- none"
else
  for issue in "${ISSUES[@]}"; do
    OUTPUT="$OUTPUT
- $issue"
  done
fi

if [ "$STATUS" = "OK" ]; then
  RECOMMENDATION="No action needed."
elif [ "$STATUS" = "WARNING" ]; then
  RECOMMENDATION="Review queue, alerts, failed runs, and X scan frequency."
else
  RECOMMENDATION="Immediate review needed before assuming pipeline is healthy."
fi

OUTPUT="$OUTPUT

[7] Recommendation
- $RECOMMENDATION"

printf '%s\n' "$OUTPUT"
