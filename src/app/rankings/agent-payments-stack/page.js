import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Agent Payments Stack · AgentCrush',
  description:
    'Neutral, evidence-ranked map of the 6-layer agent payments stack — settlement, wallets, routing, protocol, governance, application. Tracks Coinbase, Stripe, Circle, Tempo, x402, MPP, AP2, Visa, Mastercard, ERC-8004, Virtuals, Fetch Agent Launch and more.',
  alternates: { canonical: 'https://www.agentcrush.xyz/rankings/agent-payments-stack' },
  openGraph: {
    title: 'Agent Payments Stack · AgentCrush',
    description: 'Live 6-layer map of the agent payments stack — who covers what, ranked by stack coverage.',
    url: 'https://www.agentcrush.xyz/rankings/agent-payments-stack',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush Agent Payments Stack' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Payments Stack · AgentCrush',
    description: 'Live 6-layer map of the agent payments stack.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
}

const LAYERS = [
  { id: 'L0', name: 'Settlement',  blurb: 'Where money actually moves.',                       accent: 'border-sky-400/40 bg-sky-400/[0.06] text-sky-300' },
  { id: 'L1', name: 'Wallets',     blurb: 'Agent key management + policy-gated signing.',      accent: 'border-violet-400/40 bg-violet-400/[0.06] text-violet-300' },
  { id: 'L2', name: 'Routing',     blurb: 'Cross-chain bridging + abstraction.',               accent: 'border-fuchsia-400/40 bg-fuchsia-400/[0.06] text-fuchsia-300' },
  { id: 'L3', name: 'Protocol',    blurb: 'How the payment flow is structured.',               accent: 'border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-300' },
  { id: 'L4', name: 'Governance',  blurb: 'Authorisation, compliance, identity.',              accent: 'border-amber-400/40 bg-amber-400/[0.06] text-amber-300' },
  { id: 'L5', name: 'Application', blurb: 'Frameworks, marketplaces, autonomous services.',    accent: 'border-rose-400/40 bg-rose-400/[0.06] text-rose-300' },
]

const LAYER_WEIGHTS = { L0: 4, L1: 3, L2: 2, L3: 4, L4: 5, L5: 3 }

async function fetchData() {
  const supabase = supabaseAnon()
  const { data, error } = await supabase
    .from('agent_payments_stack_v1')
    .select('*')
    .order('rank_overall', { ascending: true })
  if (error || !data) {
    return { rows: [], viewMissing: true }
  }
  return { rows: data, viewMissing: false }
}

