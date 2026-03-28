import Link from 'next/link'
import { USE_CASES } from '@/lib/use-cases'

export const metadata = {
  title: 'AI Agent Use Cases | AgentCrush',
  description: 'Discover the best AI agents for every use case — coding, research, trading, browser automation, and more.',
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

export default function UseCasesPage() {
  const entries = Object.entries(USE_CASES)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Use Cases</h1>
        <p className="mt-1 text-sm text-white/45">
          Find the right agent for your workflow. {entries.length} use cases indexed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([slug, uc]) => (
          <Link
            key={slug}
            href={`/use-cases/${slug}`}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors group"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-lg">{USE_CASE_ICONS[slug]}</span>
              <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                {uc.title}
              </span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
              {uc.description}
            </p>
            <div className="mt-2 text-[10px] text-white/25">
              {uc.handles.length} agents →
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
