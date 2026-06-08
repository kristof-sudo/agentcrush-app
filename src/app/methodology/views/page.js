/**
 * /methodology/views — open source the canonical scoring views.
 *
 * Reads each canonical migration file at build time, extracts the
 * CREATE VIEW block, and renders it side-by-side with weights, evidence-ready
 * rules, and a link to the GitHub source.
 *
 * Mobile-first 390px primary.
 */

import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'

export const metadata = {
  title: 'Scoring views — open source · AgentCrush',
  description: 'Audit our methodology. The canonical Postgres views that produce every AgentCrush ranking, published verbatim with weights, evidence-ready rules, and GitHub links. No black box.',
  alternates: { canonical: 'https://agentcrush.xyz/methodology/views' },
  openGraph: {
    title: 'AgentCrush scoring views — open source',
    description: 'The Postgres views that produce every ranking, published verbatim. Auditable methodology.',
    url: 'https://agentcrush.xyz/methodology/views',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const REPO_BASE = 'https://github.com/kristof-sudo/agentcrush-app/blob/main/migrations'

// Canonical migration → display config
const VIEWS = [
  {
    slug: 'model-family',
    label: 'Model Family v1.4',
    accent: '#a78bfa',
    file: '20260516_1200_plumb_deployment_into_model_family_view.sql',
    view: 'agent_score_model_family_v1',
    methodology_version: 'v1.4-with-deployment',
    weights: [
      ['HuggingFace adoption (downloads/likes/recency/breadth/top-model)', '30%'],
      ['LMArena (Bradley–Terry capability)', '25%'],
      ['HF Derivatives (fine-tunes per base)', '20%'],
      ['Paper citations (Semantic Scholar)', '15%'],
      ['Cross-protocol deployment (6-table mention sum)', '10%'],
    ],
    evidence_rule: '≥3 of 5 signals AND ≥1 capability signal (derivatives, LMArena, citations, or deployment).',
    confidence_tiers: '5/5 = high, 4/5 = medium, 3/5 = low, <3/5 = provisional.',
  },
  {
    slug: 'tokenized',
    label: 'Tokenized v1.1',
    accent: '#39ff14',
    file: '20260516_2200_tokenized_v11_tvl_replaces_xp.sql',
    view: 'agent_score_tokenized_v1',
    methodology_version: 'v1.1-tokenized-tvl',
    weights: [
      ['Market cap', '25%'],
      ['Liquidity + 24h volume', '20%'],
      ['Holders + concentration', '15%'],
      ['Price momentum (bounded ±50)', '10%'],
      ['Cross-protocol presence', '15%'],
      ['Social visibility', '15%'],
    ],
    evidence_rule: '3-of-6 signals AND ≥1 economic signal (market cap, liquidity, or holders > 0).',
    confidence_tiers: '6/6 = high, 5/6 = medium, 4/6 = low, <4/6 = provisional.',
  },
  {
    slug: 'service',
    label: 'Service v1.1',
    accent: '#f0a500',
    file: '20260516_2210_service_v11_forks_replaces_xp.sql',
    view: 'agent_score_service_v1',
    methodology_version: 'v1.1-service-forks',
    weights: [
      ['GitHub stars (log-scaled)', '20%'],
      ['Forks (downstream adoption)', '20%'],
      ['Cross-protocol presence', '20%'],
      ['Bot-fetch friendliness', '15%'],
      ['Description/bio completeness', '15%'],
      ['Social visibility', '10%'],
    ],
    evidence_rule: '3-of-6 signals AND ≥1 adoption signal (stars or forks > 0).',
    confidence_tiers: '6/6 = high, 5/6 = medium, 4/6 = low, <4/6 = provisional.',
  },
  {
    slug: 'mcp-server',
    label: 'MCP Server v1',
    accent: '#f97316',
    file: '20260607_0900_mcp_server_category.sql',
    view: 'agent_score_mcp_server_v1',
    methodology_version: 'v1-mcp-server',
    weights: [
      ['GitHub stars', '30%'],
      ['Tool count (mcp_server_metadata)', '25%'],
      ['Registry listings (Glama / mcp.so / Smithery)', '20%'],
      ['Forks (downstream adoption)', '15%'],
      ['Followers (org / team)', '10%'],
    ],
    evidence_rule: 'Tool count > 0 AND (GitHub stars OR registry listings present).',
    confidence_tiers: 'Not yet wrapped — v1.1 will add the confidence wrapper.',
  },
  {
    slug: 'confidence-tier',
    label: 'Confidence tier (cross-category primitive)',
    accent: '#00d4ff',
    file: '20260523_0753_score_confidence_tier.sql',
    view: 'score_confidence_tier()',
    methodology_version: 'v1.0',
    weights: [['Coverage ratio = signals_present / signals_total', '—']],
    evidence_rule: '≥95% → high, ≥75% → medium, ≥55% → low, else provisional.',
    confidence_tiers: 'Applied uniformly across categories via per-category wrapper views.',
  },
  {
    slug: 'risk-flags',
    label: 'Risk flags (cross-category)',
    accent: '#ef4444',
    file: '20260526_1100_risk_flags_view.sql',
    view: 'agent_risk_flags_v1',
    methodology_version: 'v1.0-deterministic',
    weights: [
      ['concentration_risk (tokenized: top10 > 80%)', 'deterministic'],
      ['dormancy_risk (developer: pushed_at > 90d or null)', 'deterministic'],
      ['sybil_risk', 'stub (data pending)'],
      ['volume_anomaly_risk', 'stub (data pending)'],
    ],
    evidence_rule: 'Per-rule SQL predicate. Surfaced via UNION view agent_risk_flags_v1.',
    confidence_tiers: 'Not applicable — rules are deterministic.',
  },
]

function migrationsDir() {
  return path.join(process.cwd(), 'migrations')
}

function readMigration(file) {
  try {
    return fs.readFileSync(path.join(migrationsDir(), file), 'utf8')
  } catch (e) {
    return `-- migration ${file} not readable at build time: ${e.message}`
  }
}

function extractCreateView(sql) {
  // Pull the first CREATE [OR REPLACE] VIEW … ; block. Keep prior comments
  // immediately above it for context. Falls back to full file if no match.
  const match = sql.match(/(?:--[^\n]*\n)*(CREATE\s+(?:OR\s+REPLACE\s+)?VIEW[\s\S]+?;\s*\n)/i)
  return match ? match[0].trim() : sql.trim()
}

export default function ScoringViewsPage() {
  const viewsWithSql = VIEWS.map(v => ({
    ...v,
    sql:    extractCreateView(readMigration(v.file)),
    rawUrl: `${REPO_BASE}/${v.file}`,
  }))

  return (
    <main className="mx-auto max-w-[920px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
        <span className="mx-2 text-white/15">/</span>
        <Link href="/methodology" className="hover:text-white/50 transition-colors">Methodology</Link>
        <span className="mx-2 text-white/15">/</span>
        Scoring views
      </p>

      <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
        Open source
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-2">
        Scoring views
      </h1>
      <p className="text-sm text-white/55 max-w-[640px] leading-relaxed">
        Every AgentCrush ranking is produced by a Postgres view. This page publishes
        each view&apos;s SQL source verbatim — same code that runs in production,
        same code anyone can fork. Weights, evidence-ready rules, and confidence
        tiers are all in the SQL. No black box.
      </p>

      {/* Quick links */}
      <div className="mt-6 mb-10 flex flex-wrap gap-2">
        {viewsWithSql.map(v => (
          <a key={v.slug} href={`#${v.slug}`}
             className="rounded border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[11px] font-mono text-white/55 hover:text-white hover:border-white/20 transition-colors"
             style={{ borderColor: `${v.accent}33` }}>
            <span style={{ color: v.accent }}>●</span> {v.label}
          </a>
        ))}
      </div>

      {/* Per-view sections */}
      {viewsWithSql.map(v => (
        <section key={v.slug} id={v.slug} className="mb-12 scroll-mt-24">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-base" style={{ color: v.accent }}>●</span>
            <h2 className="text-xl font-bold text-white">{v.label}</h2>
            <span className="text-[10px] font-mono text-white/40">{v.methodology_version}</span>
          </div>
          <p className="text-xs font-mono text-white/35 mb-4 break-all">
            view: {v.view}
          </p>

          {/* Weights */}
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-3">
            <div className="px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
              Weights
            </div>
            {v.weights.map(([signal, weight], i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 items-center border-b border-white/[0.04] last:border-b-0">
                <span className="text-xs text-white/65">{signal}</span>
                <span className="text-xs font-mono font-semibold text-white/70 tabular-nums">{weight}</span>
              </div>
            ))}
          </div>

          {/* Evidence-ready + confidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1.5">Evidence-ready rule</p>
              <p className="text-xs text-white/65 leading-relaxed">{v.evidence_rule}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/35 mb-1.5">Confidence tiers</p>
              <p className="text-xs text-white/65 leading-relaxed">{v.confidence_tiers}</p>
            </div>
          </div>

          {/* SQL source */}
          <details className="rounded-lg border border-white/[0.07] bg-[#08080c] overflow-hidden mb-2">
            <summary className="px-4 py-2.5 text-[11px] font-mono text-white/55 cursor-pointer hover:text-white transition-colors border-b border-white/[0.06]">
              ▸ SQL source ({v.sql.split('\n').length} lines)
            </summary>
            <pre className="overflow-x-auto px-4 py-4 text-[11px] leading-relaxed text-white/70 font-mono">
              <code>{v.sql}</code>
            </pre>
          </details>

          <p className="text-[10px] font-mono text-white/30">
            Migration: <a href={v.rawUrl} target="_blank" rel="noopener" className="text-white/45 hover:text-white underline underline-offset-2 break-all">{v.file}</a>
          </p>
        </section>
      ))}

      {/* Footer */}
      <div className="border-t border-white/[0.06] pt-6 mt-12 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/methodology" className="hover:text-white/70 transition-colors">← Methodology hub</Link>
        <a href="https://github.com/kristof-sudo/agentcrush-app/tree/main/migrations" target="_blank" rel="noopener" className="hover:text-white/70 transition-colors text-[#00d4ff]/50">All migrations →</a>
        <a href="https://huggingface.co/datasets/AgentCrush/agents-index" target="_blank" rel="noopener" className="hover:text-white/70 transition-colors text-[#00d4ff]/50">HF dataset →</a>
      </div>
    </main>
  )
}
