'use client'

import { useState } from 'react'
import Link from 'next/link'
import SearchBox from '@/components/nav/SearchBox'

const NAV_LINKS = [
  { href: '/rankings', label: 'Rankings' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/developers', label: 'Developers' },
  { href: '/submit', label: 'Submit' },
  { href: '/blog', label: 'Blog' },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex items-center justify-center h-8 w-8 rounded-md border border-white/[0.1] bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-colors sm:hidden"
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-white/[0.08] bg-[rgba(11,15,26,0.97)] backdrop-blur-xl px-4 py-4 sm:hidden"
          onClick={() => setOpen(false)}>
          <nav className="flex flex-col gap-1 mb-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div onClick={(e) => e.stopPropagation()}>
            <SearchBox mobile />
          </div>
        </div>
      )}
    </>
  )
}
