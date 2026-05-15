import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tokenized Agent Rankings · AgentCrush',
  description:
    'Ranking of tokenized AI agents by economic signals — market cap, liquidity, holder distribution, cross-protocol presence. Honeypot-aware methodology.',
  alternates: {
    canonical: 'https://www.agentcrush.xyz/rankings/tokenized-agents',
  },
  openGraph: {
    title: 'Tokenized Agent Rankings · AgentCrush',
    description: 'Tokenized AI agents ranked by economic signals — market cap, liquidity, holders, cross-protocol presence.',
    url: 'https://www.agentcrush.xyz/rankings/tokenized-agents',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush Tokenized Rankings' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tokenized Agent Rankings · AgentCrush',
    description: 'Tokenized AI agents ranked by economic signals.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
}

const SIGNAL_SOURCES = [
  {
    name: 'Market Cap',
    weight: 25,
    status: 'live',
    note: 'USD market cap, log-scaled. Primary economic signal.',
    fields: ['market_cap_score'],
  },
  {
    name: 'Liquidity + Volume',
    weight: 20,
    status: 'live',
    note: 'On-chain liquidity (65%) + 24h volume (35%). Anti-honeypot: low liquidity = low score regardless of market cap.',
    fields: ['liquidity_volume_score'],
  },
  {
    name: 'Holders + Concentration',
    weight: 15,
    status: 'live',
    note: 'Holder count (55%) + inverse top-10 concentration (45%). More distributed = higher score.',
    fields: ['holders_basket_score'],
  },
  {
    name: 'Price Momentum 24h',
    weight: 10,
    status: 'live',
    note: 'Capped at ±50% to avoid rewarding extreme volatility. Anything beyond ±100% treated as neutral.',
    fields: ['price_momentum_score'],
  },
  {
    name: 'Cross-Protocol',
    weight: 15,
    status: 'live-v0',
    note: 'v1.0 proxy: bot_fetch_friendliness_score (x402/MCP/agent-card). v1.1: scan Bazaar/ERC-8004/Agentverse by name.',
    fields: ['cross_protocol_score'],
  },
  {
    name: 'Social Visibility',
    weight: 15,
    status: 'live-v0',
    note: 'v1.0: binary curated flag (token agents live on attention). v1.1: integrate X follower count + Farcaster engagement.',
    fields: ['social_score'],
  },
]

