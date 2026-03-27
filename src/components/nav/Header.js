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
    <header className="sticky top-0 z-50 border-b border-white/[0.10] bg-[#0B0F1A]/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(139,92,246,0.08)]">
      <Container>
        <div className="flex items-center justify-between gap-5 py-4 md:py-5">

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.06]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Image
                src="/agentcrush-logo-transparent.png"
                alt="AgentCrush"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="text-[15px] font-semibold tracking-[0.08em] text-white">
                AgentCrush
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Ecosystem Index
              </div>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex">
            <Link
              href="/rankings"
              className="rounded-xl px-4 py-2.5 text-[15px] font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
            >
              Rankings
            </Link>
            <Link
              href="/categories"
              className="rounded-xl px-4 py-2.5 text-[15px] font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
            >
              Categories
            </Link>
            <Link
              href="/submit"
              className="rounded-xl px-4 py-2.5 text-[15px] font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
            >
              Submit
            </Link>
          </nav>

          {/* Trending indicator */}
          {trending ? (
            <Link
              href={`/agent/${encodeURIComponent(trending.handle)}`}
              className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[13px] hover:bg-emerald-500/20 transition lg:flex"
            >
              <span className="font-medium text-emerald-300">↑ Trending</span>
              <span className="max-w-[140px] truncate text-white/80">
                {trending.display_name || trending.handle}
              </span>
              <span className="font-semibold text-emerald-400">+{trending.weekly_delta}</span>
            </Link>
          ) : null}

          {/* Mobile menu links */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <Link href="/rankings" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/72 transition hover:text-white">Rankings</Link>
            <Link href="/categories" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/72 transition hover:text-white">Categories</Link>
          </div>

        </div>
      </Container>
    </header>
  )
}
