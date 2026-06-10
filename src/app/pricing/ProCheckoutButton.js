'use client'

import { useState } from 'react'

export default function ProCheckoutButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function startCheckout() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pro/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setError(data?.error || 'Checkout unavailable — try again later.')
        setLoading(false)
      }
    } catch {
      setError('Checkout unavailable — try again later.')
      setLoading(false)
    }
  }

  return (
    <div className="mt-auto">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full text-center text-sm font-medium rounded-lg bg-[#00d4ff]/90 text-black hover:bg-[#00d4ff] transition-colors px-4 py-2 disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Get a Pro key'}
      </button>
      {error && <p className="text-xs text-red-400/80 mt-2">{error}</p>}
    </div>
  )
}
