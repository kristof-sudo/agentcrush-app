"""
agentcrush CLI entry point.

Usage:
  agentcrush top [--limit N] [--category CATEGORY] [--json]
  agentcrush rank <handle> [--json]
  agentcrush trust <handle> [--json]
  agentcrush changes <handle> [--limit N] [--json]
  agentcrush badge <handle>
  agentcrush search "<query>" [--limit N] [--json]
  agentcrush trends [--json]
  agentcrush ecosystem [--json]
"""

import argparse
import json
import sys
from typing import Any

from agentcrush._api import (
    get_agent, get_trust, get_changes, get_badge_url,
    get_trends, get_ecosystem_summary, search_agents, get_top_agents,
    BASE_URL,
)

# ── Colour helpers ──────────────────────────────────────────────────────────

_NO_COLOR = not sys.stdout.isatty()

def _c(code: str, s: str) -> str:
    return s if _NO_COLOR else f"\033[{code}m{s}\033[0m"

bold  = lambda s: _c("1", s)
dim   = lambda s: _c("2", s)
green = lambda s: _c("32", s)
yellow= lambda s: _c("33", s)
red   = lambda s: _c("31", s)
cyan  = lambda s: _c("36", s)
grey  = lambda s: _c("90", s)

def trust_color(score: Any) -> str:
    if score is None: return grey("—")
    n = float(score)
    if n >= 80: return green(str(int(n)))
    if n >= 60: return yellow(str(int(n)))
    return red(str(int(n)))

def delta_arrow(delta: Any) -> str:
    if delta is None or delta == 0: return grey("—")
    n = int(delta)
    return green(f"▲{n}") if n > 0 else red(f"▼{abs(n)}")

def fmt(n: Any, unit: str = "") -> str:
    if n is None: return "—"
    return f"{int(n):,}{' ' + unit if unit else ''}"

# ── Table ────────────────────────────────────────────────────────────────────

def print_table(rows: list, cols: list) -> None:
    if not rows:
        print(grey("  (no results)"))
        return
    header = "  ".join(bold(str(c.get("label", c["key"])).ljust(c.get("w", 20))) for c in cols)
    print(header)
    print(grey("  ".join("─" * c.get("w", 20) for c in cols)))
    for row in rows:
        line = "  ".join(str(row.get(c["key"], "—") or "—")[:c.get("w",20)].ljust(c.get("w",20)) for c in cols)
        print(line)

def print_kv(obj: dict, indent: int = 0) -> None:
    pad = " " * indent
    max_k = max((len(k) for k in obj), default=0)
    for k, v in obj.items():
        val = "—" if v is None else str(v)
        print(f"{pad}{grey(k.ljust(max_k))}  {val}")

# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_top(args: argparse.Namespace) -> None:
    limit = args.limit or 20
    print(grey(f"Fetching top {limit} agents…"), file=sys.stderr)
    data = get_top_agents(limit=limit, category=getattr(args, "category", None))
    if args.json:
        print(json.dumps(data, indent=2)); return
    agents = data if isinstance(data, list) else data.get("agents", data.get("results", []))
    print(f"\n{bold('Top agents')} {grey('· agentcrush.xyz/rankings')}\n")
    print_table(agents, [
        {"key": "rank", "label": "#", "w": 5},
        {"key": "handle", "label": "Handle", "w": 25},
        {"key": "name", "label": "Name", "w": 28},
        {"key": "tier", "label": "Tier", "w": 16},
        {"key": "score", "label": "Score", "w": 8},
    ])
    print()

