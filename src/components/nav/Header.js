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
        <div className="flex items-center justify-between py-4 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/agentcrush-logo-transparent.png"
              alt="AgentCrush"
              width={160}
              height={40}
              className="h-6 w-auto"
              priority
            />
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/rankings"
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition"
            >
              Rankings
            </Link>
            <Link
              href="/categories"
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition"
            >
              Categories
            </Link>
            <Link
              href="/submit"
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition"
            >
              Submit
            </Link>
          </nav>

          {/* Trending indicator */}
          {trending ? (
            <Link
              href={`/agent/${encodeURIComponent(trending.handle)}`}
              className="hidden md:flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs hover:bg-emerald-500/20 transition"
            >
              <span className="text-emerald-300 font-medium">↑ Trending</span>
              <span className="text-white/80 truncate max-w-[120px]">
                {trending.display_name || trending.handle}
              </span>
              <span className="text-emerald-400 font-semibold">+{trending.weekly_delta}</span>
            </Link>
          ) : null}

          {/* Mobile menu links */}
          <div className="sm:hidden flex items-center gap-2">
            <Link href="/rankings" className="text-xs text-white/60 hover:text-white transition">Rankings</Link>
            <Link href="/categories" className="text-xs text-white/60 hover:text-white transition">Categories</Link>
          </div>

        </div>
      </Container>
    </header>
  )
}
