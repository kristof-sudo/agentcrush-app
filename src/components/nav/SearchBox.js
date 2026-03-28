'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBox({ mobile = false }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/rankings?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${mobile ? 'block' : 'hidden md:block'}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search agents…"
        className={`h-7 rounded border border-white/[0.1] bg-white/[0.04] pl-3 pr-7 text-xs text-white/70 placeholder-white/25 outline-none transition focus:border-white/[0.2] focus:bg-white/[0.07] ${mobile ? 'w-full' : 'w-40 focus:w-52'}`}
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
        aria-label="Search"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  )
}
