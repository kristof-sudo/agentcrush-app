import Link from 'next/link'
import Image from 'next/image'
import Container from '@/components/ui/Container'
import { supabaseAnon } from '@/lib/supabase'
import SearchBox from '@/components/nav/SearchBox'
import MobileMenu from '@/components/nav/MobileMenu'

async function getTrendingAgent() {
  try {
    const supabase = supabaseAnon()
    const { data } = await supabase
      .from('agents')
      .select('handle, display_name, weekly_delta')
      .gt('weekly_delta', 0)
      .order('weekly_delta', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data || null
  } catch {
    return null
  }
}

export default async function Header() {
  const trending = await getTrendingAgent()

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
              { href: '/use-cases', label: 'Use Cases' },
              { href: '/categories', label: 'Categories' },
              { href: '/submit', label: 'Submit' },
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

          {/* Right side: trending badge (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            {trending ? (
              <Link
                href={`/agent/${encodeURIComponent(trending.handle)}`}
                className="hidden items-center gap-1.5 rounded border border-[rgba(57,255,20,0.25)] bg-[rgba(57,255,20,0.06)] px-3 py-1.5 font-mono text-[11px] transition hover:bg-[rgba(57,255,20,0.12)] lg:flex"
              >
                <span className="font-semibold" style={{color:'#39ff14'}}>↑</span>
                <span className="max-w-[120px] truncate text-white/70">
                  {trending.display_name || trending.handle}
                </span>
                <span className="font-bold tabular-nums" style={{color:'#39ff14'}}>+{trending.weekly_delta}</span>
              </Link>
            ) : null}

            {/* Hamburger — mobile only */}
            <MobileMenu />
          </div>

        </div>
      </Container>
    </header>
  )
}
