import Link from 'next/link'
import Image from 'next/image'
import Container from '@/components/ui/Container'
import { supabaseAnon } from '@/lib/supabase'

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
    <header className="sticky top-0 z-50 border-b border-white/[0.10] bg-[#0B0F1A]/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(91,108,255,0.10)]">
      <Container>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 md:py-5">

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center transition hover:opacity-90"
          >
            <Image
              src="/agentcrush-logo-transparent.png"
              alt="AgentCrush"
              width={34}
              height={34}
              className="h-8 w-8 object-contain md:h-9 md:w-9"
              priority
            />
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center justify-center gap-8 sm:flex">
            <Link
              href="/rankings"
              className="text-[15px] font-semibold tracking-[0.02em] text-white/72 transition hover:text-white"
            >
              Rankings
            </Link>
            <Link
              href="/categories"
              className="text-[15px] font-semibold tracking-[0.02em] text-white/72 transition hover:text-white"
            >
              Categories
            </Link>
            <Link
              href="/submit"
              className="text-[15px] font-semibold tracking-[0.02em] text-white/72 transition hover:text-white"
            >
              Submit
            </Link>
          </nav>

          {/* Trending indicator */}
          {trending ? (
            <Link
              href={`/agent/${encodeURIComponent(trending.handle)}`}
              className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[13px] transition hover:bg-emerald-500/20 lg:flex"
            >
              <span className="font-medium text-emerald-300">↑ Trending</span>
              <span className="max-w-[140px] truncate text-white/80">
                {trending.display_name || trending.handle}
              </span>
              <span className="font-semibold text-emerald-400">+{trending.weekly_delta}</span>
            </Link>
          ) : null}

          {/* Mobile menu links */}
          <div className="flex items-center gap-3 sm:hidden">
            <Link href="/rankings" className="text-xs font-semibold tracking-[0.02em] text-white/72 transition hover:text-white">Rankings</Link>
            <Link href="/categories" className="text-xs font-semibold tracking-[0.02em] text-white/72 transition hover:text-white">Categories</Link>
          </div>

        </div>
      </Container>
    </header>
  )
}
