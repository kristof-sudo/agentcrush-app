#!/usr/bin/env python3
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ENV_PATH = Path("/opt/agentcrush/copydesk/.env")

ALLOWED_ACTIONS = {
    "scheduled_posts_summary",
    "copydesk_jobs_summary",
    "interaction_jobs_summary",
    "x_observed_posts_summary",
    "runs_recent",
    "alerts_open",
}

def fail(msg):
    print(json.dumps({"ok": False, "error": msg}, indent=2))
    sys.exit(1)

def load_env():
    env = {}
    if not ENV_PATH.exists():
        fail(f"env file not found: {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def api_get(base, key, table, query):
    url = f"{base}/rest/v1/{table}?{urllib.parse.urlencode(query, doseq=True)}"
    req = urllib.request.Request(url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))

def scheduled_posts_summary(base, key):
    rows = api_get(base, key, "scheduled_posts", {
        "select": "id,status,channel,run_at,approved,publish_ready,created_at",
        "order": "created_at.desc",
        "limit": "10",
    })
    queued = [r for r in rows if r.get("status") == "queued"]
    return {
        "recent_rows": rows,
        "queued_count_in_sample": len(queued),
    }

def copydesk_jobs_summary(base, key):
    rows = api_get(base, key, "copydesk_jobs", {
        "select": "id,job_type,status,priority,created_at,updated_at",
        "order": "created_at.desc",
        "limit": "15",
    })
    return {"recent_rows": rows}

def interaction_jobs_summary(base, key):
    rows = api_get(base, key, "interaction_jobs", {
        "select": "id,action_type,status,created_at,target_author_handle",
        "order": "created_at.desc",
        "limit": "15",
    })
    return {"recent_rows": rows}

def x_observed_posts_summary(base, key):
    rows = api_get(base, key, "x_observed_posts", {
        "select": "id,tweet_id,author_handle,observed_at,is_processed,used_for_job,ignored",
        "order": "observed_at.desc",
        "limit": "15",
    })
    return {"recent_rows": rows}

def runs_recent(base, key):
    rows = api_get(base, key, "runs", {
        "select": "id,runner,job,status,created_at,error,meta",
        "order": "created_at.desc",
        "limit": "20",
    })
    return {"recent_rows": rows}

def alerts_open(base, key):
    rows = api_get(base, key, "alerts", {
        "select": "id,severity,code,message,created_at,resolved_at",
        "resolved_at": "is.null",
        "order": "created_at.desc",
        "limit": "20",
    })
    return {"open_alerts": rows}

DISPATCH = {
    "scheduled_posts_summary": scheduled_posts_summary,
    "copydesk_jobs_summary": copydesk_jobs_summary,
    "interaction_jobs_summary": interaction_jobs_summary,
    "x_observed_posts_summary": x_observed_posts_summary,
    "runs_recent": runs_recent,
    "alerts_open": alerts_open,
}

def main():
    if len(sys.argv) != 2:
        fail("usage: agentcrush-supabase <action>")

    action = sys.argv[1].strip()
    if action not in ALLOWED_ACTIONS:
        fail(f"action not allowlisted: {action}")

    env = load_env()
    base = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not base or not key:
        fail("missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    result = DISPATCH[action](base, key)
    print(json.dumps({"ok": True, "action": action, "result": result}, indent=2))

if __name__ == "__main__":
    main()