function LayerChip({ layer }) {
  const meta = LAYERS.find((l) => l.id === layer)
  if (!meta) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 border ${meta.accent}`}>
      {layer}
      <span className="opacity-60 font-normal">{meta.name}</span>
    </span>
  )
}

function EvidenceTierBadge({ tier }) {
  if (!tier) return null
  const map = {
    verified_onchain:      { label: 'verified onchain',     cls: 'text-emerald-300/80' },
    public_api:            { label: 'public API',           cls: 'text-sky-300/80' },
    marketplace_reported:  { label: 'marketplace-reported', cls: 'text-violet-300/80' },
    public_webpage:        { label: 'public webpage',       cls: 'text-white/40' },
    self_reported:         { label: 'self-reported',        cls: 'text-amber-300/80' },
  }
  const m = map[tier] || { label: tier, cls: 'text-white/40' }
  return <span className={`text-[10px] font-mono ${m.cls}`}>{m.label}</span>
}

function fmtMoney(n) {
  if (!n && n !== 0) return null
  const num = Number(n)
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
  if (num >= 1e9)  return `$${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6)  return `$${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3)  return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

function fmtCount(n) {
  if (!n && n !== 0) return null
  const num = Number(n)
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return String(num)
}

function ProjectRow({ p, idx }) {
  const layers = p.layers || []
  const acq = p.acquired_by ? `acq. ${p.acquired_by}${p.acquisition_price_usd_millions ? ` · $${p.acquisition_price_usd_millions >= 1000 ? `${(p.acquisition_price_usd_millions/1000).toFixed(1)}B` : `${p.acquisition_price_usd_millions}M`}` : ''}` : null
  return (
    <li className="grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition-colors">
      <div className="text-xs font-mono text-white/30 tabular-nums pt-0.5">{idx}</div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">{p.name}</span>
          {p.website_url && (
            <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/30 hover:text-white/60 font-mono">↗</a>
          )}
          {p.backing_org && (
            <span className="text-[11px] text-white/35 font-mono">· {p.backing_org}</span>
          )}
          {acq && (
            <span className="text-[11px] text-amber-300/70 font-mono">· {acq}</span>
          )}
        </div>
        {p.description && (
          <p className="mt-1 text-xs text-white/45 leading-relaxed line-clamp-2">{p.description}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {layers.map((l) => <LayerChip key={l} layer={l} />)}
          <EvidenceTierBadge tier={p.evidence_tier} />
        </div>
      </div>
      <div className="text-right whitespace-nowrap">
        <div className="text-base font-bold text-white tabular-nums">{p.stack_coverage_score}</div>
        <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{p.layers_spanned} {p.layers_spanned === 1 ? 'layer' : 'layers'}</div>
      </div>
    </li>
  )
}

function LayerColumn({ layer, projects }) {
  const inLayer = projects.filter((p) => (p.layers || []).includes(layer.id))
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className={`px-3 py-2 border-b border-white/[0.06] ${layer.accent}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-mono font-bold tracking-wider">{layer.id}</span>
          <span className="text-xs font-semibold">{layer.name}</span>
          <span className="text-[10px] font-mono opacity-50 ml-auto">{inLayer.length}</span>
        </div>
        <p className="mt-1 text-[10px] opacity-60 leading-snug">{layer.blurb}</p>
        <p className="mt-1 text-[9px] font-mono opacity-40">weight {LAYER_WEIGHTS[layer.id]}</p>
      </div>
      <ul className="text-xs">
        {inLayer.length === 0 ? (
          <li className="px-3 py-2 text-white/30 text-[11px]">—</li>
        ) : (
          inLayer.map((p) => {
            const ev = p.layer_evidence && p.layer_evidence[layer.id]
            return (
              <li key={`${p.slug}-${layer.id}`} className="px-3 py-2 border-b border-white/[0.04] last:border-b-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-white/90 truncate">{p.name}</span>
                </div>
                {ev?.label && (
                  <p className="mt-0.5 text-[10px] text-white/40 leading-snug">{ev.label}</p>
                )}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

export default async function AgentPaymentsStackPage() {
  const { rows, viewMissing } = await fetchData()

  const totalProjects = rows.length
  const acquired = rows.filter((r) => r.acquired_by).length
  const totalAcqUsd = rows.reduce((s, r) => s + (Number(r.acquisition_price_usd_millions) || 0), 0)

  // JSON-LD ItemList for LLM retrieval
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AgentCrush Agent Payments Stack',
    description: 'Live 6-layer map of the agent payments stack. Projects ranked by stack coverage (layers spanned, weighted by layer importance). Sources include the Keyrock + Coinbase + Tempo + Virtuals "Who Pays The Agent?" report (May 2026), public disclosures, and AgentCrush evidence ranking.',
    url: 'https://www.agentcrush.xyz/rankings/agent-payments-stack',
    numberOfItems: totalProjects,
    isPartOf: {
      '@type': 'Dataset',
      '@id': 'https://www.agentcrush.xyz/methodology',
      name: 'AgentCrush Evidence-Ranked Index',
      license: 'https://www.agentcrush.xyz/terms',
      isAccessibleForFree: true,
    },
    itemListElement: rows.slice(0, 50).map((r) => ({
      '@type': 'ListItem',
      position: r.rank_overall,
      item: {
        '@type': 'Organization',
        name: r.name,
        url: r.website_url || `https://www.agentcrush.xyz/rankings/agent-payments-stack#${r.slug}`,
        description: r.description,
      },
    })),
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 text-white">

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/rankings" className="hover:text-white/50 transition-colors">Rankings</Link>
        <span className="mx-2 text-white/15">/</span>
        Agent payments stack
      </p>

      {/* Hero */}
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          Category · agent payments stack
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          The Agent Payments Stack
        </h1>
        <p className="mt-3 text-sm text-white/50 leading-relaxed">
          The protocols, wallets, settlement chains, and governance frameworks that let AI agents hold money and pay for things — mapped across 6 layers, ranked by how much of the stack each project covers. Updated continuously; sourced from the <a href="https://research.keyrock.com" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white underline-offset-2 hover:underline">Keyrock + Coinbase + Tempo + Virtuals &quot;Who Pays The Agent?&quot;</a> report (May 2026), public disclosures, and AgentCrush evidence ranking.
        </p>
      </div>

      {/* Status banner */}
      {viewMissing && (
        <div className="mb-8 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-5 py-4">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-300 mb-1">
            View pending
          </p>
          <p className="text-sm text-white/60">
            The <code className="text-white/80">agent_payments_stack_v1</code> view isn&apos;t live yet — migration <code className="text-white/80">20260522_2100_create_agent_payments_stack.sql</code> needs to be applied. Once it lands, this page populates automatically.
          </p>
        </div>
      )}

      {!viewMissing && (
        <div className="mb-8 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300">v1.0-aps — LIVE</span>
            <span className="text-xs text-white/40">methodology version: {rows[0]?.methodology_version || 'v1.0-aps'}</span>
          </div>
          <p className="mt-1 text-sm text-white/65 leading-relaxed">
            Tracking <span className="text-white font-semibold">{totalProjects}</span> projects across 6 layers. <span className="text-white font-semibold">{acquired}</span> already acquired by incumbents ({fmtMoney(totalAcqUsd * 1e6)} disclosed in deals).
          </p>
        </div>
      )}

      {/* Methodology summary */}
      <div className="mb-10 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/55">Methodology</span>
          <span className="text-[10px] font-mono text-white/30">v1.0-aps</span>
        </div>
        <p className="text-sm text-white/60 leading-relaxed mb-3">
          Each project is mapped to the layers it covers, with a per-layer evidence label. The composite <span className="text-white">stack coverage score</span> is a weighted sum of layers spanned:
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          {LAYERS.map((l) => (
            <span key={l.id} className={`inline-flex items-center gap-1.5 rounded px-2 py-1 border ${l.accent}`}>
              {l.id} {l.name} <span className="opacity-60">×{LAYER_WEIGHTS[l.id]}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/35 leading-relaxed">
          Governance is weighted heaviest — Keyrock&apos;s own framing is that <span className="italic">&quot;the companies that solve the trust layer will capture the governance layer of the stack&quot;</span>. Settlement and Protocol tie next because both are sticky once deployed.
        </p>
      </div>

      {/* 6-layer grid */}
      <h2 className="text-lg font-bold mb-4">The 6-layer map</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {LAYERS.map((l) => <LayerColumn key={l.id} layer={l} projects={rows} />)}
      </div>

      {/* Stack coverage ranking */}
      <h2 className="text-lg font-bold mb-2">Stack coverage ranking</h2>
      <p className="text-xs text-white/45 mb-4 max-w-2xl">
        Ranked by weighted stack coverage. Coinbase + Stripe each span 5/6 layers — the vertical-integration race Keyrock flags as the most important dynamic of the next 12 months.
      </p>
      <ol className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {rows.map((p, i) => <ProjectRow key={p.slug} p={p} idx={p.rank_overall || i + 1} />)}
      </ol>

      {/* Footer note */}
      <div className="mt-10 text-xs text-white/35 leading-relaxed max-w-2xl">
        <p>
          <span className="text-white/55 font-semibold">Why this exists.</span> Keyrock published a static snapshot of this map in May 2026. AgentCrush runs the live version — protocol-neutral, methodology-disclosed, evidence-ranked. Same rules as our <Link href="/rankings/model-families" className="underline underline-offset-2 hover:text-white/70">model family</Link>, <Link href="/rankings/tokenized-agents" className="underline underline-offset-2 hover:text-white/70">tokenized</Link>, and <Link href="/rankings/service-agents" className="underline underline-offset-2 hover:text-white/70">service</Link> category indexes.
        </p>
        <p className="mt-2">
          Spot a missing project or stale layer assignment? Open an issue on <a href="https://github.com/kristof-sudo/agentcrush-app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/70">GitHub</a>.
        </p>
      </div>
    </main>
  )
}
