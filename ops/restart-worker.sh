#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <worker-name>"
  echo "Allowed: x-scanner x-selector copydesk canon-enqueuer scheduler-prep approval-notifier approval-listener x-publisher canonkeeper"
  exit 1
fi

WORKER="$1"

case "$WORKER" in
  x-scanner|x-selector|copydesk|canon-enqueuer|scheduler-prep|approval-notifier|approval-listener|x-publisher|canonkeeper)
    ;;
  *)
    echo "Invalid worker: $WORKER"
    exit 1
    ;;
esac

echo "Restarting ${WORKER}.timer ..."
systemctl restart "${WORKER}.timer"
echo "Done."
systemctl list-timers --all | grep "$WORKER" || true
