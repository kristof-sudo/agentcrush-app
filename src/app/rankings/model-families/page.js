import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Model Family Rankings · AgentCrush',
  description:
    'Cross-protocol ranking of AI model families — Hermes, Llama, Mistral, Qwen, DeepSeek and others. Scored on HuggingFace adoption, derivatives, LMArena, citations, and discourse. v1.0 launching — rankings populate as evidence accumulates.',
  alternates: {
    canonical: 'https://www.agentcrush.xyz/rankings/model-families',
  },
  openGraph: {
    title: 'Model Family Rankings · AgentCrush',
    description: 'Cross-protocol ranking of AI model families. Evidence-based, transparent methodology.',
    url: 'https://www.agentcrush.xyz/rankings/model-families',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush Model Family Rankings' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Model Family Rankings · AgentCrush',
    description: 'Cross-protocol ranking of AI model families. Evidence-based, transparent methodology.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
}

// Signal source roadmap shown in the methodology panel
const SIGNAL_SOURCES = [
  {
    name: 'HuggingFace',
    weight: 30,
    status: 'live',
    note: 'Downloads, likes, recency, breadth, top-model — aggregated by author.',
    fields: ['hf_downloads_score', 'hf_likes_score', 'hf_recency_score', 'hf_breadth_score', 'hf_top_model_score'],
  },
  {
    name: 'LMArena',
    weight: 25,
    status: 'live',
    note: 'Bradley-Terry capability score from chat.lmarena.ai — strongest defensible capability signal.',
    fields: ['lmarena_score'],
  },
  {
    name: 'HF Derivatives',
    weight: 20,
    status: 'live',
    note: 'Count of fine-tunes / downstream models per base. LOG10(sum) × 25.',
    fields: ['derivatives_score'],
  },
  {
    name: 'Paper Citations',
    weight: 15,
    status: 'live',
    note: 'Semantic Scholar citation counts on canonical lab papers. LOG10(sum) × 16.',
    fields: ['citations_score'],
  },
  {
    name: 'Deployment',
    weight: 10,
    status: 'live',
    note: 'Cross-protocol agent-economy mentions across 6 source tables (agents, bazaar_resources, erc8004_registry, agentverse_agents, virtuals_agents, a2a_agents). The moat signal — only AgentCrush has this view unified.',
    fields: ['deployment_score'],
  },
]

