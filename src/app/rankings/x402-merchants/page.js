/**
 * /rankings/x402-merchants — the x402 merchant directory, ranked by real demand.
 *
 * Built entirely from the bazaar_resources mirror (Coinbase CDP Bazaar) and its
 * self-published 30-day quality metrics. Evidence tier: marketplace-reported —
 * labeled prominently; chain-verified demand lands with B19 phase 1.
 *
 * The honest differentiator vs every other x402 list: ranked by PAID CALLS,
 * not listing count — the spam problem (one lister = 90% of listings, ~0% of
 * payers) is exactly why a demand-ranked view matters.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export const metadata = {
  title: 'x402 Merchant Directory · AgentCrush',
  description:
    'Machine-payable x402 endpoints ranked by real 30-day demand (paid calls, unique payers) — not by listing count. Marketplace-reported metrics from the Coinbase Bazaar, labeled and caveated.',
  alternates: { canonical: 'https://agentcrush.xyz/rankings/x402-merchants' },
  openGraph: {
    title: 'x402 Merchant Directory — ranked by real demand',
    description: 'Which machine-payable endpoints do agents actually pay? 30-day paid calls and unique payers per merchant.',
    url: 'https://agentcrush.xyz/rankings/x402-merchants',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function hostOf(u) {
  try { return new URL(u).hostname } catch { return u }
}

function priceOf(accepts) {
  const amounts = (accepts || [])
    .map((a) => Number(a?.amount))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!amounts.length) return null
  const min = Math.min(...amounts)
  // Bazaar amounts are in USDC base units (6 decimals)
  const usd = min / 1e6
  return usd >= 0.01 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(4)}`
}

function networksOf(accepts) {
  const nets = [...new Set((accepts || []).map((a) => a?.network).filter(Boolean))]
  return nets.map((n) => (n === 'eip155:8453' ? 'base' : n.replace('eip155:', 'evm:'))).slice(0, 3)
}

export default async function X402MerchantsPage() {
  let rows = []
  try {
    const { data } = await db()
      .from('bazaar_resources')
      .select('resource_url, description, accepts, quality')
      .is('removed_at', null)
      .gt('quality->l30DaysTotalCalls', 0)
      .order('quality->l30DaysTotalCalls', { ascending: false })
      .limit(400)
    rows = data || []
  } catch { /* renders empty-state */ }

  // Demand-ranked, host-deduped view: keep each host's top resource, aggregate the rest
  const byHost = new Map()
  for (const r of rows) {
    const h = hostOf(r.resource_url)
    if (h.endsWith('agentcrush.xyz')) continue // we never rank ourselves
    const calls = Number(r.quality?.l30DaysTotalCalls) || 0
    const payers = Number(r.quality?.l30DaysUniquePayers) || 0
    const cur = byHost.get(h)
    if (!cur) {
      byHost.set(h, { host: h, top: r, resources: 1, calls, maxPayers: payers })
    } else {
      cur.resources += 1
      cur.calls += calls
      cur.maxPayers = Math.max(cur.maxPayers, payers)
    }
  }
  const merchants = [...byHost.values()].sort((a, b) => b.calls - a.calls).slice(0, 50)
  const totalCalls = rows.reduce((n, r) => n + (Number(r.quality?.l30DaysTotalCalls) || 0), 0)

  return (
    <main className="mx-auto max-w-[840px] px-4 md:px-6 py-14">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">
          <Link href="/rankings" className="hover:text-white/60 transition-colors">Rankings</Link>
          <span className="mx-2 text-white/15">/</span>
          x402 merchants
        </p>
        <h1 className="font-mono text-2xl md:text-3xl font-bold text-white mb-3">
          x402 merchants, ranked by <span style={{ color: '#39ff14' }}>real demand</span>
        </h1>
        <p className="font-mono text-xs text-white/50 leading-relaxed max-w-2xl">
          Every other x402 list ranks by listings. Listings are free; one lister accounts for
          ~90% of them and almost none of the payers. This directory ranks machine-payable
          endpoints by <span className="text-white/80">30-day paid calls and unique paying wallets</span> —
          {' '}{totalCalls.toLocaleString()} paid calls tracked across the live catalog.
        </p>
        <p className="mt-3 inline-block rounded border border-amber-400/25 bg-amber-400/[0.05] px-2.5 py-1.5 font-mono text-[10px] text-amber-200/70">
          Evidence tier: marketplace-reported (Coinbase Bazaar self-published metrics) · chain-verified demand coming with the payer-wallet scan
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/[0.07]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              {['#', 'Merchant', '30d calls', '30d payers', 'from', 'chains', 'listings'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-white/35 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merchants.map((m, i) => (
              <tr key={m.host} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015] transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs text-white/30 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-sm font-semibold text-white/85">{m.host}</span>
                  <p className="font-mono text-[10px] text-white/30 truncate max-w-[260px]">{(m.top.description || '').slice(0, 90)}</p>
                </td>
                <td className="px-3 py-2.5 font-mono text-sm text-[#39ff14] tabular-nums">{m.calls.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-sm text-white/70 tabular-nums">{m.maxPayers.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-white/50">{priceOf(m.top.accepts) || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-white/45">{networksOf(m.top.accepts).join(' · ') || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-white/40 tabular-nums">{m.resources}</td>
              </tr>
            ))}
            {merchants.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center font-mono text-xs text-white/30">Demand data loading — check back shortly.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-8 space-y-3">
        <p className="font-mono text-[11px] text-white/45 leading-relaxed">
          <span className="text-white/70 font-bold">Method:</span> resources mirrored from the
          Coinbase CDP Bazaar discovery API; hosts deduped (top resource shown, calls summed,
          listings counted); ranked by 30-day total paid calls. Payer counts overlap across a
          host&apos;s resources, so the max per resource is shown, not a sum.
        </p>
        <p className="font-mono text-[11px] text-white/45 leading-relaxed">
          Buying from one of these? Check the seller first:{' '}
          <Link href="/api/agents/find?q=risk" className="underline underline-offset-2 hover:text-white/70 transition-colors">counterparty discovery</Link> ·{' '}
          <Link href="/oracle" className="underline underline-offset-2 hover:text-white/70 transition-colors">signed attestations</Link> ·{' '}
          <Link href="/ghost-index" className="underline underline-offset-2 hover:text-white/70 transition-colors">Ghost Index</Link>
        </p>
        <p className="font-mono text-[10px] text-white/25">
          AgentCrush sells on these rails too ($0.005–$0.25 per call) — <Link href="/pricing" className="underline underline-offset-2 hover:text-white/50 transition-colors">pricing</Link>. We never rank ourselves.
        </p>
      </footer>
    </main>
  )
}