def cmd_rank(args: argparse.Namespace) -> None:
    handle = args.handle
    print(grey(f"Fetching agent data for {handle}…"), file=sys.stderr)
    try:
        data = get_agent(handle)
    except Exception:
        data = None
    try:
        trust = get_trust(handle)
    except Exception:
        trust = None
    if args.json:
        print(json.dumps({"agent": data, "trust": trust}, indent=2)); return
    if not data:
        print(red(f"Agent @{handle} not found in AgentCrush index."))
        print(dim(f"  Check: agentcrush.xyz/agents/{handle}")); return
    a = data.get("agent", data)
    print(f"\n{bold(a.get('name', handle))}  {grey('@' + handle)}")
    print(dim(f"agentcrush.xyz/rankings/{a.get('category','agent-payments-stack')}/{handle}") + "\n")
    print_kv({
        "Rank": f"#{a['rank']}" if a.get("rank") else "—",
        "Tier": a.get("tier") or a.get("confidence_tier") or "—",
        "Score": fmt(a.get("score")),
        "Category": a.get("category", "—"),
        "Weekly Δ": delta_arrow(a.get("weekly_delta")),
        "GitHub stars": fmt(a.get("github_stars")),
        "Followers": fmt(a.get("follower_count")),
        "Trust score": trust_color(trust.get("score") if trust else None),
        "ERC-8004": green("✓ verified") if a.get("erc8004_verified") else grey("not verified"),
        "x402": green("✓ enabled") if a.get("x402_enabled") else grey("not enabled"),
    })
    if a.get("description"):
        print(f"\n{dim(a['description'][:200])}")
    print()

def cmd_trust(args: argparse.Namespace) -> None:
    handle = args.handle
    print(grey(f"Fetching trust score for {handle}…"), file=sys.stderr)
    data = get_trust(handle)
    if args.json:
        print(json.dumps(data, indent=2)); return
    score = data.get("score") or data.get("trust_score")
    classification = data.get("classification") or data.get("trust_classification", "?")
    print(f"\n{bold('Trust score')} — {cyan('@' + handle)}\n")
    print(f"  Score: {bold(trust_color(score))} / 100  {grey('(' + classification + ')')}")
    if data.get("components"):
        print()
        print_kv(data["components"], indent=2)
    if data.get("delegation_hint"):
        print(f"\n  {dim(data['delegation_hint'])}")
    if data.get("risk_flags"):
        print(f"\n  {yellow('Risk flags:')} {', '.join(data['risk_flags'])}")
    print()

def cmd_changes(args: argparse.Namespace) -> None:
    handle = args.handle
    limit = args.limit or 10
    print(grey(f"Fetching change feed for {handle}…"), file=sys.stderr)
    data = get_changes(handle, limit=limit)
    if args.json:
        print(json.dumps(data, indent=2)); return
    changes = data if isinstance(data, list) else data.get("changes", [])
    print(f"\n{bold('Recent changes')} — {cyan('@' + handle)}\n")
    if not changes:
        print(grey("  No material changes detected in recent snapshots."))
    else:
        for ch in changes[:limit]:
            date = (ch.get("detected_at") or "—")[:10]
            field = (ch.get("field") or ch.get("metric") or "").ljust(18)
            frm = str(ch["from_value"]) if ch.get("from_value") is not None else "—"
            to = str(ch["to_value"]) if ch.get("to_value") is not None else "—"
            arrow = green("▲") if ch.get("direction") == "up" else (red("▼") if ch.get("direction") == "down" else grey("→"))
            print(f"  {grey(date)}  {field} {arrow} {frm} → {to}")
    print()

def cmd_badge(args: argparse.Namespace) -> None:
    handle = args.handle
    styles = ["rank", "mover", "evidence", "trust"]
    if args.json:
        print(json.dumps({s: get_badge_url(handle, style=s) for s in styles}, indent=2)); return
    print(f"\n{bold('Badge URLs')} — {cyan('@' + handle)}\n")
    for style in styles:
        url = get_badge_url(handle, style=style)
        print(f"  {style.ljust(10)} {grey(url)}")
    embed = 'Embed: <img src="URL" alt="AgentCrush rank" />'
    print(f"\n  {dim(embed)}")
    print()

def cmd_search(args: argparse.Namespace) -> None:
    query = " ".join(args.query)
    limit = args.limit or 10
    print(grey(f'Searching for "{query}"…'), file=sys.stderr)
    data = search_agents(query, limit=limit)
    if args.json:
        print(json.dumps(data, indent=2)); return
    results = data if isinstance(data, list) else data.get("agents", data.get("results", []))
    query_label = f'for "{query}"'
    print(f"\n{bold('Search results')} {grey(query_label)}\n")
    if not results:
        print(grey("  No results found."))
    else:
        print_table(results, [
            {"key": "handle", "label": "Handle", "w": 25},
            {"key": "name", "label": "Name", "w": 30},
            {"key": "tier", "label": "Tier", "w": 16},
            {"key": "score", "label": "Score", "w": 8},
        ])
    print()

