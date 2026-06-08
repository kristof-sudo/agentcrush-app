/**
 * /cite — How to cite AgentCrush data.
 *
 * Press-ready one-pager. Reply template for any journalist / researcher
 * / data-team query. License, snapshot URLs, fields, BibTeX, contact.
 */

import Link from 'next/link'

export const metadata = {
  title: 'Citing AgentCrush — license, data, BibTeX · AgentCrush',
  description: 'How to cite AgentCrush in articles, papers, and datasets. CC-BY-4.0. Daily snapshots. Auditable methodology. Stable URLs. HuggingFace dataset. BibTeX provided.',
  alternates: { canonical: 'https://agentcrush.xyz/cite' },
  openGraph: {
    title: 'Citing AgentCrush',
    description: 'License, data URLs, methodology, BibTeX — everything you need to cite our rankings.',
    url: 'https://agentcrush.xyz/cite',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const BIBTEX = `@misc{agentcrush2026,
  title        = {{AgentCrush: The Evidence-Ranked Index of the AI Agent Economy}},
  author       = {{Patyi, Kristof and the AgentCrush team}},
  year         = {2026},
  url          = {https://agentcrush.xyz},
  note         = {Live methodology at https://agentcrush.xyz/methodology. Daily snapshots CC-BY-4.0. HuggingFace dataset: https://huggingface.co/datasets/AgentCrush/agents-index.},
}`

export default function CitePage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
        <span className="mx-2 text-white/15">/</span>
        Cite
      </p>

      <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
        For journalists, researchers, data teams
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-3">
        Citing AgentCrush
      </h1>
      <p className="text-sm text-white/55 leading-relaxed">
        AgentCrush data is freely usable. Methodology is published and auditable.
        Snapshots are stable. Here&apos;s everything you need to cite us cleanly in
        an article, paper, dataset, or product.
      </p>

      {/* ── License ── */}
      <section className="mt-10 mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">License</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">CC-BY-4.0</span>
            <span className="text-sm font-bold text-white">Creative Commons Attribution 4.0</span>
          </div>
          <p className="text-sm text-white/55 leading-relaxed">
            Use AgentCrush data for any purpose — including commercial — provided you credit{' '}
            <code className="font-mono text-xs bg-white/[0.06] text-white/80 rounded px-1.5 py-0.5">AgentCrush</code>{' '}
            and link to the relevant page. No paywall, no API key required.
          </p>
        </div>
      </section>

      {/* ── Stable data URLs ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Stable data URLs</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>What</span>
            <span className="text-right">URL</span>
          </div>
          {[
            { label: 'Ghost Index (daily liveness)', url: '/api/ghost-index/v1' },
            { label: 'Model family ranking (v1.4)',  url: '/api/model-families/v1' },
            { label: 'Per-agent trust evaluation',   url: '/api/trust/evaluate?handle=<handle>' },
            { label: 'Per-agent LLM summary',         url: '/api/agent/<handle>/llm-summary' },
            { label: 'Ecosystem trends summary',     url: '/api/trends/summary' },
            { label: 'Daily snapshots (bulk JSONL)', url: 'https://huggingface.co/datasets/AgentCrush/agents-index', external: true },
            { label: 'Per-week digest',              url: '/weekly/<YYYY-WNN>' },
            { label: 'Per-agent profile page',       url: '/agent/<handle>' },
          ].map(({ label, url, external }) => (
            <div key={url} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 items-center border-b border-white/[0.04] last:border-b-0">
              <span className="text-xs text-white/65">{label}</span>
              <code className="text-[11px] font-mono text-[#00d4ff]/70 text-right break-all">
                {external ? (
                  <a href={url} target="_blank" rel="noopener" className="hover:text-[#00d4ff]">{url.replace('https://', '')} ↗</a>
                ) : (
                  url
                )}
              </code>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/35 mt-3">
          All endpoints CORS-open, no auth required. Cache headers: 1h for snapshots, no-cache for live computes.
        </p>
      </section>

      {/* ── BibTeX ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">BibTeX</h2>
        <pre className="rounded-lg border border-white/[0.07] bg-[#08080c] overflow-x-auto px-4 py-4 text-[11px] leading-relaxed text-white/70 font-mono">
          <code>{BIBTEX}</code>
        </pre>
      </section>

      {/* ── Inline citation ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Inline citation (article / blog post)</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
          <p className="text-xs font-mono text-white/30 mb-2">Example wording</p>
          <p className="text-sm text-white/65 leading-relaxed italic">
            &ldquo;According to AgentCrush&apos;s Ghost Index, 17.7% of the 1,359 AI agents
            it tracks showed observable activity in the last 30 days
            (<a href="https://agentcrush.xyz/ghost-index" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2 not-italic">agentcrush.xyz/ghost-index</a>, accessed YYYY-MM-DD).&rdquo;
          </p>
        </div>
        <p className="text-[11px] text-white/35 mt-3">
          For papers: pair the BibTeX entry with the access date and the methodology URL{' '}
          <Link href="/methodology" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">agentcrush.xyz/methodology</Link>.
        </p>
      </section>

      {/* ── Methodology auditability ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Auditable methodology</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 space-y-3">
          <p className="text-sm text-white/65 leading-relaxed">
            Every ranking score is produced by a published Postgres view. Weights, evidence-ready rules, and confidence tiers are in the SQL.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/methodology" className="rounded border border-white/15 bg-white/[0.025] px-3 py-1.5 text-[11px] font-mono text-white/70 hover:text-white hover:border-white/30 transition-colors">Methodology hub →</Link>
            <Link href="/methodology/views" className="rounded border border-[#00d4ff]/30 bg-[#00d4ff]/[0.05] px-3 py-1.5 text-[11px] font-mono text-[#00d4ff]/80 hover:text-[#00d4ff] hover:border-[#00d4ff]/50 transition-colors">SQL views →</Link>
            <a href="https://github.com/kristof-sudo/agentcrush-app/tree/main/migrations" target="_blank" rel="noopener" className="rounded border border-white/15 bg-white/[0.025] px-3 py-1.5 text-[11px] font-mono text-white/70 hover:text-white hover:border-white/30 transition-colors">All migrations on GitHub ↗</a>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Contact</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
          <p className="text-sm text-white/65 leading-relaxed">
            Press, research, or data questions: <a href="mailto:kristof@patyi.co" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">kristof@patyi.co</a>
          </p>
          <p className="text-sm text-white/65 leading-relaxed mt-1">
            Or on X: <a href="https://x.com/agentcrush_xyz" target="_blank" rel="noopener" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">@agentcrush_xyz</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/methodology" className="hover:text-white/70 transition-colors">← Methodology</Link>
        <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index</Link>
        <Link href="/rankings" className="hover:text-white/70 transition-colors">Rankings</Link>
        <a href="https://huggingface.co/datasets/AgentCrush/agents-index" target="_blank" rel="noopener" className="hover:text-white/70 transition-colors text-[#00d4ff]/50">HF dataset →</a>
      </div>

    </main>
  )
}
