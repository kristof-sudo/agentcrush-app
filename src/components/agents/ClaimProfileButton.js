'use client'

import { useState } from 'react'

export default function ClaimProfileButton({ handle, claimStatus }) {
  const [phase, setPhase] = useState('idle') // idle | open | submitting | done | error
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Don't render if already claimed or verified
  if (claimStatus === 'verified' || claimStatus === 'claimed') return null

  async function submit(e) {
    e.preventDefault()
    if (!contact.trim()) return
    setPhase('submitting')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(handle)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), note: note.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit. Please try again.')
        setPhase('error')
      } else {
        setPhase('done')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
        <span className="text-[10px] text-emerald-400">Claim request submitted — we&apos;ll review within 2 business days.</span>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="mt-2 inline-flex items-center gap-2.5 rounded border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
        <span className="text-[10px] text-white/35">Is this your agent?</span>
        <button
          onClick={() => setPhase('open')}
          className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
        >
          Claim this profile →
        </button>
      </div>
    )
  }

  // open or error or submitting
  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2 rounded border border-white/[0.08] bg-white/[0.02] p-2.5 max-w-sm">
      <span className="text-[10px] font-semibold text-white/50">Claim this profile</span>

      <input
        type="text"
        required
        placeholder="Your email or X handle"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={200}
        className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-sky-500/40 transition-colors"
      />

      <input
        type="text"
        placeholder="Brief note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-sky-500/40 transition-colors"
      />

      {phase === 'error' && (
        <p className="text-[10px] text-red-400">{errorMsg}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={phase === 'submitting' || !contact.trim()}
          className="px-3 py-1 rounded border border-sky-500/30 bg-sky-500/10 text-[10px] font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-40 transition-colors"
        >
          {phase === 'submitting' ? 'Submitting…' : 'Submit claim'}
        </button>
        <button
          type="button"
          onClick={() => { setPhase('idle'); setErrorMsg('') }}
          className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-[9px] text-white/20 leading-relaxed">
        We review all claims manually. Verification may require proof of ownership.
      </p>
    </form>
  )
}
