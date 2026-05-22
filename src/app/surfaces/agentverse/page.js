export const metadata = {
  title: 'Agentverse (Fetch.ai) — 10,000 agents indexed · AgentCrush',
  description: 'Read-only mirror of the Agentverse public agent listing. ~10,000 agents indexed; nearly all currently inactive. Updated nightly.',
  openGraph: {
    title: 'Agentverse (Fetch.ai) — 10,000 agents indexed · AgentCrush',
    description: 'Read-only mirror of the Agentverse public agent listing. ~10,000 agents indexed; nearly all currently inactive.',
    url: 'https://agentcrush.xyz/surfaces/agentverse',
    siteName: 'AgentCrush',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentverse (Fetch.ai) — 10,000 agents indexed · AgentCrush',
    description: 'Read-only mirror of the Agentverse public agent listing. ~10,000 agents indexed; nearly all currently inactive.',
  },
}

import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function pct(n, d) {
  if (!d) return '0%'
  return `${((n / d) * 100).toFixed(1)}%`
}

function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n)}…` : s
}

export default async function AgentversePage() {
  // Stats
  const { count: total } = await supabaseAnon
    .from('agentverse_agents')
    .select('*', { count: 'exact', head: true })

  const { count: active } = await supabaseAnon
    .from('agentverse_agents')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Latest 50 by last_seen_at
  const { data: rows } = await supabaseAnon
    .from('agentverse_agents')
    .select('agentverse_id, name, address, category, runtime, status, is_active, interactions_count, rating, last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(50)

  // Category breakdown (cheap: sample from rows; for true counts we'd need a view)
  const totalN = total || 0
  const activeN = active || 0
  const inactiveN = totalN - activeN
  const lastUpdated = rows && rows[0]?.last_seen_at
    ? new Date(rows[0].last_seen_at).toISOString().slice(0, 10)
    : null

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-pink-400">AgentCrush</Link>
          <span className="mx-2">/</span>
          <span>Surfaces</span>
          <span className="mx-2">/</span>
          <span className="text-gray-300">Agentverse</span>
        </nav>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3">
          Agentverse (Fetch.ai)
        </h1>
        <p className="text-gray-400 text-sm sm:text-base mb-8">
          Read-only mirror of the public Agentverse agent index. Each row is one self-listed agent.
          AgentCrush indexes Agentverse alongside other ecosystems — we don&apos;t score, we just surface.
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
          <div className="rounded border border-gray-800 p-3 sm:p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total indexed</div>
            <div className="text-xl sm:text-3xl font-bold mt-1">{totalN.toLocaleString()}</div>
          </div>
          <div className="rounded border border-gray-800 p-3 sm:p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Active</div>
            <div className="text-xl sm:text-3xl font-bold mt-1 text-green-400">{activeN.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{pct(activeN, totalN)}</div>
          </div>
          <div className="rounded border border-gray-800 p-3 sm:p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Inactive</div>
            <div className="text-xl sm:text-3xl font-bold mt-1 text-gray-500">{inactiveN.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{pct(inactiveN, totalN)}</div>
          </div>
        </div>

        {/* The finding */}
        <div className="rounded border-l-2 border-pink-500 bg-pink-950/20 px-3 py-3 sm:px-4 sm:py-4 mb-10">
          <div className="text-xs text-pink-300 uppercase tracking-wider font-semibold">Cross-protocol observation</div>
          <p className="text-sm sm:text-base text-gray-200 mt-2">
            Of the {totalN.toLocaleString()} agents Agentverse exposes via its public index, {pct(inactiveN, totalN)} are flagged inactive in the
            current scrape ({lastUpdated || 'unknown date'}). This is the registry&apos;s reported state, not a judgement — but it&apos;s the kind of
            cross-protocol signal AgentCrush exists to surface.
          </p>
        </div>

        {/* Sample table */}
        <h2 className="text-lg sm:text-xl font-semibold mb-3">Latest 50 by last seen</h2>
        <div className="overflow-x-auto border border-gray-800 rounded">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-2 sm:px-3 py-2">Name</th>
                <th className="text-left px-2 sm:px-3 py-2 hidden sm:table-cell">Address</th>
                <th className="text-left px-2 sm:px-3 py-2">Status</th>
                <th className="text-left px-2 sm:px-3 py-2 hidden sm:table-cell">Runtime</th>
                <th className="text-right px-2 sm:px-3 py-2 hidden sm:table-cell">Interactions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => (
                <tr key={r.agentverse_id} className="border-t border-gray-800">
                  <td className="px-2 sm:px-3 py-2 font-mono">
                    <div className="text-gray-100">{truncate(r.name || r.agentverse_id, 30)}</div>
                    <div className="text-[10px] text-gray-500 sm:hidden">{truncate(r.address || r.agentverse_id, 20)}</div>
                  </td>
                  <td className="px-2 sm:px-3 py-2 hidden sm:table-cell font-mono text-gray-500 text-xs">{truncate(r.address || r.agentverse_id, 32)}</td>
                  <td className="px-2 sm:px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${r.is_active ? 'bg-green-900/40 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                      {r.status || (r.is_active ? 'active' : 'inactive')}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-2 hidden sm:table-cell text-gray-400">{r.runtime || '—'}</td>
                  <td className="px-2 sm:px-3 py-2 hidden sm:table-cell text-right text-gray-400">{r.interactions_count?.toLocaleString() || '0'}</td>
                </tr>
              ))}
              {(!rows || rows.length === 0) && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No agents fetched yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 mt-6 leading-relaxed">
          Source: <a href="https://agentverse.ai/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">agentverse.ai</a> public listing
          (POST <code className="bg-gray-900 px-1 rounded">/v1/search/agents</code>). Mirrored to AgentCrush via{' '}
          <code className="bg-gray-900 px-1 rounded">runtime/agentverse-agents-adapter.mjs</code> on a scheduled timer.
          Evidence tier: marketplace-reported (Agentverse is a self-listing registry; AgentCrush does not verify activity claims independently).
        </div>
      </div>
    </main>
  )
}
