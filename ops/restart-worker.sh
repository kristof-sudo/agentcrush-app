#!/usr/bin/env bash
# restart-worker.sh — Force an immediate run of the AgentCrush GitHub snapshot worker.
#
# Normal schedule: agentcrush-github-snapshot.timer fires every hour.
# Use this script to trigger a run immediately outside that schedule, e.g.
# after a code deploy or to verify a fix.
#
# Worker pipeline (scanner/github-snapshot-worker.mjs):
#   1. Fetches GitHub repo stats (stars, forks, releases) for all tracked agents.
#   2. Inserts rows into github_repo_snapshots; updates agents.github_last_synced_at.
#   3. Calls process_github_signals() RPC       → fires ecosystem_signals rows.
#   4. Calls process_x_signals() RPC            → fires ecosystem_signals rows.
#   5. Calls process_relationship_signals() RPC → fires relationship-depth events.
#   6. Calls recalc_rankings() RPC              → rebuilds the rankings table.
#   7. Reads rankings → upserts per-agent rows into agent_daily_snapshots
#      (snapshot_date = today UTC). Idempotent on (agent_id, snapshot_date).
#   8. Computes weekly_delta for each agent:
#        - Baseline: snapshot 7 days ago, or oldest available if < 7 days of history.
#        - Agents with zero prior snapshots: skipped (weekly_delta stays null).
#      Writes result back to agents.weekly_delta.
#
# Weekly ingest pipeline (scanner/weekly-ingest-worker.mjs):
#   Timer: agentcrush-weekly-ingest.timer — fires every Monday 06:00 UTC
#   1. Fetches AI agent repos from GitHub via github-client.mjs search queries.
#   2. Filters: >=10 stars, has description, no tutorials/datasets/awesome-lists.
#   3. Upserts survivors into github_raw_agents (idempotent on repo_url).
#   4. Selects top 25 unimported rows by stars as this week's batch.
#   5. Normalizes + upserts into agents (conflict on handle → skip existing).
#      Sets github_full_name so snapshot worker can track the new agents.
#   6. Marks processed rows imported=true in github_raw_agents.
#   7. Sends Telegram notification to ops channel with agent list.
#   8. Appends summary to /opt/agentcrush/logs/weekly-ingest.log.
#   Dry run: node scanner/weekly-ingest-worker.mjs --dry-run
#
# Usage:
#   sudo ./ops/restart-worker.sh

set -euo pipefail

SERVICE=agentcrush-github-snapshot.service

echo "[restart-worker] Starting ${SERVICE}..."
systemctl start "${SERVICE}"

echo "[restart-worker] Run complete. Last 60 journal lines:"
journalctl -u "${SERVICE}" -n 60 --no-pager
