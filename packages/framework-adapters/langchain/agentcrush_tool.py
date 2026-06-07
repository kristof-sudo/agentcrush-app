"""
AgentCrush LangChain Tool

Gives LangChain agents access to the AgentCrush agent economy index.
Zero external dependencies beyond LangChain itself.

Install:
  pip install langchain agentcrush

Usage:
  from agentcrush.integrations.langchain import AgentCrushTool, AgentCrushToolkit

  # Single tool (agent lookup)
  tools = [AgentCrushTool()]

  # Full toolkit (all capabilities)
  tools = AgentCrushToolkit().get_tools()

  # Use with any LangChain agent
  from langchain.agents import initialize_agent, AgentType
  from langchain_openai import ChatOpenAI

  llm = ChatOpenAI(model="gpt-4")
  agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION)
  agent.run("What is the trust score of the crewai agent?")

For standalone use without LangChain, see: pip install agentcrush
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Type

try:
    from langchain_core.tools import BaseTool
    from langchain_core.callbacks import CallbackManagerForToolRun
    from pydantic import BaseModel, Field
    _HAS_LANGCHAIN = True
except ImportError:
    _HAS_LANGCHAIN = False
    # Graceful stub — import won't fail but tool won't be usable
    BaseTool = object  # type: ignore
    class BaseModel:  # type: ignore
        pass
    def Field(*a, **kw): return None  # type: ignore


BASE_URL = "https://agentcrush.xyz"
USER_AGENT = "agentcrush-langchain/0.1.0"


def _api_get(path: str) -> Any:
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def _api_post(path: str, payload: Any) -> Any:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=data,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def _normalize(handle: str) -> str:
    return handle.lstrip("@").lower().strip()


# ── Individual tools ──────────────────────────────────────────────────────────

class _AgentLookupInput(BaseModel):
    handle: str = Field(description="Agent handle (e.g. 'crewai' or '@aixbt_agent')")


class AgentCrushLookupTool(BaseTool):
    """Look up a specific AI agent in the AgentCrush index — rank, tier, trust score, and evidence."""

    name: str = "agentcrush_lookup"
    description: str = (
        "Look up a specific AI agent in the AgentCrush agent economy index. "
        "Returns rank, tier, trust score (0-100), GitHub stats, and evidence breakdown. "
        "Use this to verify agent reputation or compare two agents. "
        "Input: agent handle (with or without @)."
    )
    args_schema: Type[BaseModel] = _AgentLookupInput

    def _run(self, handle: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        h = _normalize(handle)
        try:
            agent_data = _api_get(f"/api/agent/{h}/llm-summary")
        except Exception as e:
            return f"Agent @{h} not found: {e}"
        try:
            trust_data = _api_get(f"/api/agent/{h}/trust")
            agent_data["trust"] = trust_data
        except Exception:
            pass
        return json.dumps(agent_data, indent=2)


class _SearchInput(BaseModel):
    query: str = Field(description="Search query (e.g. 'payment agent', 'ERC-8004 identity')")
    limit: int = Field(default=10, description="Number of results (1-50)")


class AgentCrushSearchTool(BaseTool):
    """Search the AgentCrush agent economy index."""

    name: str = "agentcrush_search"
    description: str = (
        "Search the AgentCrush AI agent economy index by name, capability, or keyword. "
        "Returns ranked list of matching agents with scores and tiers. "
        "Use this to discover agents for a specific purpose (e.g. 'payment agents', 'ERC-8004 identity')."
    )
    args_schema: Type[BaseModel] = _SearchInput

    def _run(self, query: str, limit: int = 10, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        try:
            resp = _api_post("/api/mcp/v1", {
                "method": "tools/call",
                "params": {"name": "search_agents", "arguments": {"query": query, "limit": limit}},
            })
            content = resp.get("result", {}).get("content", [{}])
            text = content[0].get("text") if content else None
            return text or json.dumps(resp, indent=2)
        except Exception as e:
            return f"Search failed: {e}"


class _TopAgentsInput(BaseModel):
    limit: int = Field(default=20, description="Number of top agents to return")
    category: Optional[str] = Field(
        default=None,
        description="Filter by category: 'developer', 'tokenized', 'service', 'model_family'"
    )


class AgentCrushTopTool(BaseTool):
    """Get top-ranked AI agents from the AgentCrush index."""

    name: str = "agentcrush_top_agents"
    description: str = (
        "Get the top-ranked AI agents in the AgentCrush index, optionally filtered by category. "
        "Categories: 'developer' (GitHub/OSS agents), 'tokenized' (on-chain token-backed), "
        "'service' (API/infrastructure), 'model_family' (foundation models). "
        "Returns ranked list with scores, weekly deltas, and evidence tiers."
    )
    args_schema: Type[BaseModel] = _TopAgentsInput

    def _run(self, limit: int = 20, category: Optional[str] = None, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        try:
            args: Dict[str, Any] = {"limit": limit}
            if category:
                args["category"] = category
            resp = _api_post("/api/mcp/v1", {
                "method": "tools/call",
                "params": {"name": "get_top_agents", "arguments": args},
            })
            content = resp.get("result", {}).get("content", [{}])
            return content[0].get("text") or json.dumps(resp, indent=2)
        except Exception as e:
            return f"Top agents fetch failed: {e}"


class AgentCrushTrendsTool(BaseTool):
    """Get ecosystem-wide trend signals from AgentCrush."""

    name: str = "agentcrush_trends"
    description: str = (
        "Get current AI agent ecosystem trends from the AgentCrush index. "
        "Returns: total indexed agents, evidence-ranked count, top weekly movers (up/down), "
        "category distribution, and protocol adoption signals (x402, ERC-8004, MCP, A2A). "
        "Use this for ecosystem-level questions."
    )

    def _run(self, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        try:
            data = _api_get("/api/trends/summary")
            return json.dumps(data, indent=2)
        except Exception as e:
            return f"Trends fetch failed: {e}"


# ── Toolkit ───────────────────────────────────────────────────────────────────

class AgentCrushToolkit:
    """Full AgentCrush toolkit — all tools as a list for agent initialization."""

    def get_tools(self) -> List[BaseTool]:
        return [
            AgentCrushLookupTool(),
            AgentCrushSearchTool(),
            AgentCrushTopTool(),
            AgentCrushTrendsTool(),
        ]


# Convenience alias — most common use case
AgentCrushTool = AgentCrushLookupTool