def cmd_trends(args: argparse.Namespace) -> None:
    print(grey("Fetching ecosystem trend summary…"), file=sys.stderr)
    data = get_trends()
    if args.json:
        print(json.dumps(data, indent=2)); return
    print(f"\n{bold('Ecosystem trends')} {grey('· agentcrush.xyz/trends')}\n")
    if data.get("total_agents") is not None:
        print(f"  Total indexed agents:  {bold(fmt(data['total_agents']))}")
    if data.get("evidence_ranked") is not None:
        print(f"  Evidence-ranked:       {fmt(data['evidence_ranked'])}")
    print()
    if data.get("top_movers_up"):
        print(bold("Top movers ↑ this week"))
        print_table(data["top_movers_up"][:5], [
            {"key": "handle", "label": "Handle", "w": 25},
            {"key": "weekly_delta", "label": "Δ rank", "w": 8},
            {"key": "score", "label": "Score", "w": 8},
        ])
        print()
    if data.get("category_mix"):
        print(bold("Category breakdown"))
        for cat, count in data["category_mix"].items():
            print(f"  {cat.ljust(28)} {fmt(count)}")
        print()

def cmd_ecosystem(args: argparse.Namespace) -> None:
    print(grey("Fetching ecosystem summary…"), file=sys.stderr)
    data = get_ecosystem_summary()
    if args.json:
        print(json.dumps(data, indent=2)); return
    print(f"\n{bold('AgentCrush ecosystem summary')} {grey('· agentcrush.xyz')}\n")
    for k in ["headline", "total_agents", "top_protocol", "trend_direction", "updated_at"]:
        if data.get(k) is not None:
            print(f"  {grey(k.ljust(18))}  {data[k]}")
    if data.get("summary"):
        print(f"\n{dim(data['summary'])}")
    print()

# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="agentcrush",
        description="AgentCrush agent economy index CLI  —  agentcrush.xyz",
    )
    parser.add_argument("--version", action="version", version="agentcrush 0.1.0")
    sub = parser.add_subparsers(dest="command")

    def add_json(p: argparse.ArgumentParser) -> None:
        p.add_argument("--json", action="store_true", help="Output raw JSON")

    p_top = sub.add_parser("top", help="Top ranked agents")
    p_top.add_argument("--limit", type=int, default=20)
    p_top.add_argument("--category", default=None)
    add_json(p_top)

    p_rank = sub.add_parser("rank", help="Rankings + evidence for one agent")
    p_rank.add_argument("handle")
    add_json(p_rank)

    p_trust = sub.add_parser("trust", help="Composite trust score (0-100)")
    p_trust.add_argument("handle")
    add_json(p_trust)

    p_changes = sub.add_parser("changes", help="Recent material changes")
    p_changes.add_argument("handle")
    p_changes.add_argument("--limit", type=int, default=10)
    add_json(p_changes)

    p_badge = sub.add_parser("badge", help="Badge URLs for embedding")
    p_badge.add_argument("handle")
    p_badge.add_argument("--json", action="store_true")

    p_search = sub.add_parser("search", help="Search the agent index")
    p_search.add_argument("query", nargs="+")
    p_search.add_argument("--limit", type=int, default=10)
    add_json(p_search)

    p_trends = sub.add_parser("trends", help="Weekly ecosystem trend summary")
    add_json(p_trends)

    p_eco = sub.add_parser("ecosystem", help="Full LLM-optimized ecosystem summary")
    add_json(p_eco)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return

    cmds = {
        "top": cmd_top, "rank": cmd_rank, "trust": cmd_trust,
        "changes": cmd_changes, "badge": cmd_badge, "search": cmd_search,
        "trends": cmd_trends, "ecosystem": cmd_ecosystem,
    }
    try:
        cmds[args.command](args)
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(red(f"Error: {e}"), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
