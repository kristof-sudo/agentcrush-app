/**
 * /dataset — The AgentCrush Dataset
 *
 * Evergreen researcher-facing page: what the dataset is, how to access
 * the public APIs and oracle/attest endpoints, how to cite it, contact.
 * No new infra. Static ISR page — no auth, no migrations.
 */

import Link from 'next/link'
import { getIndexStats, FLOOR, fmt } from '@/lib/stats'

export const revalidate = 3600

export const metadata = {
  title: 'Dataset · AgentCrush',
  description:
    'Daily snapshots of 1,400+ AI agents, on-chain anchored, methodology-versioned. Access via public REST, MCP, and oracle/attest endpoints. Free, CC-BY-4.0. BibTeX provided.',
  alternates: { canonical: 'https://agentcrush.xyz/dataset' },
  openGraph: {
    title: 'The AgentCrush Dataset',
    description:
      'Daily AI agent snapshots. On-chain anchored. Methodology-versioned. Free public APIs and oracle endpoints for researchers and journalists.',
    url: 'https://agentcrush.xyz/dataset',
    siteName: 'AgentCrush',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The AgentCrush Dataset',
    description: 'Daily AI agent snapshots — on-chain anchored, free public APIs, CC-BY-4.0.',
  },
}

const BIBTEX = `@misc{agentcrush2026,
  title        = {{AgentCrush: The Evidence-Ranked Index of the AI Agent Economy}},
  author       = {{Patyi, Kristof and the AgentCrush team}},
  year         = {2026},
  url          = {https://agentcrush.xyz},
  note         = {Live methodology at https://agentcrush.xyz/methodology.
                  Daily snapshots CC-BY-4.0. Dataset page:
                  https://agentcrush.xyz/dataset.},
}`

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/ghost-index/v1',
    desc: 'Daily liveness index — full history, category breakdown, delta',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/agent-economy/llm-summary',
    desc: 'Machine-readable ecosystem metrics: indexed count, snapshot total, evidence-ranked count',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/trust/evaluate?handle=<handle>',
    desc: 'Trust evaluation for a single agent — tier, liveness, reason codes',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/agent/<handle>/llm-summary',
    desc: 'Agent-level summary for LLM consumption — profile, signals, ranking position',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/oracle/attest?metric=liveness&handle=<handle>',
    desc: 'Ed25519-signed, timestamped liveness attestation for a single agent',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/oracle/attest?metric=ghost_index',
    desc: 'Signed attestation of the current Ghost Index liveness score',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/proof-of-index/v1',
    desc: 'Latest on-chain anchor — Merkle root, Base tx hash, snapshot date',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/agents/find?q=<capability>',
    desc: 'Discovery — top 3 matching agents ranked by trust + liveness',
    auth: 'none',
    pricing: 'free',
  },
  {
    method: 'GET',
    path: '/api/agents/find/full?q=<capability>',
    desc: 'Full-list discovery with payment rails and endpoints',
    auth: 'x402',
    pricing: '$0.05',
  },
]

