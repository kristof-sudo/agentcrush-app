import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Methodology · AgentCrush',
  description:
    'How AgentCrush ranks AI agents across 4 category rankings: model families, tokenized agents, service agents, developer agents. Per-category methodologies with full signal disclosure, weights, and limitations.',
  alternates: { canonical: 'https://agentcrush.xyz/methodology' },
  openGraph: {
    title: 'AgentCrush Methodology',
    description: 'Per-category scoring methodologies for the agent economy. Transparent signals, weights, and evidence-ready rules.',
    url: 'https://agentcrush.xyz/methodology',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush Methodology' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Methodology',
    description: 'Per-category scoring methodologies for the agent economy.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

// ─── Canonical methodology spec (mirrors MCP server's METHODOLOGY constant) ──

const METHODOLOGY = [
  {
    slug: 'model_family',
    name: 'Model Families',
    page: '/rankings/model-families',
    accent: 'violet',
    version: 'v1.4-with-deployment',
    description:
      'Scores model families (Hermes, Llama, Mistral, Qwen, DeepSeek, etc.) on adoption, capability, downstream usage, research impact, and cross-protocol agent-economy deployment.',
    signals: [
      { label: 'HuggingFace',     weight: 30, note: 'Downloads, likes, recency, breadth, top-model — aggregated by author.', formula: 'Weighted basket of 5 sub-scores' },
      { label: 'LMArena',         weight: 25, note: 'Bradley-Terry capability score from chat.lmarena.ai.', formula: 'LEAST(100, ROUND((MAX(arena_score) − 700) / 8))' },
      { label: 'HF Derivatives',  weight: 20, note: 'Fine-tunes / downstream models per base, counted from tags.', formula: 'LEAST(100, ROUND(LOG10(SUM(derivatives_count)) × 25))' },
      { label: 'Paper Citations', weight: 15, note: 'Semantic Scholar citation counts on canonical lab papers.', formula: 'LEAST(100, ROUND(LOG10(SUM(citation_count)) × 16))' },
      { label: 'Deployment',      weight: 10, note: 'Cross-protocol agent-economy mentions across 6 source tables. The moat signal.', formula: 'LEAST(100, ROUND(LOG10(SUM(deployment_count)) × 30))' },
    ],
    rule: '3 of 5 signals AND ≥1 capability signal (derivatives, LMArena, citations, or deployment).',
    limitations: [
      'Currently 5 seeded model families (Qwen, Gemini, DeepSeek, Llama, Hermes). View covers all model_family agents; seed set is curated.',
      'Citation backfill depends on Semantic Scholar API; some papers may have 0 cites due to S2 indexing delay.',
      'Deployment signal is volume-based — high counts can indicate broad model adoption rather than specific deployment of one variant.',
    ],
  },
  {
    slug: 'tokenized',
    name: 'Tokenized Agents',
    page: '/rankings/tokenized-agents',
    accent: 'pink',
    version: 'v1.1-tokenized-tvl',
    description:
      'Scores tokenized AI agents (Virtuals Protocol, etc.) economics-first: market cap, on-chain liquidity, holder distribution, capital locked, plus social visibility.',
    signals: [
      { label: 'Market Cap',           weight: 25, note: 'USD market cap, log-scaled.', formula: 'LEAST(100, ROUND(LOG10(market_cap_usd) × 12))' },
      { label: 'Liquidity + Volume',   weight: 20, note: 'On-chain liquidity (65%) + 24h volume (35%). Anti-honeypot weighting.', formula: 'liquidity_score × 0.65 + volume_score × 0.35' },
      { label: 'Holders',              weight: 15, note: 'Holder count (55%) + inverse top-10 concentration (45%).', formula: 'holders_count_score × 0.55 + (100 − top10_pct) × 0.45' },
      { label: 'Price Momentum 24h',   weight: 10, note: 'Bounded around neutral 50. Extreme volatility (>±100%) treated neutral.', formula: 'GREATEST(0, LEAST(100, 50 + price_change_pct))' },
      { label: 'TVL',                  weight: 15, note: 'Total value locked in token contracts. Capital commitment beyond market cap.', formula: 'LEAST(100, ROUND(LOG10(tvl_usd) × 14))' },
      { label: 'Social Visibility',    weight: 15, note: 'v1.1: binary curated flag. v1.2 will integrate X follower count + Farcaster engagement.', formula: 'socially_visible ? 100 : 0' },
    ],
    rule: '3 of 6 signals AND ≥1 economic signal (mc, liquidity, holders, or TVL > 0).',
    limitations: [
      'Cross-protocol presence signal tracked but currently unweighted — agent economy hasn\'t penetrated cross-protocol descriptions enough yet.',
      'Social signal in v1.1 is binary; aixbt is the only socially-flagged agent.',
      'Currently covers Virtuals Protocol agents only (16 promoted). Other tokenized ecosystems not yet integrated.',
    ],
  },
  {
    slug: 'service',
    name: 'Service Agents',
    page: '/rankings/service-agents',
    accent: 'cyan',
    version: 'v1.1-service-forks',
    description:
      'Scores service agents (A2A protocol, Agentverse, x402, ERC-8004) on adoption, source quality, activity recency, protocol breadth, fork engagement.',
    signals: [
      { label: 'Adoption',           weight: 25, note: 'GitHub stars (A2A) OR Agentverse interactions. Log-scaled. Higher of the two wins.', formula: 'GREATEST(stars_log×18, interactions_log×22)' },
      { label: 'Source Quality',     weight: 20, note: 'A2A signal_strength (0-100) OR Agentverse rating × 20.', formula: 'GREATEST(a2a_signal_strength, ROUND(av_rating × 20))' },
      { label: 'Activity Recency',   weight: 15, note: 'Age-decay since most recent push or last-seen. Recent = high score.', formula: 'Time-bucketed: 7d→100, 30d→80, 90d→60, 180d→40, 365d→20' },
      { label: 'Protocol Breadth',   weight: 15, note: 'Count of declared protocols/topics × 25.', formula: 'LEAST(100, COUNT(protocols) × 25)' },
      { label: 'Forks',              weight: 15, note: 'GitHub forks, log-scaled. Forks measure active engagement vs passive starring.', formula: 'LEAST(100, ROUND(LOG10(forks) × 22))' },
      { label: 'Discourse / Social', weight: 10, note: 'v1.2 will integrate X + Farcaster mention volume for service agents.', formula: 'currently NULL (placeholder)' },
    ],
    rule: '3 of 6 signals AND ≥1 adoption signal (stars > 0, interactions > 0, or forks > 0).',
    limitations: [
      'Currently sources from A2A (28 agents) + Agentverse (0 active in current scrape).',
      'v1.2 will add ERC-8004 registry (29K agents) and Bazaar x402 endpoints (46K) as additional service surfaces.',
      'Cross-protocol presence tracked in cross_protocol_presence but unweighted in v1.1 composite.',
    ],
  },
  {
    slug: 'developer',
    name: 'Developer Agents',
    page: '/rankings',
    accent: 'green',
    version: 'v2.c-public',
    description:
      'Scores developer-tool agents (frameworks, runtimes, dev tools) on GitHub activity, package usage, dependency adoption, ecosystem links, docs, discourse, and trust signals. The universal ranking surface.',
    signals: [
      { label: 'GitHub Activity',          weight: null, note: 'Stars, commits, contributors, recency.', formula: 'weighted by active_weight_total' },
      { label: 'Package Usage',            weight: null, note: 'npm / PyPI download volume.', formula: 'log-scaled per ecosystem' },
      { label: 'Dependency Adoption',      weight: null, note: 'Reverse dependencies — how many other projects depend on this.', formula: 'log-scaled count' },
      { label: 'Docs Quality',             weight: null, note: 'README depth, API docs, examples coverage.', formula: 'composite heuristic 0-100' },
      { label: 'Ecosystem Relationships',  weight: null, note: 'Cross-referenced with other indexed agents.', formula: 'graph-distance score' },
      { label: 'Discourse (HN)',           weight: null, note: 'Hacker News story / comment activity.', formula: 'log-scaled' },
      { label: 'Trust Signals',            weight: null, note: 'Registry context, verified claims, identity attestation.', formula: 'composite 0-100' },
    ],
    rule: 'Multi-signal coverage threshold OR top-100 ranked OR single signal ≥ 90 with ≥ 2 corroborating signals > 50.',
    limitations: [
      'Methodology weights are computed dynamically per agent (active_weight_total) rather than fixed.',
      'Universal ranking includes the full indexed set; evidence_ranked subset is the public-rank list.',
    ],
  },
]

// ─── Server-side counts for accurate display ────────────────────────────────

async function fetchCounts() {
  const supabase = supabaseAnon()
  const out = {}

  // model_family
  const { count: mfTotal } = await supabase.from('agent_score_model_family_v1').select('agent_id', { count: 'exact', head: true })
  const { count: mfER } = await supabase.from('agent_score_model_family_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
  out.model_family = { total: mfTotal ?? 0, evidence_ranked: mfER ?? 0 }

  const { count: tkTotal } = await supabase.from('agent_score_tokenized_v1').select('agent_id', { count: 'exact', head: true })
  const { count: tkER } = await supabase.from('agent_score_tokenized_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
  out.tokenized = { total: tkTotal ?? 0, evidence_ranked: tkER ?? 0 }

  const { count: svcTotal } = await supabase.from('agent_score_service_v1').select('agent_id', { count: 'exact', head: true })
  const { count: svcER } = await supabase.from('agent_score_service_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
  out.service = { total: svcTotal ?? 0, evidence_ranked: svcER ?? 0 }

  const { count: devTotal } = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('primary_category', 'developer')
  const { count: devER } = await supabase.from('agent_score_v2_top50_public_candidate').select('handle', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
  out.developer = { total: devTotal ?? 0, evidence_ranked: devER ?? 0 }

  return out
}

function AccentDot({ accent }) {
  const map = {
    violet: 'bg-violet-400',
    pink: 'bg-pink-400',
    cyan: 'bg-cyan-400',
    green: 'bg-emerald-400',
  }
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[accent] || 'bg-white/50'}`} />
}

export default async function MethodologyHubPage() {
  const counts = await fetchCounts()
  const totalEvidenceRanked = Object.values(counts).reduce((s, c) => s + c.evidence_ranked, 0)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': 'https://agentcrush.xyz/methodology',
    name: 'AgentCrush Evidence-Ranked Index',
    description: 'Multi-signal agent reputation methodologies across 4 categories: model families (v1.4), tokenized agents (v1.1), service agents (v1.1), developer agents (v2.c). Every weight, formula, evidence-ready rule, and known limitation is published.',
    url: 'https://agentcrush.xyz/methodology',
    keywords: ['AI agents', 'agent ranking', 'agent economy', 'multi-signal scoring', 'evidence-ranked', 'methodology', 'model families', 'tokenized agents', 'service agents'],
    creator: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
    dateModified: '2026-05-17',
    license: 'https://agentcrush.xyz/terms',
    isAccessibleForFree: true,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://agentcrush.xyz/api/agent-economy/llm-summary', description: 'Market-level summary across all 4 categories' },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://agentcrush.xyz/api/methodology/model_family/llm-summary', description: 'Model-family methodology breakdown' },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://agentcrush.xyz/.well-known/mcp.json', description: 'MCP server discovery manifest' },
    ],
    measurementTechnique: 'Multi-signal scoring with category-specific weights. Per-category methodology versions (v1.4 / v1.1 / v2.c). Evidence-ready rule: 3+ of N signals AND ≥1 capability signal.',
    variableMeasured: [
      'HuggingFace adoption signals (downloads, likes, recency, breadth, top-model)',
      'LMArena Bradley-Terry capability scores',
      'HuggingFace derivatives (downstream model count)',
      'Paper citations (Semantic Scholar)',
      'Cross-protocol deployment mentions',
      'Token market cap, liquidity, TVL, holders, momentum',
      'GitHub activity, package usage, dependency adoption, docs quality, ecosystem links, discourse, trust signals',
    ],
  }

  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        <span className="mx-2 text-white/15">/</span>
        Methodology
      </p>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">
          The methodology
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-3">
          How AgentCrush ranks the agent economy
        </h1>
        <p className="text-sm text-white/55 max-w-2xl leading-relaxed">
          AgentCrush is the evidence-ranked index of the agent economy. We don&apos;t pick winners — we publish multi-signal evidence with transparent weights. Different agent categories leave different evidence trails, so we run <span className="text-white/85">four category-specific methodologies</span>, each with its own signal sources, weights, and evidence-ready rule.
        </p>
      </div>

      {/* Key principles */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Principles</h2>
        <div className="space-y-4 text-sm text-white/65 leading-relaxed">
          <p>
            <span className="text-white/90 font-semibold">Multi-signal corroboration.</span> No agent is evidence-ranked on a single signal. Every category requires at least 3 of N signals available, AND at least one of those signals must be a <em>capability</em> signal — not just popularity. Downloads and stars are vanity metrics on their own.
          </p>
          <p>
            <span className="text-white/90 font-semibold">Per-category methodology.</span> A model family leaves HuggingFace downloads and LMArena scores; a tokenized agent leaves on-chain liquidity and holder distribution; a service agent leaves GitHub forks and Agentverse interactions. Running one universal scoring function across all of them would average away the truth.
          </p>
          <p>
            <span className="text-white/90 font-semibold">Methodology travels with data.</span> Every category page publishes its full signal set, weights, formulas, evidence-ready rule, and known limitations. The same methodology is exposed via our <Link href="/api/mcp/v1" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">MCP server</Link> so LLMs querying AgentCrush can correctly explain HOW a ranking was computed — not just what it is.
          </p>
          <p>
            <span className="text-white/90 font-semibold">Honest gaps.</span> Where a signal isn&apos;t yet populated for an agent (no LMArena coverage, no citations indexed, etc.), the methodology returns NULL — not 0. That distinction matters: NULL means &quot;unmeasured,&quot; 0 means &quot;measured at zero.&quot; The composite weights unmeasured signals as missing rather than failing.
          </p>
        </div>
      </section>

      {/* Live summary */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Live coverage</h2>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>Category</span>
            <span className="text-right">Tracked</span>
            <span className="text-right">Evidence-ranked</span>
            <span className="text-right">Methodology</span>
          </div>
          {METHODOLOGY.map((m) => (
            <Link
              key={m.slug}
              href={m.page}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors"
            >
              <span className="flex items-center gap-3">
                <AccentDot accent={m.accent} />
                <span className="text-sm font-semibold text-white">{m.name}</span>
              </span>
              <span className="text-sm font-mono tabular-nums text-white/55">{counts[m.slug]?.total.toLocaleString() || 0}</span>
              <span className="text-sm font-mono tabular-nums text-emerald-400">{counts[m.slug]?.evidence_ranked || 0}</span>
              <span className="text-[10px] font-mono text-violet-300/80">{m.version}</span>
            </Link>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-3">
          <span className="font-mono text-emerald-400">{totalEvidenceRanked}</span> total evidence-ranked agents across 4 categories.
        </p>
      </section>

      {/* Per-category methodology cards */}
      {METHODOLOGY.map((m) => (
        <section key={m.slug} id={m.slug} className="mb-12 scroll-mt-24">
          <div className="flex items-baseline gap-3 mb-2">
            <AccentDot accent={m.accent} />
            <h2 className="text-xl font-bold text-white">{m.name}</h2>
            <span className="text-[10px] font-mono text-violet-300/80">{m.version}</span>
          </div>
          <p className="text-sm text-white/55 leading-relaxed mb-5 max-w-2xl">{m.description}</p>

          <div className="mb-5">
            <p className="text-xs font-mono uppercase tracking-widest text-white/35 mb-3">Signals</p>
            <div className="space-y-2">
              {m.signals.map((s) => (
                <div key={s.label} className="grid grid-cols-[auto_1fr] md:grid-cols-[200px_64px_1fr] gap-3 rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3">
                  <span className="text-sm font-semibold text-white">{s.label}</span>
                  <span className="text-xs font-mono tabular-nums text-violet-300 hidden md:inline">{s.weight != null ? `${s.weight}%` : 'dynamic'}</span>
                  <div className="text-xs text-white/55 leading-relaxed">
                    <span className="block md:hidden text-[10px] font-mono text-violet-300 mb-1">{s.weight != null ? `${s.weight}% weight` : 'dynamic weight'}</span>
                    <span>{s.note}</span>
                    <code className="block mt-1.5 px-2 py-1 bg-white/[0.03] text-white/45 rounded font-mono text-[10px] overflow-x-auto">{s.formula}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.03] px-4 py-3">
            <p className="text-xs font-semibold text-emerald-300/80 mb-1">Evidence-ready rule</p>
            <p className="text-xs text-white/55 leading-relaxed">{m.rule}</p>
          </div>

          <div className="mb-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.025] px-4 py-3">
            <p className="text-xs font-semibold text-amber-300/80 mb-2">Known limitations</p>
            <ul className="space-y-1.5 text-xs text-white/55 leading-relaxed list-disc list-inside">
              {m.limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>

          <Link href={m.page} className="inline-flex items-center gap-1 text-xs font-mono text-violet-300 hover:text-violet-200 transition-colors">
            See the {m.name.toLowerCase()} ranking →
          </Link>
        </section>
      ))}

      {/* For LLMs / developers */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-3">For machine consumers</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-4">
          The same methodology is exposed via our MCP server. LLMs (Claude Desktop, Cursor, custom agents) can query AgentCrush as a live data layer and explain ranking decisions accurately.
        </p>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 mb-4">
          <p className="text-xs font-mono text-white/40 mb-2">Endpoint</p>
          <code className="text-xs text-white/75 font-mono">POST https://agentcrush.xyz/api/mcp/v1</code>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 mb-4">
          <p className="text-xs font-mono text-white/40 mb-2">Discovery</p>
          <code className="text-xs text-white/75 font-mono">GET https://agentcrush.xyz/.well-known/mcp.json</code>
        </div>
        <Link href="/developers/mcp" className="inline-flex items-center gap-1 text-xs font-mono text-violet-300 hover:text-violet-200 transition-colors">
          Full MCP docs →
        </Link>
      </section>

      {/* Version diff archive */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Version history</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-5">
          Each version bump changes signal weights, adds new signals, or adjusts the evidence-ready rule. Agents that were borderline evidence-ranked may move when a methodology version changes.
        </p>
        <div className="space-y-4">
          {[
            {
              version: 'v1.4-with-deployment',
              category: 'Model Families',
              date: 'May 2026',
              color: '#a78bfa',
              changes: [
                { type: 'added', text: 'Deployment signal (10%) — cross-protocol agent-economy mentions across 6 source tables.' },
                { type: 'adjusted', text: 'HuggingFace weight reduced from 35% → 30% to accommodate deployment signal.' },
                { type: 'adjusted', text: 'LMArena weight reduced from 30% → 25%.' },
                { type: 'impact', text: 'Agents with broad agent-economy integrations moved up; pure-capability models without deployment footprint held or dipped.' },
              ],
            },
            {
              version: 'v1.3-with-citations',
              category: 'Model Families',
              date: 'April 2026',
              color: '#a78bfa',
              changes: [
                { type: 'added', text: 'Paper Citations signal (15%) — Semantic Scholar citation counts on canonical lab papers.' },
                { type: 'adjusted', text: 'HF Derivatives weight reduced from 25% → 20%.' },
                { type: 'impact', text: 'Research-heavy model families (DeepSeek, Llama) gained; models without academic papers were unaffected.' },
              ],
            },
            {
              version: 'v1.1-tokenized-tvl',
              category: 'Tokenized Agents',
              date: 'May 2026',
              color: '#39ff14',
              changes: [
                { type: 'added', text: 'TVL signal (15%) — total value locked in token contracts.' },
                { type: 'adjusted', text: 'Liquidity + Volume weight reduced from 25% → 20%.' },
                { type: 'impact', text: 'Agents with capital locked beyond market cap moved up. Pure market-cap agents lost relative position.' },
              ],
            },
            {
              version: 'v1.1-service-forks',
              category: 'Service Agents',
              date: 'May 2026',
              color: '#f0a500',
              changes: [
                { type: 'added', text: 'Forks signal (15%) — GitHub forks log-scaled. Measures active engagement vs. passive starring.' },
                { type: 'adjusted', text: 'Protocol Breadth weight unchanged. Adoption signal recalibrated.' },
                { type: 'impact', text: 'Agents with high fork engagement moved up relative to starred-but-unforked repos.' },
              ],
            },
          ].map((ver) => (
            <div key={ver.version} className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="flex flex-wrap items-baseline gap-3 px-4 py-3 border-b border-white/[0.05]"
                style={{ borderLeftColor: ver.color, borderLeftWidth: 2 }}>
                <span className="font-mono text-sm font-bold" style={{ color: ver.color }}>{ver.version}</span>
                <span className="text-xs text-white/40">{ver.category}</span>
                <span className="text-xs font-mono text-white/25 ml-auto">{ver.date}</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {ver.changes.map((c, i) => (
                  <div key={i} className="flex gap-3 text-xs leading-relaxed">
                    <span className={`shrink-0 font-mono font-bold mt-0.5 ${
                      c.type === 'added' ? 'text-emerald-400' :
                      c.type === 'adjusted' ? 'text-amber-400' :
                      'text-violet-400'
                    }`}>
                      {c.type === 'added' ? '+ added' : c.type === 'adjusted' ? '~ adjusted' : '→ impact'}
                    </span>
                    <span className="text-white/50">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        <Link href="/labs" className="hover:text-white/70 transition-colors">Labs →</Link>
        <Link href="/developers" className="hover:text-white/70 transition-colors">Developer docs →</Link>
      </div>

    </main>
  )
}