function StatusBadge({ status }) {
  const map = {
    live:    { label: 'LIVE',    cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
    next:    { label: 'NEXT',    cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
    planned: { label: 'PLANNED', cls: 'border-white/15 bg-white/[0.04] text-white/40' },
  }
  const m = map[status] || map.planned
  return (
    <span className={`text-[10px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 border ${m.cls}`}>
      {m.label}
    </span>
  )
}

function CoverageDot({ available }) {
  return available
    ? <span className="text-emerald-400 text-xs" title="Signal available">✓</span>
    : <span className="text-white/25 text-xs" title="Pending — adapter not yet shipped">⏳</span>
}

async function fetchData() {
  const supabase = supabaseAnon()
  // Pull all model_family agents from the scoring view. View is in place
  // even when HF data is empty (LEFT JOIN preserves the rows).
  const { data, error } = await supabase
    .from('agent_score_model_family_v1')
    .select('agent_id, handle, display_name, hf_author, total_downloads, total_likes, model_count, top_model_downloads, most_recent_modified, total_derivatives, total_citations, total_deployments, hf_downloads_score, hf_likes_score, hf_recency_score, hf_breadth_score, hf_top_model_score, hf_score, derivatives_score, lmarena_score, citations_score, deployment_score, model_family_score, rank_in_model_family, signals_available_count, evidence_ready_for_public_rank, methodology_version')
    .order('rank_in_model_family', { ascending: true })
  if (error) {
    // Defensive: if view doesn't exist yet (migration not applied),
    // fall back to listing model_family agents directly.
    const { data: agents } = await supabase
      .from('agents')
      .select('id, handle, display_name, hf_author')
      .eq('primary_category', 'model_family')
    return {
      rows: (agents || []).map(a => ({
        agent_id: a.id,
        handle: a.handle,
        display_name: a.display_name,
        hf_author: a.hf_author,
        total_downloads: 0,
        total_likes: 0,
        model_count: 0,
        hf_score: 0,
        derivatives_score: null,
        lmarena_score: null,
        citations_score: null,
        deployment_score: null,
        model_family_score: 0,
        rank_in_model_family: 0,
        signals_available_count: 0,
        evidence_ready_for_public_rank: false,
        methodology_version: 'v1.0-hf-only (view pending)',
      })),
      viewMissing: true,
    }
  }
  return { rows: data || [], viewMissing: false }
}

export default async function ModelFamiliesRankingsPage() {
  const { rows, viewMissing } = await fetchData()

  const evidenceReadyCount = rows.filter(r => r.evidence_ready_for_public_rank).length
  const trackedCount = rows.length

  // JSON-LD ItemList for LLM retrieval
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AgentCrush Model Family Rankings',
    description: 'Evidence-ranked model families scored on HuggingFace adoption, LMArena capability, HF derivatives, paper citations, and cross-protocol deployment. Methodology v1.4.',
    url: 'https://www.agentcrush.xyz/rankings/model-families',
    numberOfItems: evidenceReadyCount,
    isPartOf: {
      '@type': 'Dataset',
      '@id': 'https://www.agentcrush.xyz/methodology',
      name: 'AgentCrush Evidence-Ranked Index',
      license: 'https://www.agentcrush.xyz/terms',
      isAccessibleForFree: true,
    },
    itemListElement: rows.filter(r => r.evidence_ready_for_public_rank).slice(0, 50).map((r) => ({
      '@type': 'ListItem',
      position: r.rank_in_model_family,
      item: {
        '@type': 'SoftwareApplication',
        name: r.display_name || r.handle,
        url: `https://www.agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`,
        applicationCategory: 'AI Model',
        aggregateRating: r.model_family_score > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: (r.model_family_score / 10).toFixed(1),
          bestRating: 10,
          worstRating: 0,
          ratingCount: 1,
        } : undefined,
      },
    })),
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 text-white">

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/rankings" className="hover:text-white/50 transition-colors">Rankings</Link>
        <span className="mx-2 text-white/15">/</span>
        Model families
      </p>

      {/* Hero */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          Category · model families
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Model Family Rankings
        </h1>
        <p className="mt-3 text-sm text-white/50 max-w-2xl leading-relaxed">
          The agents we track here are <span className="text-white/85">model families</span> — Hermes, Llama, Mistral, Qwen, DeepSeek, and other base/foundation model lineages. They&apos;re scored on a different methodology than developer agents because they leave different evidence trails: HuggingFace downloads instead of npm, fine-tune derivatives instead of dependency graphs, LMArena rank instead of Hacker News discussion.
        </p>
      </div>

      {/* Status banner */}
      <div className="mb-8 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300">v1.4 — FULL methodology LIVE</span>
          <span className="text-xs text-white/40">methodology version: {rows[0]?.methodology_version || 'v1.4-with-deployment'}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          <span className="font-mono text-emerald-300">{trackedCount}</span> model families tracked, <span className="font-mono text-emerald-300">{evidenceReadyCount}</span> evidence-ranked. All 5 signal slots populated: HuggingFace + LMArena + HF derivatives + paper citations + cross-protocol deployment. The evidence-ready rule requires 3-of-5 signals AND ≥1 capability signal (derivatives, LMArena, citations, or deployment) — protects against vanity-metric promotion.
        </p>
      </div>

      {/* Methodology */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">Methodology</h2>
        <p className="text-sm text-white/45 mb-4">
          The model family composite score is a weighted blend of five signal sources. Every sub-score is published, every weight is documented.
        </p>

        <div className="space-y-2.5">
          {SIGNAL_SOURCES.map((s) => (
            <div
              key={s.name}
              className="flex flex-wrap items-baseline gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <span className="text-base font-semibold text-white w-32 shrink-0">{s.name}</span>
              <span className="text-xs font-mono text-violet-400 tabular-nums w-16">{s.weight}%</span>
              <StatusBadge status={s.status} />
              <span className="text-xs text-white/45 flex-1 min-w-[200px]">{s.note}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3">
          <p className="text-xs font-semibold text-white/55 mb-1">Evidence-ready rule</p>
          <p className="text-xs text-white/45 leading-relaxed">
            A model family is evidence-ranked when at least <span className="text-white/70">3 of 5 signals are present</span> AND at least one of those is a <span className="text-white/70">capability-or-adoption signal</span> (derivatives, LMArena, citations, or deployment — not just downloads). Downloads alone is vanity for models the same way GitHub stars are vanity for developer agents.
          </p>
        </div>
      </section>

      {/* Tracked agents */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">Tracked model families ({trackedCount})</h2>
        <p className="text-sm text-white/45 mb-4">
          Current coverage. Sub-scores are visible per agent — methodology shows its work.
        </p>

        {viewMissing && (
          <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 text-xs text-amber-300/80">
            View migration <code className="bg-white/[0.04] px-1 rounded">20260515_1600_model_family_scoring_view.sql</code> not yet applied — showing agent metadata only. Sub-scores will appear once the view is in place.
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-sm text-white/55">No model family agents tracked yet.</p>
            <p className="text-xs text-white/30 mt-2">
              Tracked agents will appear here as the HuggingFace adapter discovers and promotes them.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
              <span>#</span>
              <span>Agent</span>
              <span className="text-right" title="HuggingFace">HF</span>
              <span className="text-right" title="HF Derivatives">DER</span>
              <span className="text-right" title="LMArena">LMA</span>
              <span className="text-right" title="Citations">CIT</span>
              <span className="text-right" title="Deployment (cross-protocol)">DEP</span>
              <span className="text-right">Score</span>
            </div>

            {rows.map((r) => (
              <Link
                key={r.agent_id}
                href={`/agent/${encodeURIComponent(r.handle)}`}
                className="block border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors"
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3">
                  <span className="text-xs font-mono text-white/35 w-6 tabular-nums">
                    {r.evidence_ready_for_public_rank ? `#${r.rank_in_model_family}` : '—'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-white truncate">{r.display_name || r.handle}</span>
                      {r.evidence_ready_for_public_rank && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">
                          evidence-ranked
                        </span>
                      )}
                      {!r.evidence_ready_for_public_rank && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/[0.04] border border-white/[0.07] rounded px-1.5 py-0.5">
                          indexed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5 truncate">
                      {r.hf_author ? <>HF: {r.hf_author}</> : <>HF: <span className="text-white/20">not mapped</span></>}
                      {r.model_count > 0 && <span className="text-white/25"> · {r.model_count} models</span>}
                      {r.total_downloads > 0 && <span className="text-white/25"> · {r.total_downloads.toLocaleString()} downloads</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-white/55 w-10 text-right">
                    {r.hf_score > 0 ? r.hf_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.derivatives_score != null ? r.derivatives_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.lmarena_score != null ? r.lmarena_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.citations_score != null ? r.citations_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.deployment_score != null ? r.deployment_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-sm font-mono font-bold tabular-nums text-white w-12 text-right">
                    {r.model_family_score || '—'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* v1.5 roadmap (v1.4 is FULL methodology — all signals live) */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">v1.5 roadmap</h2>
        <p className="text-sm text-white/45 mb-4">
          v1.4 ships with all 5 signal slots populated. v1.5 deepens each signal with additional inputs.
        </p>

        <ol className="space-y-3 text-sm text-white/55">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-violet-400/80 mt-0.5 w-12 shrink-0">+1</span>
            <span><span className="text-white/85">Expand seed coverage</span> — 7 model families seeded (Qwen, Gemini, Mistral, DeepSeek, Llama, Cohere, Hermes). Next: Anthropic Claude, OpenAI GPT lineage, Stability — once we can map them to HF authors / LMArena keys / canonical papers.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-white/45 mt-0.5 w-12 shrink-0">+2</span>
            <span><span className="text-white/85">Citation backfill via S2 API key</span> — daily refresh of 13 canonical papers with full rate-limit access. Will surface citation drift over time.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-white/45 mt-0.5 w-12 shrink-0">+3</span>
            <span><span className="text-white/85">Deployment signal v2</span> — add ERC-8004 token metadata fetch (currently scans agent_name only). Will multiply the cross-protocol match volume as more on-chain agents declare model usage.</span>
          </li>
        </ol>
      </section>

      {/* Footer nav */}
      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        <Link href="/how-we-rank" className="hover:text-white/70 transition-colors">Methodology →</Link>
        <Link href="/learn" className="hover:text-white/70 transition-colors">What are AI agents? →</Link>
        <Link href="/labs" className="hover:text-white/70 transition-colors">Labs →</Link>
      </div>

    </main>
  )
}
