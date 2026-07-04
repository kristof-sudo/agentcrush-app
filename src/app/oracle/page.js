/**
 * /oracle — Resolution Criteria Cookbook (B18)
 *
 * Copy-paste market-rule templates that name AgentCrush attestations as the
 * resolution source. Market creators on Polymarket / Limitless / Myriad adopt
 * unilaterally — no permission or partnership needed. Each template resolves
 * against /api/oracle/attest (Ed25519-signed) + the daily Proof-of-Index
 * digest anchored on Base.
 *
 * Strictly documentation of existing rails — no new judgments, no new data.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import DayVerifier from '@/components/oracle/DayVerifier'

export const revalidate = 3600

export const metadata = {
  title: 'Oracle — Resolution Criteria Cookbook · AgentCrush',
  description:
    'Use AgentCrush signed attestations as a prediction-market resolution source. Copy-paste market rule templates for agent liveness, tier, and Ghost Index questions. Ed25519-signed, anchored on Base daily.',
  alternates: { canonical: 'https://agentcrush.xyz/oracle' },
  openGraph: {
    title: 'AgentCrush Oracle — resolution-grade agent-economy data',
    description:
      'Signed, timestamped, on-chain-anchored attestations for agent liveness, tier, and the Ghost Index. Market-rule templates included.',
    url: 'https://agentcrush.xyz/oracle',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

const TEMPLATES = [
  {
    id: 'agent-liveness',
    color: '#39ff14',
    question: 'Will [AGENT] still be alive on [DATE]?',
    rule: `Resolves YES if the AgentCrush attestation for metric "liveness" on agent handle "[HANDLE]" (GET https://agentcrush.xyz/api/oracle/attest?metric=liveness&handle=[HANDLE]), requested between [DATE] 00:00 UTC and [DATE] 23:59 UTC, returns value.liveness = "alive". Resolves NO if it returns "ghost". The attestation is Ed25519-signed (public key: https://agentcrush.xyz/.well-known/agentcrush-oracle.json) and references the daily Proof-of-Index digest anchored on Base. Liveness methodology (30-day public-signal window): https://agentcrush.xyz/methodology`,
    note: 'The sharpest agent-economy question: most indexed agents go dark. Current base rate ~59% alive.',
  },
  {
    id: 'ghost-index-threshold',
    color: '#f97316',
    question: 'Will the AgentCrush Ghost Index cross [N]% before [DATE]?',
    rule: `Resolves YES if any AgentCrush attestation for metric "ghost_index" (GET https://agentcrush.xyz/api/oracle/attest?metric=ghost_index), requested on any day before [DATE] 23:59 UTC, returns value.liveness_score >= [N]. Daily values are also published free at https://agentcrush.xyz/api/ghost-index/v1 (?history=N for the full series). Each daily snapshot is digest-anchored on Base (Proof-of-Index: https://agentcrush.xyz/api/proof-of-index/v1).`,
    note: 'A macro bet on whether the agent economy is becoming more real or more dead.',
  },
  {
    id: 'tier-promotion',
    color: '#e91e80',
    question: 'Will [AGENT] reach evidence-ranked tier by [DATE]?',
    rule: `Resolves YES if the AgentCrush attestation for metric "tier" on agent handle "[HANDLE]" (GET https://agentcrush.xyz/api/oracle/attest?metric=tier&handle=[HANDLE]), requested between [DATE] 00:00 UTC and [DATE] 23:59 UTC, returns value.tier = "evidence_ranked". Tier methodology (per-category, public, versioned): https://agentcrush.xyz/methodology/views`,
    note: 'Resolution-grade because tier rules are published and versioned — disputes can audit the exact view SQL.',
  },
  {
    id: 'protocol-adoption',
    color: '#00d4ff',
    question: 'Will more than [N] indexed agents support x402 by [QUARTER]?',
    rule: `Resolves against the AgentCrush protocol-adoption readout (free: POST https://agentcrush.xyz/api/mcp/v1 tool "get_protocol_adoption", or the daily HuggingFace dataset export). Resolves YES if the x402-supporting agent count is greater than [N] on the last day of [QUARTER] (UTC). For a signed statement, request an attestation on that day and retain the response. Methodology: https://agentcrush.xyz/methodology`,
    note: 'Quarterly infrastructure bet. Pair with the Ghost Index to separate adoption from abandonment.',
  },
]

const VERIFY_STEPS = [
  ['1. Request', 'GET /api/oracle/attest?metric=…&handle=… — $0.25 via x402 on Base (USDC, paid in the request), or free with a Pro key.'],
  ['2. Check the signature', 'The response is a canonical-JSON statement signed with Ed25519. The public key is served at /.well-known/agentcrush-oracle.json.'],
  ['3. Check the anchor', 'The statement references the daily Proof-of-Index: a SHA-256 digest of that day\'s full snapshot export, posted as calldata on Base. Verify the tx hash at /api/proof-of-index/v1.'],
  ['4. Retain', 'Store the full attestation response. In a dispute, the signed statement + the on-chain digest are the evidence chain.'],
]

async function recentAnchoredDays() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data } = await supabase
      .from('snapshot_anchors')
      .select('snapshot_date, tx_hash')
      .order('snapshot_date', { ascending: false })
      .limit(14)
    return data || []
  } catch {
    return []
  }
}

export default async function OraclePage() {
  const days = await recentAnchoredDays()
  return (
    <main className="mx-auto max-w-[840px] px-4 md:px-6 py-14">
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Oracle · resolution criteria cookbook</p>
        <h1 className="font-mono text-2xl md:text-3xl font-bold text-white mb-3">
          Resolve markets against <span style={{ color: '#e91e80' }}>agent-economy data</span>
        </h1>
        <p className="font-mono text-xs text-white/50 leading-relaxed max-w-2xl">
          AgentCrush publishes signed, timestamped attestations over its index — agent liveness, tier,
          and the daily Ghost Index — each anchored to a SHA-256 digest posted on Base. That makes
          agent-economy questions resolvable: name the attestation endpoint in your market rules and
          anyone (including UMA proposers and disputers) can verify the answer cryptographically.
          No permission from us needed.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <a href="/api/oracle/attest?metric=ghost_index" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">attest endpoint</a>
          <a href="/.well-known/agentcrush-oracle.json" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">signing key</a>
          <a href="/api/proof-of-index/v1" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">proof-of-index</a>
          <Link href="/methodology" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">methodology</Link>
          <Link href="/pricing" className="font-mono text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition-colors">pricing</Link>
        </div>
      </header>

      {/* One-click day verifier (K14) */}
      {days.length > 0 && (
        <section className="mb-10 rounded-xl border border-[rgba(57,255,20,0.22)] bg-gradient-to-br from-[rgba(57,255,20,0.05)] to-transparent px-4 py-5 md:px-6">
          <h2 className="font-mono text-[15px] md:text-base font-bold text-white mb-1">
            Don&apos;t trust us — <span style={{ color: '#39ff14' }}>recompute us.</span>
          </h2>
          <p className="font-mono text-[11px] text-white/45 leading-relaxed mb-4 max-w-2xl">
            Pick a day and your browser will fetch that day&apos;s ~1,400 raw snapshot rows, hash every
            one with WebCrypto, fold the Merkle tree, and compare the root against the one we stored
            and anchored on Base. You are recomputing our daily record right now — we can&apos;t fake
            this result.
          </p>
          <DayVerifier days={days} />
        </section>
      )}

      {/* How verification works */}
      <section className="mb-10 rounded-lg border border-white/[0.07] bg-white/[0.015] px-4 py-4">
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white/70 mb-3">How a resolver verifies an attestation</h2>
        <div className="space-y-2.5">
          {VERIFY_STEPS.map(([step, text]) => (
            <div key={step} className="grid grid-cols-[110px_1fr] gap-2">
              <span className="font-mono text-[11px] font-bold text-[#00d4ff]">{step}</span>
              <span className="font-mono text-[11px] text-white/50 leading-relaxed">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white/70 mb-4">Copy-paste market rules</h2>
      <p className="font-mono text-[11px] text-white/40 mb-5 leading-relaxed">
        Replace the [BRACKETED] fields. Keep the endpoint, metric, and UTC window in the rule text —
        unambiguous resolution language is what survives a dispute. Never reference a page screenshot;
        always the signed endpoint.
      </p>

      <div className="space-y-4 mb-12">
        {TEMPLATES.map((t) => (
          <section key={t.id} id={t.id} className="rounded-lg border border-white/[0.07] bg-white/[0.015] px-4 py-4">
            <h3 className="font-mono text-sm font-bold mb-2" style={{ color: t.color }}>
              “{t.question}”
            </h3>
            <pre className="whitespace-pre-wrap break-words rounded border border-white/[0.06] bg-black/30 px-3 py-2.5 font-mono text-[11px] text-white/65 leading-relaxed mb-2">{t.rule}</pre>
            <p className="font-mono text-[10px] text-white/35">{t.note}</p>
          </section>
        ))}
      </div>

      {/* Neutrality + integrity */}
      <footer className="border-t border-white/[0.05] pt-5 space-y-3">
        <p className="font-mono text-[11px] text-white/45 leading-relaxed">
          <span className="text-white/70 font-bold">Neutrality:</span> AgentCrush does not trade any market
          that resolves against its own data. Attestations are strictly read-outs of the public index —
          the same numbers everyone sees at the free endpoints, signed.
        </p>
        <p className="font-mono text-[11px] text-white/45 leading-relaxed">
          <span className="text-white/70 font-bold">Dispute surface:</span> every scoring view is published
          verbatim at <Link href="/methodology/views" className="underline underline-offset-2 hover:text-white/70 transition-colors">/methodology/views</Link>,
          every methodology change is logged, and every daily snapshot is digest-anchored on Base. If you
          dispute an attestation, you can re-derive it.
        </p>
        <p className="font-mono text-[11px] text-white/45 leading-relaxed">
          <span className="text-white/70 font-bold">Verify independently:</span> a ~60-line, dependency-free{' '}
          <a href="https://github.com/kristof-sudo/agentcrush-app/blob/main/scripts/verify-agentcrush-day.mjs" className="underline underline-offset-2 hover:text-white/70 transition-colors">node script</a>{' '}
          recomputes any day&apos;s root from the public endpoints — no AgentCrush code required.{' '}
          <a href="https://github.com/kristof-sudo/agentcrush-app/blob/main/docs/verify-independently.md" className="underline underline-offset-2 hover:text-white/70 transition-colors">How it works →</a>
        </p>
        <p className="font-mono text-[10px] text-white/25">
          Building a market or an agent that consumes attestations? The full API surface is at{' '}
          <Link href="/developers" className="underline underline-offset-2 hover:text-white/50 transition-colors">/developers</Link>.
        </p>
      </footer>
    </main>
  )
}
