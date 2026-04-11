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
        <h1 className="font-mono text-2xl font-bold text-white tracking-tight">Use Cases</h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          Find the right agent for your workflow. {entries.length} use cases indexed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([slug, uc]) => (
          <Link
            key={slug}
            href={`/use-cases/${slug}`}
            className="relative rounded-lg border border-white/[0.06] bg-[#0a0a14] px-4 py-3 overflow-hidden transition-all hover:border-[rgba(232,121,249,0.4)] hover:shadow-[0_0_20px_rgba(232,121,249,0.12)] group block"
          >
            {/* Corner accents */}
            <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-[rgba(232,121,249,0.35)]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-[rgba(232,121,249,0.35)]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[rgba(232,121,249,0.35)]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[rgba(232,121,249,0.35)]" />

            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-lg">{USE_CASE_ICONS[slug]}</span>
              <span className="font-mono font-bold text-white text-sm">
                {uc.title}
              </span>
            </div>
            <p className="font-mono text-xs text-white/50 leading-relaxed line-clamp-2">
              {uc.description}
            </p>
            <div className="mt-2 font-mono text-xs text-[#e879f9]">
              {uc.handles.length} agents →
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