export default async function DatasetPage() {
  const stats = await getIndexStats()

  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
        <span className="mx-2 text-white/15">/</span>
        Dataset
      </p>

      <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
        For researchers · journalists · data teams
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-3">
        The AgentCrush Dataset
      </h1>
      <p className="text-sm text-white/55 leading-relaxed">
        Daily snapshots of {FLOOR.indexed}+ AI agents tracked across the ecosystem.
        Liveness-scored, methodology-versioned, and anchored on-chain every night.
        All endpoints are free and open — no account required for research use.
      </p>

      {/* ── What's in it ── */}
      <section className="mt-10 mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">What the dataset is</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
          {[
            {
              label: 'Coverage',
              value: `${fmt(stats.indexed)} agents indexed`,
              note: 'GitHub, Virtuals, Agentverse, ERC-8004, and direct submissions — cross-protocol.',
            },
            {
              label: 'Evidence-ranked',
              value: `${fmt(stats.evidenceRanked)} agents`,
              note: 'Multi-signal corroboration: stars, citations, deployments, protocol presence, on-chain registrations.',
            },
            {
              label: 'Daily snapshots',
              value: '100,000+ rows total',
              note: 'Daily scoring run since April 2026. Liveness, tier, signal breakdown per agent per day.',
            },
            {
              label: 'On-chain anchors',
              value: 'Nightly on Base',
              note: 'SHA-256 Merkle root of the daily snapshot committed to Base (public tx). Methodology-versioned.',
            },
            {
              label: 'Ghost Index',
              value: `${stats.ghostPct}% liveness (${fmt(stats.aliveAgents)} alive)`,
              note: 'Daily liveness index published free. History included in the API response.',
            },
            {
              label: 'License',
              value: 'CC-BY-4.0',
              note: 'Use commercially, republish, embed — with attribution and a link.',
            },
          ].map(({ label, value, note }) => (
            <div key={label} className="px-5 py-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/35 w-28 shrink-0">{label}</span>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed mt-1 ml-[7.5rem]">{note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Access ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">How to access it</h2>
        <p className="text-xs text-white/40 leading-relaxed mb-4">
          All endpoints are CORS-open, no API key required for the free tier.
          Paid endpoints ($0.05) accept x402 payment or a Pro key.
          Full OpenAPI spec at{' '}
          <Link href="/api/openapi.json" className="text-[#00d4ff]/70 hover:text-[#00d4ff] font-mono">
            /api/openapi.json
          </Link>.
        </p>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[56px_1fr_auto] gap-3 px-4 py-2 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/30">
            <span></span>
            <span>Endpoint</span>
            <span className="text-right">Auth</span>
          </div>
          {ENDPOINTS.map(({ method, path, desc, auth, pricing }) => (
            <div key={path} className="grid grid-cols-[56px_1fr_auto] gap-3 px-4 py-3 items-start border-b border-white/[0.04] last:border-b-0">
              <span className="text-[10px] font-mono font-bold text-emerald-400/70 pt-0.5">{method}</span>
              <div>
                <code className="text-[11px] font-mono text-[#00d4ff]/70 break-all">{path}</code>
                <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <span className={`text-[10px] font-mono pt-0.5 shrink-0 ${auth === 'none' ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
                {auth === 'none' ? 'free' : pricing}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/developers" className="rounded border border-white/15 bg-white/[0.025] px-3 py-1.5 text-[11px] font-mono text-white/70 hover:text-white hover:border-white/30 transition-colors">
            Developers hub →
          </Link>
          <Link href="/developers/mcp" className="rounded border border-white/15 bg-white/[0.025] px-3 py-1.5 text-[11px] font-mono text-white/70 hover:text-white hover:border-white/30 transition-colors">
            MCP server (14 tools) →
          </Link>
          <Link href="/oracle" className="rounded border border-[#00d4ff]/30 bg-[#00d4ff]/[0.05] px-3 py-1.5 text-[11px] font-mono text-[#00d4ff]/80 hover:text-[#00d4ff] hover:border-[#00d4ff]/50 transition-colors">
            Oracle / signed attestations →
          </Link>
        </div>
      </section>

      {/* ── Provenance ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Provenance and auditability</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-5 space-y-3">
          <p className="text-sm text-white/65 leading-relaxed">
            Every ranking score is produced by a published Postgres view. The nightly snapshot
            commits a SHA-256 Merkle root of all daily scores to a public Base transaction —
            the on-chain hash is the receipts layer for any later audit.
          </p>
          <p className="text-sm text-white/65 leading-relaxed">
            Methodology is versioned and stable enough to cite. If scoring rules change, a new
            version string is issued — old attestations remain interpretable against the version
            that produced them.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/methodology" className="rounded border border-white/15 bg-white/[0.025] px-3 py-1.5 text-[11px] font-mono text-white/70 hover:text-white hover:border-white/30 transition-colors">
              Methodology hub →
            </Link>
            <Link href="/api/proof-of-index/v1" className="rounded border border-white/15 bg-white/[0.025] px-3 py-1.5 text-[11px] font-mono text-white/70 hover:text-white hover:border-white/30 transition-colors">
              Latest on-chain anchor →
            </Link>
          </div>
        </div>
      </section>

      {/* ── BibTeX ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">BibTeX</h2>
        <pre className="rounded-lg border border-white/[0.07] bg-[#08080c] overflow-x-auto px-4 py-4 text-[11px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap">
          <code>{BIBTEX}</code>
        </pre>
      </section>

      {/* ── Inline citation ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Suggested inline citation</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-mono text-white/30 mb-2">Article / blog post</p>
            <p className="text-sm text-white/65 leading-relaxed italic">
              &ldquo;According to the AgentCrush Ghost Index, {stats.ghostPct}% of the {fmt(stats.indexed)} AI agents
              it tracks showed observable activity in the last 30 days
              (<a href="https://agentcrush.xyz/ghost-index" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2 not-italic">
                agentcrush.xyz/ghost-index
              </a>, accessed YYYY-MM-DD).&rdquo;
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 mb-2">Academic paper (abbreviated)</p>
            <p className="text-sm text-white/65 leading-relaxed italic">
              &ldquo;We use the AgentCrush index [1] to measure agent liveness across {fmt(stats.indexed)} tracked
              agents. Daily snapshots are anchored on-chain and available under CC-BY-4.0 at
              <a href="https://agentcrush.xyz/dataset" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2 not-italic mx-1">
                agentcrush.xyz/dataset
              </a>.&rdquo;
            </p>
          </div>
        </div>
        <p className="text-[11px] text-white/35 mt-3">
          For papers: pair the BibTeX entry with the access date and methodology URL{' '}
          <Link href="/methodology" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">agentcrush.xyz/methodology</Link>.
          The per-dataset-page canonical URL is stable.
        </p>
      </section>

      {/* ── Contact ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Contact</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
          <p className="text-sm text-white/65 leading-relaxed">
            Research collaboration, data questions, or custom exports:{' '}
            <a href="mailto:contact@agentcrush.xyz" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">
              contact@agentcrush.xyz
            </a>
          </p>
          <p className="text-sm text-white/65 leading-relaxed mt-1">
            Or on X:{' '}
            <a href="https://x.com/agentcrush_xyz" target="_blank" rel="noopener" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">
              @agentcrush_xyz
            </a>
          </p>
        </div>
      </section>

      {/* Footer nav */}
      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/methodology" className="hover:text-white/70 transition-colors">← Methodology</Link>
        <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index</Link>
        <Link href="/oracle" className="hover:text-white/70 transition-colors">Oracle</Link>
        <Link href="/cite" className="hover:text-white/70 transition-colors">Cite Us</Link>
        <Link href="/developers" className="hover:text-white/70 transition-colors">Developers</Link>
      </div>

    </main>
  )
}
