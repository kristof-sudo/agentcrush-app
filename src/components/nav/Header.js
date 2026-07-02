import Link from 'next/link'
import Image from 'next/image'
import Container from '@/components/ui/Container'
import SearchBox from '@/components/nav/SearchBox'
import MobileMenu from '@/components/nav/MobileMenu'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(233,30,128,0.12)] bg-[#08080f]/90 backdrop-blur-xl">
      <Container>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-2.5 md:py-3">

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center transition hover:opacity-90"
          >
            <Image
              src="/agentcrush-logo.png"
              alt="AgentCrush"
              width={0}
              height={0}
              sizes="200px"
              className="h-9 w-auto"
              style={{ maxWidth: '200px' }}
              priority
            />
          </Link>

          {/* Desktop nav links + search */}
          <nav className="hidden items-center justify-center gap-5 sm:flex">
            {[
              { href: '/rankings', label: 'Rankings' },
              { href: '/ghost-index', label: 'Ghost Index' },
              { href: '/agent-economy-index', label: 'Economy' },
              { href: '/new', label: 'New' },
              { href: '/developers', label: 'Developers' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/submit', label: 'Submit' },
              { href: '/blog', label: 'Blog' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative font-mono text-[12px] font-semibold text-white/50 transition hover:text-white group"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#e91e80] transition-all group-hover:w-full" />
              </Link>
            ))}
            <SearchBox />
          </nav>

          {/* Right side: watchlist star + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <Link
              href="/watchlist"
              aria-label="Watchlist"
              title="Your watchlist"
              className="text-white/35 transition hover:text-[#facc15]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" strokeLinejoin="round" />
              </svg>
            </Link>
            <MobileMenu />
          </div>

        </div>
      </Container>
    </header>
  )
}
