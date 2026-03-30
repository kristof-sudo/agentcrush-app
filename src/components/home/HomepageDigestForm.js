'use client'

import { useState } from 'react'

export default function HomepageDigestForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim()) {
      setMessage('Enter an email to join the digest list.')
      return
    }

    console.log('AgentCrush digest signup:', email)
    setMessage('Thanks. Weekly digest signup is queued for launch.')
    setEmail('')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        className="h-11 flex-1 rounded-lg border border-white/[0.09] bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/40"
        aria-label="Email address"
      />
      <button
        type="submit"
        className="h-11 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
      >
        Get updates
      </button>
      {message ? <p className="text-xs text-white/45 sm:basis-full">{message}</p> : null}
    </form>
  )
}
