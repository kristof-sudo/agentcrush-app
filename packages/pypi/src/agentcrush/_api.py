"""
AgentCrush API client — zero-dependency wrapper over agentcrush.xyz public endpoints.
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

BASE_URL = "https://agentcrush.xyz"
USER_AGENT = "agentcrush-py/0.1.0 (pypi.org/project/agentcrush)"


def _get(path: str) -> Any:
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:200]
        raise RuntimeError(f"agentcrush API {e.code} at {path}: {body}") from e


def _post(path: str, payload: Any) -> Any:
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:200]
        raise RuntimeError(f"agentcrush API {e.code} at {path}: {body}") from e


def _normalize_handle(handle: str) -> str:
    return handle.lstrip("@").lower().strip()


def get_agent(handle: str) -> Dict:
    """Full LLM-optimised agent summary."""
    return _get(f"/api/agent/{_normalize_handle(handle)}/llm-summary")


def get_trust(handle: str) -> Dict:
    """Composite trust score (0-100) with classification and evidence breakdown."""
    return _get(f"/api/agent/{_normalize_handle(handle)}/trust")


def get_changes(handle: str, limit: int = 10) -> Dict:
    """Change feed — material changes across snapshots."""
    return _get(f"/api/agent/{_normalize_handle(handle)}/changes?limit={limit}")


def get_badge_url(handle: str, style: str = "rank") -> str:
    """Badge URL for embedding in READMEs and docs."""
    h = _normalize_handle(handle)
    return f"{BASE_URL}/api/badge/{h}?style={style}"


def get_trends() -> Dict:
    """Ecosystem trends summary — counts, movers, category mix."""
    return _get("/api/trends/summary")


def get_top_movers(limit: int = 10, direction: str = "up") -> List[Dict]:
    """Top movers this week (up or down)."""
    data = get_trends()
    key = "top_movers_up" if direction == "up" else "top_movers_down"
    return (data.get(key) or [])[:limit]


def get_ecosystem_summary() -> Dict:
    """Full LLM-optimized ecosystem summary."""
    return _get("/api/agent-economy/llm-summary")


def search_agents(query: str, limit: int = 10) -> Any:
    """Search the agent index via MCP tool interface."""
    resp = _post("/api/mcp/v1", {
        "method": "tools/call",
        "params": {"name": "search_agents", "arguments": {"query": query, "limit": limit}},
    })
    content = resp.get("result", {}).get("content", [{}])
    text = content[0].get("text") if content else None
    if text:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return resp


def get_top_agents(limit: int = 20, category: Optional[str] = None) -> Any:
    """List top-ranked agents."""
    args: Dict[str, Any] = {"limit": limit}
    if category:
        args["category"] = category
    resp = _post("/api/mcp/v1", {
        "method": "tools/call",
        "params": {"name": "get_top_agents", "arguments": args},
    })
    content = resp.get("result", {}).get("content", [{}])
    text = content[0].get("text") if content else None
    if text:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return resp
