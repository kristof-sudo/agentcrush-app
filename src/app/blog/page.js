'use client'

import Link from 'next/link'
import { useState } from 'react'

const POSTS = [
  {
    slug: 'ghost-index-first-month',
    category: 'Findings',
    image: '/og-ghost-index-first-month.png',
    imageAlt: 'The Ghost Index: 84% of indexed AI agents are unreachable — AgentCrush',
    title: 'The Ghost Index: 84% of indexed AI agents are unreachable',
    date: 'June 26, 2026',
    summary:
      'We ran nightly liveness checks on 1,354 indexed agents for three weeks. Only 16.2% answered. Here is what the first Ghost Index snapshot reveals about agent durability — and what separates the live ones from the ghosts.',
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

const TABS = ['All', 'Findings', 'Updates']

const CATEGORY_COLORS = {
  Findings: '#e91e80',
  Updates: '#a78bfa',
  'Weekly Digest': '#00d4ff',
}

export default function BlogIndexPage() {
  const [active, setActive] = useState('All')
  const filtered = active === 'All' ? POSTS : POSTS.filter((p) => p.category === active)

  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/70 mb-2">
          Blog
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Notes from the build
        </h1>
        <p className="mt-2 text-sm text-white/40 leading-relaxed">
          Field notes on the agent economy, x402 commerce, and building AgentCrush.
        </p>
      </div>

      {/* Weekly Digest — featured */}
      <Link
        href="/weekly"
        className="group relative block rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/[0.05] px-5 py-6 mb-8 hover:border-[#00d4ff]/50 hover:bg-[#00d4ff]/[0.08] transition-colors overflow-hidden"
      >
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00d4ff]/50" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[#00d4ff]/50" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#00d4ff]/50" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00d4ff]/50" />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#00d4ff] mb-2">
              ◆ Weekly Digest
            </p>
            <p className="text-lg font-bold text-white leading-snug mb-1.5">
              The week in the agent economy
            </p>
            <p className="text-sm text-white/55 leading-relaxed">
              Ranking standings, what shipped, protocol signals — the live index distilled every Sunday. The fastest way to stay current.
            </p>
          </div>
          <span className="shrink-0 rounded border border-[#00d4ff]/40 bg-[#00d4ff]/10 px-3 py-1.5 font-mono text-xs font-bold text-[#00d4ff] group-hover:bg-[#00d4ff]/20 transition-colors">
            Latest issue →
          </span>
        </div>
      </Link>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`rounded-full px-3 py-1 text-xs font-mono transition-colors border ${
              active === tab
                ? 'border-[#e91e80]/60 bg-[#e91e80]/10 text-[#e91e80]'
                : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:text-white/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-white/30 py-8">No posts in this category yet.</p>
      )}

      <div className="space-y-6">
        {filtered.map((post) => (
          <article
            key={post.slug}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-colors"
          >
            <Link href={`/blog/${post.slug}`} className="block">
              <img src={post.image} alt={post.imageAlt} className="w-full h-auto" />
            </Link>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-2">
                <time className="text-xs font-mono text-white/25">{post.date}</time>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    color: CATEGORY_COLORS[post.category] || '#a78bfa',
                    borderColor: `${CATEGORY_COLORS[post.category] || '#a78bfa'}33`,
                    background: `${CATEGORY_COLORS[post.category] || '#a78bfa'}10`,
                  }}
                >
                  {post.category}
                </span>
              </div>
              <h2 className="text-base font-semibold text-white leading-snug mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-[#e91e80] transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-white/45 leading-relaxed mb-4">{post.summary}</p>
              <Link href={`/blog/${post.slug}`} className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors">
                Read →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Data downloads */}
      <div className="mt-12 rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Data</p>
        <p className="text-xs text-white/35 leading-relaxed mb-3">
          The rankings and signals described in these posts are machine-readable via MCP and x402.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/developers#mcp" className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors">
            MCP tools →
          </Link>
          <Link href="/developers#api" className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors">
            REST API →
          </Link>
          <Link href="/methodology" className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors">
            Methodology →
          </Link>
        </div>
      </div>

    </main>
  )
}
