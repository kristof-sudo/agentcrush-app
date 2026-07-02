/**
 * /blog — index of posts.
 *
 * Server component with ISR: posts dated in the future stay hidden until
 * their publish date (single POSTS list, date-gated hourly), so drafts for
 * a future Friday can merge early without publishing early.
 */

import BlogIndex from './BlogIndex'

export const revalidate = 3600


const POSTS = [
  {
    slug: 'mcp-coverage',
    category: 'Findings',
    image: '/api/og?title=MCP+coverage+gap',
    imageAlt: 'MCP servers are 100% alive — AgentCrush',
    title: 'MCP servers are 100% alive. Why we only index 15.',
    date: 'July 10, 2026',
    summary:
      'Every MCP server in the AgentCrush index responds to a live endpoint probe. The overall rate is 58.8%. The difference is selection, not infrastructure — and the gap between 15 indexed and hundreds in the wild is the real story.',
  },
  {
    slug: 'anchored-on-chain',
    category: 'Product',
    image: '/api/og?title=Don%27t+trust+our+rankings.+Verify+them.&kicker=AgentCrush&subtitle=Every+daily+snapshot+is+anchored+on+Base.',
    imageAlt: "Don't trust our rankings. Verify them. — AgentCrush",
    title: "Don't trust our rankings. Verify them.",
    date: 'June 29, 2026',
    summary:
      'Every agent ranking asks you to trust the database. Ours you can check: every daily snapshot is hashed into a Merkle root, chained day-to-day, and anchored on Base — a permanent record no one can rewrite, that anyone can recompute and verify.',
  },
  {
    slug: 'agent-liveness',
    category: 'Findings',
    image: '/api/og?title=Three+tiers+of+alive',
    imageAlt: 'Three tiers of alive — AgentCrush',
    title: 'Three tiers of alive: what the corrected Ghost Index reveals',
    date: 'July 3, 2026',
    summary:
      'We initially published 16.2% of indexed agents alive. The corrected figure is 58.8%. The gap between those two numbers separates endpoint health from recent activity from evidence-ranked verification — and that distinction is the most useful data in the index.',
  },
  {
    slug: 'liveness-is-layer-zero',
    category: 'Findings',
    image: '/og-liveness-is-layer-zero.png',
    imageAlt: 'Liveness is layer zero of the agent trust stack — AgentCrush',
    title: 'Everyone says "agent trust." Almost nobody measures the first signal.',
    date: 'June 26, 2026',
    summary:
      'This week the ecosystem agreed trust is the frontier. But trust has a layer beneath reputation: is the agent even alive? Across 1,387 indexed agents, only 58.8% show signs of life — 4 in 10 are ghosts.',
  },
  {
    slug: 'zero-interop',
    category: 'Findings',
    image: '/og-zero-interop.png',
    imageAlt: 'Nobody is multi-protocol yet — AgentCrush',
    title: 'Nobody is multi-protocol yet: what 1,359 agents actually support',
    date: 'June 19, 2026',
    summary:
      'We scanned 1,359 indexed agents for support across the four live protocol rails — ERC-8004, x402, A2A, and MCP. Zero support three or more. One supports two. The interoperability gap, measured.',
  },
  {
    slug: 'crawlers-vs-wallets',
    category: 'Findings',
    image: '/og-crawlers-vs-wallets.png',
    imageAlt: 'Crawlers vs. wallets — AgentCrush',
    title: "Crawlers vs. wallets: what our first day of payment data says about the agent economy",
    date: 'June 12, 2026',
    summary:
      'We turned on payment telemetry: 1,376 price quotes served to machines in half a day, zero payments. A taxonomy of the machines that window-shop, where the real wallets spend, and the stat we almost published wrong.',
  },
  {
    slug: 'agent-payments-stack-live',
    category: 'Findings',
    image: '/og-agent-payments-stack.png',
    imageAlt: 'The Agent Payments Stack, Live — AgentCrush',
    title: 'The Agent Payments Stack, Live',
    date: 'May 26, 2026',
    summary:
      'Keyrock mapped 6 layers of agent payments infrastructure. We indexed all 38 projects, scored them by stack depth, and now track it live. Coinbase spans 5/6 layers. Governance is the hardest layer to clone.',
  },
  {
    slug: 'agent-commerce-readiness-three-audits',
    category: 'Findings',
    image: '/og-three-audits.png',
    imageAlt: 'The state of agent commerce readiness: three audits, three shapes of unfinished',
    title: 'The state of agent commerce readiness: three audits, three shapes of unfinished',
    date: 'May 13, 2026',
    summary:
      'We ran the Agent Commerce Readiness Audit against aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams in agent commerce are 80% built and 20% published.',
  },
  {
    slug: 'first-cross-protocol-agent',
    category: 'Findings',
    image: '/og-cross-protocol-agent.png',
    imageAlt: 'First cross-protocol agent indexed: CrewAI on ERC-8004 and x402',
    title: 'The first cross-protocol agent: CrewAI on ERC-8004 and x402',
    date: 'May 8, 2026',
    summary:
      'A worked example of an agent active on two protocol surfaces at once — CrewAI registered on ERC-8004 (Base, token #17997) with x402_supported: true. What AgentCrush sees when we cross the data.',
  },
  {
    slug: 'x402-discovery-postmortem',
    category: 'Updates',
    image: '/og-x402-postmortem.png',
    imageAlt: "Working x402 payment isn't the same as working x402 discovery",
    title: "Working x402 payment isn't the same as working x402 discovery",
    date: 'April 30, 2026',
    summary:
      "Notes from getting AgentCrush indexed on Agentic.Market: the boring metadata gotchas that almost stopped me, and the checklist that finally worked.",
  },
]


function published() {
  const now = Date.now()
  return POSTS.filter((p) => {
    const t = Date.parse(p.date)
    return Number.isNaN(t) ? true : t <= now
  })
}

export default function BlogIndexPage() {
  return <BlogIndex posts={published()} />
}
