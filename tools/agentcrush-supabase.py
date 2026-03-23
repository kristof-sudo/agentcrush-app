#!/usr/bin/env python3
import json
import os
import sys
import datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ALLOWED_ACTIONS = {
    "scheduled_posts_summary",
    "copydesk_jobs_summary",
    "interaction_jobs_summary",
    "x_observed_posts_summary",
    "incoming_replies_summary",
    "runs_recent",
    "alerts_open",
    "cancel_stale_queued_posts",
    "reschedule_post_by_id",
    "resolve_alert_by_id",
   "interaction_jobs_summary",
}


def fail(message):
    print(json.dumps({"ok": False, "error": message}, indent=2))
    sys.exit(1)


def load_env():
    env = dict(os.environ)
    repo_root = Path(__file__).resolve().parent.parent

    candidate_files = [
        repo_root / ".env",
        repo_root / ".env.local",
        Path("/opt/agentcrush/copydesk/.env"),
        Path("/opt/agentcrush/selector/.env"),
    ]

    for env_file in candidate_files:
        if not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            env.setdefault(k, v)

    return env

def api_get(base, key, table, params=None):
    params = params or {}
    qs = urlencode(params)
    url = f"{base.rstrip('/')}/rest/v1/{table}"
    if qs:
        url += f"?{qs}"

    req = Request(url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")

    try:
        with urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else []
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        fail(f"GET {table} failed: {e.code} {body}")

def api_patch(base, key, table, params=None, payload=None):
    params = params or {}
    payload = payload or {}
    qs = urlencode(params)
    url = f"{base.rstrip('/')}/rest/v1/{table}"
    if qs:
        url += f"?{qs}"

    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method="PATCH")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")

    try:
        with urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else []
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        fail(f"PATCH {table} failed: {e.code} {body}")

def scheduled_posts_summary(base, key):
    rows = api_get(base, key, "scheduled_posts", {
"select": "id,status,run_at,approved,publish_ready,approval_token,approval_requested_at,approved_at,approved_by",
"order": "run_at.asc",
        "limit": "20",
    })
    return {"recent_rows": rows}

def resolve_alert_by_id(base, key):
    alert_id = os.environ.get("AC_SUPABASE_ALERT_ID")
    if not alert_id:
        fail("missing AC_SUPABASE_ALERT_ID")

    now_iso = datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    updated = api_patch(
        base,
        key,
        "alerts",
        {"id": f"eq.{alert_id}"},
        {"resolved_at": now_iso},
    )

    return {
        "affected": len(updated or []),
        "alert_id": alert_id,
        "resolved_at": now_iso,
    }

def copydesk_jobs_summary(base, key):
    rows = api_get(base, key, "copydesk_jobs", {
        "select": "id,status,job_type,subject_type,created_at,updated_at,error",
        "order": "created_at.desc",
        "limit": "20",
    })
    return {"recent_rows": rows}


def interaction_jobs_summary(base, key):
    rows = api_get(base, key, "interaction_jobs", {
        "select": "id,action_type,status,created_at,target_author_handle",
        "order": "created_at.desc",
        "limit": "20",
    })
    return {"recent_rows": rows}

def interaction_jobs_summary(base, key):
    rows = api_get(base, key, "interaction_jobs", {
        "select": "id,action_type,status,created_at,target_author_handle",
        "order": "created_at.desc",
        "limit": "20",
    })
    return {"recent_rows": rows}

def x_observed_posts_summary(base, key):
    rows = api_get(base, key, "x_observed_posts", {
        "select": "id,tweet_id,author_handle,observed_at,is_processed,used_for_job,ignored",
        "order": "observed_at.desc",
        "limit": "15",
    })
    return {"recent_rows": rows}

def incoming_replies_summary(base, key):
    rows = api_get(base, key, "events", {
        "select": "created_at,author_handle:metadata->>author_handle,text:metadata->>text,is_question:metadata->>is_question,tweet_id:metadata->>tweet_id,parent_tweet_id:metadata->>parent_tweet_id",
        "event_type": "eq.reply_incoming",
        "order": "created_at.desc",
        "limit": "20",
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


def cancel_stale_queued_posts(base, key):
    hours = int(os.environ.get("AC_SUPABASE_HOURS", "6"))
    limit = int(os.environ.get("AC_SUPABASE_LIMIT", "5"))
    cutoff = (
        datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=hours)
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    rows = api_get(base, key, "scheduled_posts", {
        "select": "id,run_at,status,approved",
        "status": "eq.queued",
        "run_at": f"lt.{cutoff}",
       "order": "run_at.asc",
        "limit": str(limit),
    })

    ids = [r["id"] for r in (rows or []) if r.get("id") is not None]

    if not ids:
        return {
            "affected": 0,
            "cutoff": cutoff,
            "message": "no stale queued posts found",
        }

    updated = api_patch(
        base,
        key,
        "scheduled_posts",
        {"id": f"in.({','.join(str(x) for x in ids)})"},
        {"status": "cancelled"},
    )

    return {
        "affected": len(updated or []),
        "ids": ids,
        "cutoff": cutoff,
    }

def reschedule_post_by_id(base, key):
    post_id = os.environ.get("AC_SUPABASE_POST_ID")
    new_time_iso = os.environ.get("AC_SUPABASE_NEW_TIME")

    if not post_id:
        fail("missing AC_SUPABASE_POST_ID")
    if not new_time_iso:
        fail("missing AC_SUPABASE_NEW_TIME")

    try:
        new_time = datetime.datetime.fromisoformat(
            new_time_iso.replace("Z", "+00:00")
        )
    except ValueError:
        fail("AC_SUPABASE_NEW_TIME must be ISO format, example 2026-03-20T10:00:00+00:00")

    now = datetime.datetime.now(datetime.UTC)
    if new_time < now:
        fail("cannot schedule in the past")

    updated = api_patch(
        base,
        key,
        "scheduled_posts",
        {"id": f"eq.{post_id}"},
        {"run_at": new_time_iso},
    )

    return {
        "affected": len(updated or []),
        "post_id": post_id,
        "new_time": new_time_iso,
    }

DISPATCH = {
    "scheduled_posts_summary": scheduled_posts_summary,
    "copydesk_jobs_summary": copydesk_jobs_summary,
    "interaction_jobs_summary": interaction_jobs_summary,
    "x_observed_posts_summary": x_observed_posts_summary,
    "incoming_replies_summary": incoming_replies_summary,
    "runs_recent": runs_recent,
    "alerts_open": alerts_open,
    "cancel_stale_queued_posts": cancel_stale_queued_posts,
    "reschedule_post_by_id": reschedule_post_by_id,
    "resolve_alert_by_id": resolve_alert_by_id,
   "interaction_jobs_summary": interaction_jobs_summary,
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
