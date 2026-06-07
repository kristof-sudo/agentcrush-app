"""
AgentCrush Python client — evidence-ranked AI agent economy index.

https://agentcrush.xyz
"""

from agentcrush._api import (
    get_agent,
    get_trust,
    get_changes,
    get_badge_url,
    get_trends,
    get_top_movers,
    get_ecosystem_summary,
    search_agents,
    get_top_agents,
)

__version__ = "0.1.0"
__all__ = [
    "get_agent",
    "get_trust",
    "get_changes",
    "get_badge_url",
    "get_trends",
    "get_top_movers",
    "get_ecosystem_summary",
    "search_agents",
    "get_top_agents",
]
