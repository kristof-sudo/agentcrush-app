#!/usr/bin/env bash
set -e

echo "=== STEP 1: git status ==="
git status -s

echo
echo "=== STEP 2: build ==="
npm run build

echo
echo "=== STEP 3: deploy ==="
bash deploy/deploy-prod.sh

echo
echo "=== STEP 4: basic health ==="
sleep 3

echo
echo "--- scheduled posts ---"
python3 tools/agentcrush-supabase.py scheduled_posts_summary | head -n 40

echo
echo "--- alerts ---"
python3 tools/agentcrush-supabase.py alerts_open

echo
echo "=== DONE ==="
