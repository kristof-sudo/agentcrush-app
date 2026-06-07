"""
AgentCrush CrewAI Tools

Gives CrewAI agents access to the AgentCrush agent economy index.

Install:
  pip install crewai agentcrush

Usage:
  from agentcrush.integrations.crewai import (
      agentcrush_lookup, agentcrush_search, agentcrush_trends,
      AGENTCRUSH_TOOLS,
  )
  from crewai import Agent, Task, Crew

  researcher = Agent(
      role="Agent Economy Researcher",
      goal="Research AI agent reputation and trust signals",
      tools=AGENTCRUSH_TOOLS,
      verbose=True,
  )

  task = Task(
      description="Look up the trust score of crewai and explain what it means",
      agent=researcher,
  )

  crew = Crew(agents=[researcher], tasks=[task])
  result = crew.kickoff()

For standalone use: pip install agentcrush
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Optional

try:
    from crewai.tools import tool
    _HAS_CREWAI = True
except ImportError:
    try:
        from crewai_tools import tool
        _HAS_CREWAI = True
    except ImportError:
        _HAS_CREWAI = False
        # Graceful stub
        def tool(name=None, description=None):  # type: ignore
            def decorator(fn):
                return fn
            return decorator


BASE_URL = "https://agentcrush.xyz"
USER_AGENT = "agentcrush-crewai/0.1.0"


def _get(path: str) -> Any:
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def _post(path: str, payload: Any) -> Any:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=data,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


@tool("AgentCrush Agent Lookup")
def agentcrush_lookup(handle: str) -> str:
    """
    Look up an AI agent in the AgentCrush evidence-ranked index.
    Returns rank, trust score (0-100), tier, GitHub stats, weekly delta, and evidence breakdown.
    Input: agent handle (e.g. 'crewai', '@aixbt_agent', 'virtuals_io').
    Use this to verify an agent's reputation, check its evidence tier, or get its composite score.
    """
    h = handle.lstrip("@").lower().strip()
    try:
        data = _get(f"/api/agent/{h}/llm-summary")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return f"Agent @{h} not found in AgentCrush index. Check agentcrush.xyz/rankings"
        return f"Error fetching agent: {e}"
    try:
        trust = _get(f"/api/agent/{h}/trust")
        data["trust"] = trust
    except Exception:
        pass
    return json.dumps(data, indent=2)


@tool("AgentCrush Agent Search")
def agentcrush_search(query: str) -> str:
    """
    Search the AgentCrush AI agent economy index.
    Input: search query (e.g. 'payment agent', 'ERC-8004 identity', 'autonomous trading').
    Returns a ranked list of matching agents with scores and evidence tiers.
    Use this to find agents by capability, protocol support, or use-case.
    """
    try:
        resp = _post("/api/mcp/v1", {
            "method": "tools/call",
            "params": {"name": "search_agents", "arguments": {"query": query, "limit": 10}},
        })
        content = resp.get("result", {}).get("content", [{}])
        return content[0].get("text") or json.dumps(resp)
    except Exception as e:
        return f"Search error: {e}"


@tool("AgentCrush Ecosystem Trends")
def agentcrush_trends() -> str:
    """
    Get current AI agent ecosystem trends from the AgentCrush index.
    Returns: total indexed agents, top weekly movers (up/down), category breakdown,
    and protocol adoption signals (x402, ERC-8004, MCP, A2A).
    Use this for ecosystem-level questions or to understand which agents are gaining traction.
    No input required.
    """
    try:
        data = _get("/api/trends/summary")
        return json.dumps(data, indent=2)
    except Exception as e:
        return f"Trends error: {e}"


@tool("AgentCrush Top Agents")
def agentcrush_top_agents(category: Optional[str] = None) -> str:
    """
    Get top-ranked AI agents from the AgentCrush index.
    Optional input: category name — 'developer', 'tokenized', 'service', or 'model_family'.
    Returns the top 20 agents with scores, ranks, and weekly deltas.
    Use this to understand which agents lead each category.
    """
    args: Any = {"limit": 20}
    if category:
        args["category"] = category
    try:
        resp = _post("/api/mcp/v1", {
            "method": "tools/call",
            "params": {"name": "get_top_agents", "arguments": args},
        })
        content = resp.get("result", {}).get("content", [{}])
        return content[0].get("text") or json.dumps(resp)
    except Exception as e:
        return f"Top agents error: {e}"


# Convenience list for agent initialization
AGENTCRUSH_TOOLS = [
    agentcrush_lookup,
    agentcrush_search,
    agentcrush_trends,
    agentcrush_top_agents,
]