function StatusBadge({ status }) {
  const map = {
    live:      { label: 'LIVE',     cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
    'live-v0': { label: 'LIVE v0',  cls: 'border-violet-400/40 bg-violet-400/10 text-violet-300' },
    next:      { label: 'NEXT',     cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
    planned:   { label: 'PLANNED',  cls: 'border-white/15 bg-white/[0.04] text-white/40' },
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
    : <span className="text-white/25 text-xs" title="No data">⏳</span>
}

function formatUsd(n) {
  if (n == null) return '—'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

async function fetchData() {
  const supabase = supabaseAnon()
  const { data, error } = await supabase
    .from('agent_score_tokenized_v1')
    .select('agent_id, handle, display_name, virtuals_name, virtuals_ticker, token_address, market_cap_usd, liquidity_usd, volume_24h_usd, holders, top10_holder_pct, price_change_pct_24h, market_cap_score, liquidity_volume_score, holders_basket_score, price_momentum_score, cross_protocol_score, social_score, tokenized_score, rank_in_tokenized, signals_available_count, evidence_ready_for_public_rank, methodology_version, primary_category, secondary_categories')
    .order('rank_in_tokenized', { ascending: true })
  if (error) {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, handle, display_name, virtuals_id, primary_category, secondary_categories')
      .or('primary_category.eq.tokenized,secondary_categories.cs.{tokenized}')
    return {
      rows: (agents || []).map(a => ({
        agent_id: a.id, handle: a.handle, display_name: a.display_name,
        virtuals_name: null, virtuals_ticker: null,
        market_cap_usd: null, liquidity_usd: null, volume_24h_usd: null, holders: null, top10_holder_pct: null,
        market_cap_score: null, liquidity_volume_score: null, holders_basket_score: null,
        price_momentum_score: null, cross_protocol_score: null, social_score: null,
        tokenized_score: 0, rank_in_tokenized: 0,
        signals_available_count: 0, evidence_ready_for_public_rank: false,
        methodology_version: 'v1.0-tokenized-v0 (view pending)',
      })),
      viewMissing: true,
    }
  }
  return { rows: data || [], viewMissing: false }
}

export default async function TokenizedRankingsPage() {
  const { rows, viewMissing } = await fetchData()
  const evidenceReadyCount = rows.filter(r => r.evidence_ready_for_public_rank).length
  const trackedCount = rows.length

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 text-white">

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/rankings" className="hover:text-white/50 transition-colors">Rankings</Link>
        <span className="mx-2 text-white/15">/</span>
        Tokenized agents
      </p>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          Category · tokenized agents
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Tokenized Agent Rankings
        </h1>
        <p className="mt-3 text-sm text-white/50 max-w-2xl leading-relaxed">
          Tokenized AI agents are economic objects: they have a token, a market cap, holders, and on-chain liquidity. The methodology is economics-first — market cap is the headline number, but liquidity is weighted heavily to penalize honeypots. A $100M market cap with $5K liquidity does not rank above a $5M market cap with $500K liquidity.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300">v1.0 — LIVE</span>
          <span className="text-xs text-white/40">methodology: {rows[0]?.methodology_version || 'v1.0-tokenized-v0'}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          <span className="font-mono text-emerald-300">{trackedCount}</span> tokenized agents tracked · <span className="font-mono text-emerald-300">{evidenceReadyCount}</span> evidence-ranked. Includes agents whose primary category is tokenized AND agents tokenized as a secondary identity (e.g. aixbt — primary developer, secondary tokenized).
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">Methodology</h2>
        <p className="text-sm text-white/45 mb-4">
          Composite is a weighted blend of six economic and presence signals. Sub-scores are published; every weight is documented.
        </p>

        <div className="space-y-2.5">
          {SIGNAL_SOURCES.map((s) => (
            <div
              key={s.name}
              className="flex flex-wrap items-baseline gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <span className="text-base font-semibold text-white w-44 shrink-0">{s.name}</span>
              <span className="text-xs font-mono text-violet-400 tabular-nums w-12">{s.weight}%</span>
              <StatusBadge status={s.status} />
              <span className="text-xs text-white/45 flex-1 min-w-[200px]">{s.note}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3">
          <p className="text-xs font-semibold text-white/55 mb-1">Evidence-ready rule</p>
          <p className="text-xs text-white/45 leading-relaxed">
            A tokenized agent is evidence-ranked when at least <span className="text-white/70">3 of 6 signals are present</span> AND at least one is an <span className="text-white/70">economic signal</span> (market cap, liquidity, or holders &gt; 0). Pure social-visibility ≠ evidence-ranked — must be backed by tradeable economic substance.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">Tracked tokenized agents ({trackedCount})</h2>
        <p className="text-sm text-white/45 mb-4">
          Current coverage. Sub-scores visible per agent — methodology shows its work.
        </p>

        {viewMissing && (
          <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 text-xs text-amber-300/80">
            View migration <code className="bg-white/[0.04] px-1 rounded">20260516_1500_tokenized_scoring_view.sql</code> not yet applied — showing agent metadata only. Sub-scores will appear once the view is in place.
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-sm text-white/55">No tokenized agents tracked yet.</p>
            <p className="text-xs text-white/30 mt-2">
              Tracked agents will appear here as the Virtuals promoter pipeline runs.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
              <span>#</span>
              <span>Agent</span>
              <span className="text-right" title="Market Cap">MC</span>
              <span className="text-right" title="Liquidity + Volume">L+V</span>
              <span className="text-right" title="Holders">HLD</span>
              <span className="text-right" title="Momentum">MOM</span>
              <span className="text-right" title="Cross-Protocol">XP</span>
              <span className="text-right" title="Social">SOC</span>
              <span className="text-right">Score</span>
            </div>

            {rows.map((r) => (
              <Link
                key={r.agent_id}
                href={`/agent/${encodeURIComponent(r.handle)}`}
                className="block border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors"
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3">
                  <span className="text-xs font-mono text-white/35 w-6 tabular-nums">
                    {r.evidence_ready_for_public_rank ? `#${r.rank_in_tokenized}` : '—'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-white truncate">{r.display_name || r.handle}</span>
                      {r.virtuals_ticker && (
                        <span className="text-[10px] font-mono text-violet-400">${r.virtuals_ticker}</span>
                      )}
                      {r.evidence_ready_for_public_rank ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">
                          evidence-ranked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/[0.04] border border-white/[0.07] rounded px-1.5 py-0.5">
                          indexed
                        </span>
                      )}
                      {r.secondary_categories?.includes('tokenized') && r.primary_category !== 'tokenized' && (
                        <span className="text-[10px] uppercase tracking-wider text-white/35">secondary</span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5 truncate">
                      MC {formatUsd(r.market_cap_usd)} · Liq {formatUsd(r.liquidity_usd)} · Vol {formatUsd(r.volume_24h_usd)}
                      {r.holders ? <span className="text-white/25"> · {r.holders.toLocaleString()} holders</span> : null}
                      {r.top10_holder_pct != null ? <span className="text-white/25"> · top10 {r.top10_holder_pct}%</span> : null}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-white/55 w-10 text-right">
                    {r.market_cap_score != null ? r.market_cap_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.liquidity_volume_score != null ? r.liquidity_volume_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.holders_basket_score != null ? r.holders_basket_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.price_momentum_score != null ? r.price_momentum_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.cross_protocol_score != null ? r.cross_protocol_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.social_score != null ? r.social_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-sm font-mono font-bold tabular-nums text-white w-12 text-right">
                    {r.tokenized_score || '—'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">v1.1 roadmap</h2>
        <p className="text-sm text-white/45 mb-4">
          Where the methodology evolves next. v1.0 proves the structure; v1.1 deepens cross-protocol and social.
        </p>

        <ol className="space-y-3 text-sm text-white/55">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-violet-400/80 mt-0.5 w-12 shrink-0">+1</span>
            <span><span className="text-white/85">Cross-protocol upgrade</span> — full name + token-address scan across bazaar_resources, erc8004_registry, agentverse_agents, a2a_agents. Same moat pattern as model_family deployment signal.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-white/45 mt-0.5 w-12 shrink-0">+2</span>
            <span><span className="text-white/85">Social signal proper</span> — X follower count + Farcaster cast engagement + mention volume in agent-economy channels.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-white/45 mt-0.5 w-12 shrink-0">+3</span>
            <span><span className="text-white/85">Smart-contract verification</span> — flag tokens with verified source on Basescan, contract owner activity, mint authority.</span>
          </li>
        </ol>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        <Link href="/rankings/model-families" className="hover:text-white/70 transition-colors">Model Families →</Link>
        <Link href="/how-we-rank" className="hover:text-white/70 transition-colors">Methodology →</Link>
        <Link href="/labs" className="hover:text-white/70 transition-colors">Labs →</Link>
      </div>

    </main>
  )
}
