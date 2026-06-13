/**
 * /x402-demand — x402 Demand Leaderboard
 *
 * The demand side of the agent economy: operators already taking x402 payments,
 * ranked by unique paying wallets (live from Coinbase CDP Bazaar). Intelligence
 * nobody else publishes — who actually spends and earns money via x402.
 *
 * Mobile-first, 390px primary.
 */

import Link from 'next/link'
import { demandLeaderboard } from '@/lib/x402demand'

export const revalidate = 3600

export const metadata = {
  title: 'x402 Demand Leaderboard · AgentCrush',
  description:
    'Who actually spends and earns money via x402? Live ranking of the operators taking the most x402 payments across the agent economy, by unique paying wallets. Updated hourly from Coinbase CDP Bazaar.',
  alternates: { canonical: 'https://agentcrush.xyz/x402-demand' },
  openGraph: {
    title: 'x402 Demand Leaderboard · AgentCrush',
    description: 'The operators already taking the most x402 payments, ranked by unique paying wallets. The demand side of the agent economy.',
    url: 'https://agentcrush.xyz/x402-demand',
    siteName: 'AgentCrush',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402 Demand Leaderboard',
    description: 'Who actually spends and earns money via x402? Live, by unique paying wallets.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'AgentCrush x402 Demand Leaderboard',
  description: 'Operators taking x402 payments ranked by unique paying wallets, from the Coinbase CDP Bazaar discovery index. Updated hourly.',
  url: 'https://agentcrush.xyz/x402-demand',
  creator: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

const nf = (n) => Number(n).toLocaleString('en-US')

export default async function X402DemandPage() {
  let data = null
  try {
    data = await demandLeaderboard({ days: 14, top: 40 })
  } catch (_) {
    data = null
  }

  const operators = data?.operators ?? []

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">AgentCrush · Market Data</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">x402 Demand Leaderboard</h1>
        <p className="text-white/60 leading-relaxed mb-8">
          The demand side of the agent economy — operators already taking x402 payments, ranked by
          unique paying wallets. Most rankings show who&apos;s loud; this shows who actually gets paid.
          Live from Coinbase&apos;s CDP Bazaar, updated hourly.
        </p>

        {operators.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-10 text-center text-white/50">
            Demand data is temporarily unavailable. Try again shortly, or query{' '}
            <Link href="/api/x402/demand/v1" className="underline">the API</Link>.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <Stat label="Active operators" value={nf(operators.length)} />
              <Stat label="Resources scanned" value={nf(data.resources_scanned)} />
              <Stat label="Window" value={`${data.window_days}d`} />
            </div>

            <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2.2rem_1fr_5rem_5rem_4rem] gap-2 px-4 py-3 text-[11px] uppercase tracking-wider text-white/40 border-b border-white/[0.07]">
                <div>#</div><div>Operator</div><div className="text-right">Payers</div><div className="text-right">30d calls</div><div className="text-right">Endpts</div>
              </div>
              {operators.map((o, i) => (
                <div
                  key={o.host}
                  className="grid grid-cols-[2.2rem_1fr_auto] sm:grid-cols-[2.2rem_1fr_5rem_5rem_4rem] gap-2 px-4 py-3 items-center border-b border-white/[0.05] last:border-0"
                >
                  <div className="text-white/30 text-sm tabular-nums">{i + 1}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.name || o.host}</div>
                    <div className="text-xs text-white/40 truncate">{o.host} · active {o.last_active}</div>
                  </div>
                  <div className="text-right sm:hidden">
                    <div className="font-semibold tabular-nums">{nf(o.unique_payers)}</div>
                    <div className="text-[11px] text-white/40">payers</div>
                  </div>
                  <div className="hidden sm:block text-right font-semibold tabular-nums">{nf(o.unique_payers)}</div>
                  <div className="hidden sm:block text-right text-white/60 tabular-nums">{nf(o.calls_30d)}</div>
                  <div className="hidden sm:block text-right text-white/40 tabular-nums">{o.endpoints}</div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-white/40 leading-relaxed">
              <strong className="text-white/60">Payers</strong> = peak unique-wallet count across an
              operator&apos;s endpoints (wallets recur, so they&apos;re not summed). Source: Coinbase CDP
              Bazaar quality metrics. Machine-readable at{' '}
              <Link href="/api/x402/demand/v1" className="underline">/api/x402/demand/v1</Link>.
            </p>
          </>
        )}
      </main>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/40 mt-0.5">{label}</div>
    </div>
  )
}
