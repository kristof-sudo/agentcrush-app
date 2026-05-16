import Link from 'next/link'
import { USE_CASES } from '@/lib/use-cases'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Agent Use Cases | AgentCrush',
  description: 'Discover the best AI agents for every use case — coding, research, trading, browser automation, and more. Curated picks per use case with live evidence-ranked status.',
}

const USE_CASE_ICONS = {
  'coding-automation':        '⚙️',
  'research-automation':      '🔬',
  'multi-agent-orchestration':'🕸️',
  'crypto-trading':           '📈',
  'browser-automation':       '🌐',
  'data-analysis':            '📊',
  'customer-support':         '💬',
  'code-review':              '🔍',
}

async function fetchAgentStatuses(allHandles) {
  if (!allHandles.length) return {}
  const supabase = supabaseAnon()
  const { data } = await supabase
    .from('agents')
    .select('handle, tier')
    .in('handle', allHandles)
  const byHandle = {}
  for (const a of data || []) {
    byHandle[a.handle.toLowerCase()] = a.tier || 'indexed'
  }
  return byHandle
}

export default async function UseCasesPage() {
  const entries = Object.entries(USE_CASES)

  // Collect all unique curated handles across all use cases, then look them
  // up in one query. Compute real indexed + evidence-ranked counts per card.
  const allHandles = Array.from(new Set(
    entries.flatMap(([, uc]) => (uc.handles || []).map(h => h.toLowerCase()))
  ))
  const statuses = await fetchAgentStatuses(allHandles)

  // Per-card counts
  const cardData = entries.map(([slug, uc]) => {
    const handles = (uc.handles || []).map(h => h.toLowerCase())
    const indexed = handles.filter(h => statuses[h]).length
    const evidenceRanked = handles.filter(h => statuses[h] === 'evidence_ranked').length
    return { slug, uc, indexed, evidenceRanked, total: handles.length }
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold text-white tracking-tight">Use Cases</h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          Find the right agent for your workflow. {entries.length} use cases — each with a curated short list of agents picked for the job. Click through for live evidence signals.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cardData.map(({ slug, uc, indexed, evidenceRanked, total }) => (
          <Link
            key={slug}
            href={`/use-cases/${slug}`}
            className="relative rounded-lg border border-white/[0.06] bg-[#0a0a14] px-4 py-3 overflow-hidden transition-all hover:border-[rgba(233,30,128,0.4)] hover:shadow-[0_0_20px_rgba(233,30,128,0.12)] group block"
          >
            {/* Corner accents */}
            <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-[rgba(233,30,128,0.35)]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-[rgba(233,30,128,0.35)]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[rgba(233,30,128,0.35)]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[rgba(233,30,128,0.35)]" />

            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-lg">{USE_CASE_ICONS[slug]}</span>
              <span className="font-mono font-bold text-white text-sm">
                {uc.title}
              </span>
            </div>
            <p className="font-mono text-xs text-white/50 leading-relaxed line-clamp-2 mb-2">
              {uc.description}
            </p>

            {/* Meta row: real counts */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                  {total} curated
                </span>
                {indexed > 0 && (
                  <>
                    <span className="text-white/15 text-[10px]">·</span>
                    <span className="font-mono text-[10px] text-white/55">
                      {indexed} indexed
                    </span>
                  </>
                )}
                {evidenceRanked > 0 && (
                  <>
                    <span className="text-white/15 text-[10px]">·</span>
                    <span className="font-mono text-[10px] font-semibold text-emerald-400/85">
                      {evidenceRanked} evidence-ranked
                    </span>
                  </>
                )}
              </div>
              <span className="font-mono text-xs text-[#e91e80] shrink-0">View →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Methodology + discovery */}
      <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/35 mb-2">How use cases work</p>
        <p className="text-xs text-white/55 leading-relaxed">
          Each use case is a curated short list — agents that match the job in our view. The <span className="text-white/75">curated</span> count is the picks; <span className="text-white/75">indexed</span> is how many of those picks AgentCrush is actively tracking; <span className="text-emerald-400/85">evidence-ranked</span> is how many have passed multi-signal corroboration. To browse by category instead, see <Link href="/categories" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">/categories</Link>. To explore the full index see <Link href="/explore" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">/explore</Link> or <Link href="/rankings" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">/rankings</Link>.
        </p>
      </div>
    </main>
  )
}
