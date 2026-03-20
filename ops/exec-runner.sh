#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/root/agentcrush-app"
QUEUE_DIR="$REPO_DIR/ops/exec-queue"

cd "$REPO_DIR"
mkdir -p "$QUEUE_DIR"

for file in "$QUEUE_DIR"/request_*.json; do
  [ -e "$file" ] || continue

  id=$(basename "$file" .json | sed 's/request_//')
  result_file="$QUEUE_DIR/result_${id}.json"
  cmd=$(jq -r '.command' "$file")

  case "$cmd" in
    founder_summary)
      output=$(bash ops/founder-summary.sh 2>&1 || true)
      ;;
    alerts_summary)
      alerts_raw=$(python3 tools/agentcrush-supabase.py alerts_open 2>&1 || true)
      output=$(ALERTS_RAW="$alerts_raw" python3 - <<'PY'
import json, os
raw = os.environ.get("ALERTS_RAW", "")
try:
    parsed = json.loads(raw)
    alerts = parsed.get("result", {}).get("open_alerts", [])
    if not alerts:
        print("Open alerts: 0")
    else:
        print(f"Open alerts: {len(alerts)}")
        for a in alerts[:5]:
            print(f"- {a.get('code')} | {a.get('severity')} | {a.get('created_at')}")
        if len(alerts) > 5:
            print(f"- ...and {len(alerts)-5} more")
except Exception:
    print(raw)
PY
      )
      ;;
    queue_summary)
      queue_raw=$(python3 tools/agentcrush-supabase.py scheduled_posts_summary 2>&1 || true)
      interaction_raw=$(python3 tools/agentcrush-supabase.py interaction_jobs_summary 2>&1 || true)
      output=$(QUEUE_RAW="$queue_raw" INTERACTION_RAW="$interaction_raw" python3 - <<'PY'
import json, os

def parse(raw):
    try:
        return json.loads(raw)
    except Exception:
        return {}

queue = parse(os.environ.get("QUEUE_RAW", ""))
interaction = parse(os.environ.get("INTERACTION_RAW", ""))

rows = queue.get("result", {}).get("recent_rows", [])
queued = sum(1 for r in rows if r.get("status") == "queued")
waiting = sum(1 for r in rows if r.get("approved") is False and r.get("status") != "cancelled")
sent = sum(1 for r in rows if r.get("status") == "sent")
cancelled = sum(1 for r in rows if r.get("status") == "cancelled")

irows = interaction.get("result", {}).get("recent_rows", [])
replies = sum(1 for r in irows if r.get("action_type") == "x_reply")
quotes = sum(1 for r in irows if r.get("action_type") == "x_quote")
reposts = sum(1 for r in irows if r.get("action_type") == "x_repost")
roundups = sum(1 for r in irows if r.get("action_type") == "roundup_candidate")

print("\n".join([
    "Queue snapshot",
    f"- queued: {queued}",
    f"- waiting approval: {waiting}",
    f"- sent in window: {sent}",
    f"- cancelled in window: {cancelled}",
    "",
    "Recent interaction mix",
    f"- replies: {replies}",
    f"- quotes: {quotes}",
    f"- reposts: {reposts}",
    f"- roundups: {roundups}",
]))
PY
      )
      ;;
    cancel_stale_queued_posts)
      output=$(python3 tools/agentcrush-supabase.py cancel_stale_queued_posts 2>&1 || true)
      ;;
    resolve_alert_by_id)
      alert_id=$(jq -r '.alert_id' "$file")
      output=$(AC_SUPABASE_ALERT_ID="$alert_id" \
        python3 tools/agentcrush-supabase.py resolve_alert_by_id 2>&1 || true)
      ;;
    reschedule_post_by_id)
      post_id=$(jq -r '.post_id' "$file")
      new_time=$(jq -r '.new_time' "$file")
      output=$(AC_SUPABASE_POST_ID="$post_id" \
        AC_SUPABASE_NEW_TIME="$new_time" \
        python3 tools/agentcrush-supabase.py reschedule_post_by_id 2>&1 || true)
      ;;
    *)
      output="ERROR: command not allowed"
      ;;
  esac

  echo "{\"id\":\"$id\",\"output\":$(jq -Rs . <<<"$output")}" > "$result_file"
  rm -f "$file"
done
