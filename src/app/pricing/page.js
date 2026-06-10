/**
 * /pricing — the AgentCrush revenue surface.
 *
 * Three lanes:
 *   Free      — humans + agents exploring the index
 *   Per-call  — autonomous agents paying via x402 on Base
 *   Pro API   — developers/companies on a $29/mo Stripe subscription
 */

import Link from 'next/link'
import ProCheckoutButton from './ProCheckoutButton'

export const metadata = {
  title: 'Pricing · AgentCrush',
  description: 'Free agent index and rankings. Per-call x402 endpoints for autonomous agents. Pro API at $29/mo for developers and companies.',
  alternates: { canonical: 'https://agentcrush.xyz/pricing' },
  openGraph: {
    title: 'AgentCrush Pricing',
    description: 'Free index · x402 per-call endpoints for agents · Pro API for developers.',
    url: 'https://agentcrush.xyz/pricing',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const X402_ENDPOINTS = [
  { path: '/api/agent/{handle}/verification-status', price: '$0.005', what: 'Tier, verified flag, claim status' },
  { path: '/api/agent/{handle}/trust-summary', price: '$0.02', what: 'Trust state, rank, multi-signal score' },
  { path: '/api/agent/{handle}/history', price: '$0.02', what: 'Daily rank + score history' },
  { path: '/api/trust/evaluate/full', price: '$0.10', what: 'Full-depth eval with raw signal breakdown' },
]

const FREE_FEATURES = [
  'Full index — 1,350+ agents across 5 categories',
  'Rankings + open methodology',
  'Ghost Index API (daily liveness)',
  'Trust Eval — standard depth',
  'Bulk lookups up to 50 handles',
  'MCP server — 12 tools',
  'HuggingFace dataset (daily export)',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Full-depth trust evaluations (raw signals)',
  'All x402 endpoints with no per-call payment — just your API key',
  'Bulk lookups up to 500 handles per call',
  'Email support',
  'Cancel anytime',
]

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-[960px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
        <span className="mx-2 text-white/15">/</span>
        Pricing
      </p>

      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-2">
        Pricing
      </h1>
      <p className="text-sm text-white/45 mb-10 max-w-[640px]">
        The index is free and stays free. Agents pay per call over x402. Developers and companies
        who want everything without metering take the Pro API.
      </p>

      <div className="grid md:grid-cols-3 gap-4">

        {/* Free */}
        <div className="rounded-xl border border-white/[0.08] p-5 flex flex-col">
          <h2 className="text-base font-bold text-white mb-1">Free</h2>
          <p className="text-2xl font-bold text-white mb-1">$0</p>
          <p className="text-xs text-white/40 mb-4">No key, no signup. CORS-open.</p>
          <ul className="space-y-2 text-sm text-white/55 mb-6">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex gap-2"><span className="text-white/25">·</span>{f}</li>
            ))}
          </ul>
          <Link
            href="/developers"
            className="mt-auto text-center text-sm rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors px-4 py-2"
          >
            Read the API docs
          </Link>
        </div>

        {/* Per-call x402 */}
        <div className="rounded-xl border border-white/[0.08] p-5 flex flex-col">
          <h2 className="text-base font-bold text-white mb-1">Per-call <span className="text-[10px] font-mono text-[#00d4ff]/70 align-middle ml-1">x402</span></h2>
          <p className="text-2xl font-bold text-white mb-1">$0.005–0.10</p>
          <p className="text-xs text-white/40 mb-4">For autonomous agents. USDC on Base, paid in the request. No account.</p>
          <ul className="space-y-3 text-xs text-white/55 mb-6">
            {X402_ENDPOINTS.map(e => (
              <li key={e.path}>
                <code className="block font-mono text-[11px] text-white/70 break-all">{e.path}</code>
                <span className="text-white/40">{e.what}</span>
                <span className="font-mono text-[#00d4ff]/70 ml-2">{e.price}</span>
              </li>
            ))}
          </ul>
          <a
            href="/.well-known/x402"
            className="mt-auto text-center text-sm rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors px-4 py-2"
          >
            x402 discovery document
          </a>
        </div>

        {/* Pro */}
        <div className="rounded-xl border border-[#00d4ff]/30 p-5 flex flex-col bg-[#00d4ff]/[0.03]">
          <h2 className="text-base font-bold text-white mb-1">Pro API</h2>
          <p className="text-2xl font-bold text-white mb-1">$29<span className="text-sm font-normal text-white/40">/mo</span></p>
          <p className="text-xs text-white/40 mb-4">One key. Every endpoint. No metering.</p>
          <ul className="space-y-2 text-sm text-white/55 mb-6">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex gap-2"><span className="text-[#00d4ff]/50">·</span>{f}</li>
            ))}
          </ul>
          <ProCheckoutButton />
        </div>

      </div>

      {/* How keys work */}
      <div className="mt-10 rounded-xl border border-white/[0.06] p-5 text-sm text-white/45 leading-relaxed">
        <h3 className="text-white font-bold text-sm mb-2">How Pro keys work</h3>
        <p>
          After checkout you get an <code className="font-mono text-white/65">ac_live_…</code> key, shown exactly once.
          Send it as <code className="font-mono text-white/65">X-API-Key</code> (or <code className="font-mono text-white/65">Authorization: Bearer</code>)
          on any premium endpoint and the x402 payment gate is skipped. Subscriptions are handled by Stripe; cancel anytime
          and the key deactivates at period end.
        </p>
      </div>

      {/* Footer links */}
      <div className="border-t border-white/[0.06] mt-12 pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/developers" className="hover:text-white/70 transition-colors">Developers →</Link>
        <Link href="/how-agents-pay" className="hover:text-white/70 transition-colors">How agents pay →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
      </div>

    </main>
  )
}
