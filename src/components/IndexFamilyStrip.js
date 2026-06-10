/**
 * The AgentCrush index family — one consistent live strip on each index page.
 *
 * Three instruments, one system:
 *   Ghost Index    — health    (who's alive)
 *   Economy Index  — scale     (how big the agent economy is)
 *   Proof of Index — integrity (verify the data on-chain)
 *
 * Server component: fetches each index's headline number so the strip reads
 * like a ticker, not a nav. All fetches fail soft to static labels.
 * Pass `current` to highlight the page the visitor is on.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

async function fetchStripData() {
  const out = { liveness: null, alive: null, indexed: null, proof: null }
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const [gi, agents, proof] = await Promise.all([
      sb.from('ghost_index_daily').select('liveness_score, alive_agents').order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
      sb.from('agents').select('id', { count: 'exact', head: true }),
      sb.from('proof_of_index').select('snapshot_date, tx_hash, status').order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (gi.data) { out.liveness = Number(gi.data.liveness_score); out.alive = gi.data.alive_agents }
    if (agents.count != null) out.indexed = agents.count
    if (proof.data?.status === 'posted') out.proof = proof.data
  } catch { /* fail soft */ }
  return out
}

export default async function IndexFamilyStrip({ current }) {
  const d = await fetchStripData()

  const family = [
    {
      key: 'ghost',
      label: 'Ghost Index',
      note: 'who’s alive',
      href: '/ghost-index',
      color: '#f97316',
      stat: d.liveness != null ? `${d.liveness}%` : '—',
      statSuffix: d.alive != null ? ` · ${d.alive.toLocaleString()} alive` : ' alive',
    },
    {
      key: 'economy',
      label: 'Agent Economy Index',
      note: 'how big it is',
      href: '/agent-economy-index',
      color: '#00d4ff',
      stat: d.indexed != null ? d.indexed.toLocaleString() : '—',
      statSuffix: ' agents tracked',
    },
    {
      key: 'proof',
      label: 'Proof of Index',
      note: 'verify the data on-chain',
      href: '/methodology#proof-of-index',
      color: '#39ff14',
      stat: d.proof ? '✓ anchored' : 'initializing',
      statSuffix: d.proof ? ` · ${d.proof.snapshot_date} on Base` : '',
    },
  ]

  return (
    <div className="mb-8">
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">
        The AgentCrush indexes
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {family.map((f) => {
          const active = f.key === current
          return (
            <Link
              key={f.key}
              href={f.href}
              aria-current={active ? 'page' : undefined}
              className="group relative rounded-lg border px-3.5 py-3 transition-all hover:brightness-125 overflow-hidden"
              style={{
                borderColor: active ? `${f.color}66` : 'rgba(255,255,255,0.08)',
                background: active ? `${f.color}0d` : 'rgba(255,255,255,0.015)',
              }}
            >
              {/* accent edge */}
              <span className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: active ? f.color : `${f.color}44` }} />

              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? 'animate-pulse' : ''}`}
                  style={{ background: f.color, boxShadow: active ? `0 0 6px ${f.color}` : 'none' }}
                />
                <span className="font-mono text-[11px] font-bold" style={{ color: active ? f.color : 'rgba(255,255,255,0.65)' }}>
                  {f.label}
                </span>
                {active && <span className="font-mono text-[9px] text-white/30 ml-auto shrink-0">you are here</span>}
              </span>

              <span className="block mt-1.5 font-mono">
                <span className="text-lg font-bold tabular-nums leading-none" style={{ color: f.color }}>{f.stat}</span>
                <span className="text-[10px] text-white/40">{f.statSuffix}</span>
              </span>

              <span className="block mt-1 font-mono text-[10px] text-white/35">
                {f.note} <span className="text-white/20 group-hover:text-white/50 transition-colors">→</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
