'use client'

/**
 * /pricing/success?session_id=cs_...
 *
 * Post-checkout landing: polls /api/keys/by-session until the webhook has
 * issued the key, then shows it exactly once.
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessInner() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'error', message: 'Missing session_id.' })
      return
    }
    let attempts = 0
    let cancelled = false

    async function poll() {
      attempts += 1
      try {
        const res = await fetch(`/api/keys/by-session?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (cancelled) return
        if (res.status === 202 && attempts < 10) {
          setTimeout(poll, 2000)
          return
        }
        if (data.api_key) {
          setState({ status: 'key', key: data.api_key })
        } else if (data.key_prefix) {
          setState({ status: 'claimed', prefix: data.key_prefix, note: data.note })
        } else {
          setState({ status: 'error', message: data.error || data.message || 'Key not found yet — contact contact@agentcrush.xyz.' })
        }
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Network error — refresh this page.' })
      }
    }
    poll()
    return () => { cancelled = true }
  }, [sessionId])

  return (
    <main className="mx-auto max-w-[640px] px-4 md:px-6 py-14">
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re in.</h1>
      <p className="text-sm text-white/45 mb-8">AgentCrush Pro API is active.</p>

      {state.status === 'loading' && (
        <p className="text-sm text-white/55">Issuing your API key…</p>
      )}

      {state.status === 'key' && (
        <div className="rounded-xl border border-[#00d4ff]/30 p-5 bg-[#00d4ff]/[0.03]">
          <p className="text-xs text-white/40 mb-2">Your API key — shown exactly once. Store it now.</p>
          <code className="block font-mono text-sm text-white break-all select-all mb-4">{state.key}</code>
          <p className="text-xs text-white/45 leading-relaxed">
            Use it as <code className="font-mono text-white/65">X-API-Key</code> on any endpoint.
            Try:{' '}
            <code className="font-mono text-white/65 break-all">
              curl -H &quot;X-API-Key: {state.key.slice(0, 15)}…&quot; https://agentcrush.xyz/api/trust/evaluate/full?handle=crewai
            </code>
          </p>
        </div>
      )}

      {state.status === 'claimed' && (
        <div className="rounded-xl border border-white/[0.08] p-5">
          <p className="text-sm text-white/55">
            Key <code className="font-mono">{state.prefix}…</code> was already retrieved. {state.note}
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-xl border border-red-400/20 p-5">
          <p className="text-sm text-red-400/80">{state.message}</p>
        </div>
      )}

      <div className="border-t border-white/[0.06] mt-12 pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/developers" className="hover:text-white/70 transition-colors">API docs →</Link>
        <Link href="/pricing" className="hover:text-white/70 transition-colors">Pricing →</Link>
      </div>
    </main>
  )
}

export default function PricingSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[640px] px-4 py-14 text-sm text-white/45">Loading…</main>}>
      <SuccessInner />
    </Suspense>
  )
}
