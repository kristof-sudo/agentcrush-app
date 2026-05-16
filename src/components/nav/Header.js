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
              { href: '/methodology', label: 'Methodology' },
              { href: '/use-cases', label: 'Use Cases' },
              { href: '/developers', label: 'Developers' },
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

          {/* Right side: hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <MobileMenu />
          </div>

        </div>
      </Container>
    </header>
  )
}
