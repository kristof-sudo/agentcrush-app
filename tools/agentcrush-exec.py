#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

REPO = Path("/root/agentcrush-app").resolve()

ALLOWED_SERVICES = {
    "x-scanner.service",
    "x-selector.service",
    "copydesk.service",
    "canon-enqueuer.service",
    "scheduler-prep.service",
    "approval-notifier.service",
    "approval-listener.service",
    "x-publisher.service",
    "canonkeeper.service",
}

ALLOWED_TIMERS = {
    "x-scanner.timer",
    "x-selector.timer",
    "copydesk.timer",
    "canon-enqueuer.timer",
    "scheduler-prep.timer",
    "approval-notifier.timer",
    "approval-listener.timer",
    "x-publisher.timer",
    "canonkeeper.timer",
    "agentcrush-founder-summary.timer",
}

ALLOWED_ACTIONS = {
    "read_file",
    "grep_repo",
    "git_status",
    "git_diff",
    "git_commit",
    "git_push",
    "journal_tail",
    "service_status",
    "timer_status",
    "health",
    "summary",
    "deploy",
    "apply_change",
}

def fail(msg):
    print(json.dumps({"ok": False, "error": msg}, indent=2))
    sys.exit(1)

def run(cmd, cwd=REPO, check=True):
    res = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if check and res.returncode != 0:
        fail(f"command failed: {' '.join(cmd)}\nstdout:\n{res.stdout}\nstderr:\n{res.stderr}")
    return {"stdout": res.stdout, "stderr": res.stderr, "returncode": res.returncode}

def safe_repo_path(path_str):
    p = (REPO / path_str).resolve()
    if not str(p).startswith(str(REPO)):
        fail(f"path escapes repo: {path_str}")
    return p

def do_read_file(op):
    p = safe_repo_path(op["path"])
    if not p.exists():
        fail(f"file not found: {op['path']}")
    return {"path": op["path"], "content": p.read_text()}

def do_grep_repo(op):
    pattern = op["pattern"]
    res = run(["grep", "-RniE", pattern, str(REPO)], cwd=REPO, check=False)
    return {"matches": res["stdout"]}

def do_git_status(op):
    return run(["git", "status", "--short"])

def do_git_diff(op):
    if "path" in op:
        return run(["git", "--no-pager", "diff", "--", op["path"]])
    return run(["git", "--no-pager", "diff"])

def do_git_commit(op):
    message = op.get("message", "").strip()
    if not message:
        fail("git_commit requires non-empty message")
    run(["git", "add", "-A"])
    return run(["git", "commit", "-m", message], check=False)

def do_git_push(op):
    return run(["git", "push", "origin", "main"])

def do_journal_tail(op):
    unit = op["unit"]
    lines = str(int(op.get("lines", 40)))
    if unit not in ALLOWED_SERVICES:
        fail(f"service not allowlisted: {unit}")
    return run(["journalctl", "-u", unit, "-n", lines, "--no-pager"], cwd=REPO)

def do_service_status(op):
    unit = op["unit"]
    if unit not in ALLOWED_SERVICES:
        fail(f"service not allowlisted: {unit}")
    return run(["systemctl", "status", unit, "--no-pager"], cwd=REPO, check=False)

def do_timer_status(op):
    unit = op["unit"]
    if unit not in ALLOWED_TIMERS:
        fail(f"timer not allowlisted: {unit}")
    return run(["systemctl", "status", unit, "--no-pager"], cwd=REPO, check=False)

def do_health(op):
    return run(["/usr/local/bin/agentcrush-health"], cwd=REPO)

def do_summary(op):
    return run(["/usr/local/bin/agentcrush-summary"], cwd=REPO)

def do_deploy(op):
    return run(["/usr/local/bin/agentcrush-deploy"], cwd=REPO)

def do_apply_change(op):
    change_file = safe_repo_path(op["change_file"])
    return run(["/usr/local/bin/agentcrush-apply-change", str(change_file)], cwd=REPO)

DISPATCH = {
    "read_file": do_read_file,
    "grep_repo": do_grep_repo,
    "git_status": do_git_status,
    "git_diff": do_git_diff,
    "git_commit": do_git_commit,
    "git_push": do_git_push,
    "journal_tail": do_journal_tail,
    "service_status": do_service_status,
    "timer_status": do_timer_status,
    "health": do_health,
    "summary": do_summary,
    "deploy": do_deploy,
    "apply_change": do_apply_change,
}

def main():
    if len(sys.argv) != 2:
        fail("usage: agentcrush-exec <request.json>")

    req_path = Path(sys.argv[1]).resolve()
    if not req_path.exists():
        fail("request file not found")

    req = json.loads(req_path.read_text())
    actions = req.get("actions", [])
    if not isinstance(actions, list) or not actions:
        fail("actions must be a non-empty list")

    out = []
    for i, op in enumerate(actions, start=1):
        action = op.get("action")
        if action not in ALLOWED_ACTIONS:
            fail(f"action not allowlisted: {action}")
        result = DISPATCH[action](op)
        out.append({
            "step": i,
            "action": action,
            "result": result,
        })

    print(json.dumps({"ok": True, "results": out}, indent=2))

if __name__ == "__main__":
    main()
