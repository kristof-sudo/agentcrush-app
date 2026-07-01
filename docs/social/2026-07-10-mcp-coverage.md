# Social copy — MCP coverage gap (2026-07-10)

Blog post: https://agentcrush.xyz/blog/mcp-coverage
OG image: use dynamic `/api/og?title=MCP+coverage+gap` (auto-generated) — or Kris creates og-mcp-coverage.png and the metadata is updated.

---

## X thread (5 tweets)

**Tweet 1 (hook)**
MCP servers in our index: 100% alive.

Every agent in the index overall: 58.8% alive.

That 41-point gap isn't a story about MCP quality. It's a story about selection.

🧵

**Tweet 2 (the selection effect)**
We seeded 15 MCP servers in June. They were picked because they had independent corroboration — GitHub stars, multi-registry presence, active commit history.

Those same signals predict operational health.

We didn't index any server that went dark. So of course the ones we indexed are alive.

**Tweet 3 (the gap)**
The MCP ecosystem has hundreds of servers across public registries.

We track 15.

That gap isn't a verdict on the other servers. It's a coverage roadmap. The evidence bar exists so that when we say "this server ranks #3," there's enough data to back it up.

**Tweet 4 (what this means for MCP builders)**
If you ship an MCP server and want it in the index, three signals matter:

→ Active GitHub commits (within 90 days)
→ Tool count ≥ 5
→ Listed on at least 2 public registries

Hit those and the B8 ingestion pipeline picks you up on its next run.

**Tweet 5 (CTA)**
Full writeup on the selection effect, the scoring methodology, and why we expect the 100% liveness rate to come down as coverage expands:

agentcrush.xyz/blog/mcp-coverage

MCP server rankings: agentcrush.xyz/rankings/mcp-servers

---

## Farcaster cast (first-person founder voice)

Published MCP server rankings in June. Every server in the list: alive.

The Ghost Index overall: 58.8%.

Wrote about why the gap is a selection effect, not an infrastructure story — and what the path looks like for MCP server operators who want to appear in the ranked list.

agentcrush.xyz/blog/mcp-coverage

---

## Notes for Kris

- The dynamic OG image at `/api/og?title=MCP+coverage+gap` is already wired in. Optionally create `og-mcp-coverage.png` for a custom image and update the metadata in page.js to use `/og-mcp-coverage.png` instead.
- Best posting time: Friday 8–10am ET (July 10 is a Friday).
- The 15 MCP server count comes from STATE.md "MCP servers indexed | 15" — confirm this hasn't changed by the time you post.
- The 58.8% overall Ghost Index figure: verify at /api/ghost-index/v1 before posting. The +0.4%/7d trend means it may be 59–60% by July 10.
- The blog index bug fix is bundled in this PR: the agent-liveness post (July 3) was not appearing in /blog because two POSTS objects were accidentally merged. Both now appear as separate entries.
- Post URL: /blog/mcp-coverage.
