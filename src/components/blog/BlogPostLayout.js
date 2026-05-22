'use client'

import Link from 'next/link'
import { useState } from 'react'

export function ShareCard({ url, title }) {
  const [copied, setCopied] = useState(false)
  const full = `https://agentcrush.xyz${url}`

  function copy() {
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(full)}`

  return (
    <div className="mt-12 rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Share</p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={copy}
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors border border-white/[0.08] rounded px-3 py-1.5"
        >
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors border border-white/[0.08] rounded px-3 py-1.5"
        >
          Share on X →
        </a>
      </div>
    </div>
  )
}

export function CitationBlock({ slug, title, date, sources }) {
  const url = `https://agentcrush.xyz/blog/${slug}`
  return (
    <div className="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
        Cite / Sources
      </p>
      <p className="text-xs font-mono text-white/30 leading-relaxed mb-3 break-all">
        AgentCrush. &ldquo;{title}.&rdquo; {date}. {url}
      </p>
      {sources && sources.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/20 mb-2">Data sources</p>
          {sources.map((s) => (
            <div key={s.label} className="flex flex-wrap items-baseline gap-2">
              <span className="text-[10px] font-mono text-white/30">{s.label}</span>
              {s.href ? (
                <Link href={s.href} className="text-[10px] font-mono text-violet-400/50 hover:text-violet-300 transition-colors">
                  {s.href.startsWith('/') ? `agentcrush.xyz${s.href}` : s.href} →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function BlogJsonLd({ slug, title, summary, date, imageUrl }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: summary,
    url: `https://agentcrush.xyz/blog/${slug}`,
    datePublished: date,
    image: imageUrl ? `https://agentcrush.xyz${imageUrl}` : 'https://agentcrush.xyz/og-default.png',
    author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    isPartOf: { '@type': 'Blog', name: 'AgentCrush Blog', url: 'https://agentcrush.xyz/blog' },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  )
}
