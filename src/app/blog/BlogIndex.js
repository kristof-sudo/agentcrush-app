'use client'

import Link from 'next/link'
import { useState } from 'react'

const TABS = ['All', 'Findings', 'Updates']

const CATEGORY_COLORS = {
  Findings: '#e91e80',
  Updates: '#a78bfa',
  'Weekly Digest': '#00d4ff',
}

export default function BlogIndex({ posts = [] }) {
  const [active, setActive] = useState('All')
  const filtered = active === 'All' ? posts : posts.filter((p) => p.category === active)

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
