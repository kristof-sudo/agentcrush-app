"""
AgentCrush LlamaIndex Reader + Tool

Provides LlamaIndex access to the AgentCrush agent economy index.

Install:
  pip install llama-index agentcrush

Usage as a reader (for RAG):
  from agentcrush.integrations.llamaindex import AgentCrushReader

  reader = AgentCrushReader()

  # Load top agents as LlamaIndex Documents
  docs = reader.load_data(query="top developer agents", limit=20)

  # Build index
  from llama_index.core import VectorStoreIndex
  index = VectorStoreIndex.from_documents(docs)
  qe = index.as_query_engine()
  qe.query("Which developer agent has the highest trust score?")

Usage as a tool (for agents):
  from agentcrush.integrations.llamaindex import AgentCrushToolSpec

  tool_spec = AgentCrushToolSpec()
  tools = tool_spec.to_tool_list()

  from llama_index.core.agent import ReActAgent
  from llama_index.llms.openai import OpenAI
  agent = ReActAgent.from_tools(tools, llm=OpenAI(model="gpt-4"), verbose=True)
  agent.chat("What's the trust score of the ElizaOS agent?")

For standalone use: pip install agentcrush
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

try:
    from llama_index.core.readers.base import BaseReader
    from llama_index.core.schema import Document
    from llama_index.core.tools.function_tool import FunctionTool
    _HAS_LLAMAINDEX = True
except ImportError:
    _HAS_LLAMAINDEX = False
    BaseReader = object  # type: ignore
    Document = dict  # type: ignore
    FunctionTool = None  # type: ignore


BASE_URL = "https://agentcrush.xyz"
USER_AGENT = "agentcrush-llamaindex/0.1.0"


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


def _agent_to_document(agent: Dict) -> "Document":
    """Convert an agent dict to a LlamaIndex Document."""
    handle = agent.get("handle", "unknown")
    name = agent.get("name", handle)
    text_parts = [
        f"# {name} (@{handle})",
        f"Category: {agent.get('category', 'unknown')}",
        f"Tier: {agent.get('tier', 'unknown')}",
        f"Score: {agent.get('score', 'N/A')}",
        f"Rank: #{agent.get('rank', 'N/A')}",
    ]
    if agent.get("description"):
        text_parts.append(f"\n{agent['description']}")
    if agent.get("github_stars"):
        text_parts.append(f"GitHub stars: {agent['github_stars']:,}")
    if agent.get("follower_count"):
        text_parts.append(f"Followers: {agent['follower_count']:,}")
    if agent.get("weekly_delta"):
        delta = agent["weekly_delta"]
        text_parts.append(f"Weekly rank change: {'↑' if delta > 0 else '↓'}{abs(delta)}")
    if agent.get("erc8004_verified"):
        text_parts.append("ERC-8004 identity: verified")
    if agent.get("x402_enabled"):
        text_parts.append("x402 payments: enabled")

    metadata = {
        "handle": handle,
        "source": "agentcrush.xyz",
        "category": agent.get("category"),
        "tier": agent.get("tier"),
        "score": agent.get("score"),
        "rank": agent.get("rank"),
        "url": f"https://agentcrush.xyz/rankings/{agent.get('category','developer')}/{handle}",
    }

    if _HAS_LLAMAINDEX and Document is not dict:
        return Document(text="\n".join(text_parts), metadata=metadata, id_=f"agentcrush-{handle}")
    return {"text": "\n".join(text_parts), "metadata": metadata}


class AgentCrushReader(BaseReader):
    """
    LlamaIndex reader for the AgentCrush agent economy index.
    Loads agent data as Documents for use in RAG pipelines.
    """

    def load_data(
        self,
        query: Optional[str] = None,
        limit: int = 50,
        category: Optional[str] = None,
        handles: Optional[List[str]] = None,
    ) -> List["Document"]:
        """
        Load AgentCrush data as LlamaIndex Documents.

        Args:
            query: Search query (optional — loads top agents if not provided)
            limit: Max number of agents to load
            category: Filter by category ('developer', 'tokenized', 'service', 'model_family')
            handles: Load specific agents by handle list

        Returns:
            List of LlamaIndex Documents
        """
        if handles:
            docs = []
            for handle in handles:
                try:
                    data = _get(f"/api/agent/{handle.lstrip('@').lower()}/llm-summary")
                    agent = data.get("agent", data)
                    docs.append(_agent_to_document(agent))
                except Exception:
                    pass
            return docs

        if query:
            resp = _post("/api/mcp/v1", {
                "method": "tools/call",
                "params": {"name": "search_agents", "arguments": {"query": query, "limit": limit}},
            })
            content = resp.get("result", {}).get("content", [{}])
            text = content[0].get("text") if content else None
            agents = json.loads(text) if text else []
            if isinstance(agents, dict):
                agents = agents.get("agents", agents.get("results", []))
        else:
            args: Dict[str, Any] = {"limit": limit}
            if category:
                args["category"] = category
            resp = _post("/api/mcp/v1", {
                "method": "tools/call",
                "params": {"name": "get_top_agents", "arguments": args},
            })
            content = resp.get("result", {}).get("content", [{}])
            text = content[0].get("text") if content else None
            agents = json.loads(text) if text else []
            if isinstance(agents, dict):
                agents = agents.get("agents", agents.get("results", []))

        return [_agent_to_document(a) for a in (agents or [])]


# ── Tool spec ─────────────────────────────────────────────────────────────────

class AgentCrushToolSpec:
    """LlamaIndex tool spec — wraps AgentCrush API functions as LlamaIndex tools."""

    def lookup_agent(self, handle: str) -> str:
        """
        Look up an AI agent in the AgentCrush index.
        Returns rank, trust score, tier, GitHub stats, and evidence breakdown.
        handle: agent handle (e.g. 'crewai' or '@aixbt_agent')
        """
        h = handle.lstrip("@").lower().strip()
        try:
            data = _get(f"/api/agent/{h}/llm-summary")
            try:
                data["trust"] = _get(f"/api/agent/{h}/trust")
            except Exception:
                pass
            return json.dumps(data, indent=2)
        except urllib.error.HTTPError as e:
            return f"Agent @{h} not found (HTTP {e.code})"

    def search_agents(self, query: str, limit: int = 10) -> str:
        """
        Search the AgentCrush agent economy index.
        query: search terms (e.g. 'payment agent', 'identity', 'autonomous trading')
        limit: max results (default 10)
        """
        resp = _post("/api/mcp/v1", {
            "method": "tools/call",
            "params": {"name": "search_agents", "arguments": {"query": query, "limit": limit}},
        })
        content = resp.get("result", {}).get("content", [{}])
        return content[0].get("text") or json.dumps(resp)

    def get_ecosystem_trends(self) -> str:
        """
        Get current AI agent ecosystem trends.
        Returns indexed agent counts, top weekly movers, category mix, protocol adoption.
        """
        return json.dumps(_get("/api/trends/summary"), indent=2)

    def to_tool_list(self) -> list:
        """Return all tools as a LlamaIndex FunctionTool list."""
        if not _HAS_LLAMAINDEX or FunctionTool is None:
            raise ImportError("llama-index is required: pip install llama-index")
        return [
            FunctionTool.from_defaults(fn=self.lookup_agent),
            FunctionTool.from_defaults(fn=self.search_agents),
            FunctionTool.from_defaults(fn=self.get_ecosystem_trends),
        ]
