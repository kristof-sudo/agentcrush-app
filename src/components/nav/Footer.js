import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.06] py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-white/25">© {new Date().getFullYear()} AgentCrush</p>
        <nav className="flex flex-wrap gap-5">
          <Link href="/rankings" className="text-xs text-white/35 hover:text-white/70 transition-colors">Rankings</Link>
          <Link href="/explore" className="text-xs text-white/35 hover:text-white/70 transition-colors">Explore</Link>
          <Link href="/methodology" className="text-xs text-white/35 hover:text-white/70 transition-colors">Methodology</Link>
          <Link href="/use-cases" className="text-xs text-white/35 hover:text-white/70 transition-colors">Use Cases</Link>
          <Link href="/developers" className="text-xs text-white/35 hover:text-white/70 transition-colors">Developers</Link>
          <Link href="/developers#api" className="text-xs text-white/35 hover:text-white/70 transition-colors">API</Link>
          <Link href="/developers#mcp" className="text-xs text-white/35 hover:text-white/70 transition-colors">MCP</Link>
          <Link href="/submit" className="text-xs text-white/35 hover:text-white/70 transition-colors">Submit Agent</Link>
          <Link href="/blog" className="text-xs text-white/35 hover:text-white/70 transition-colors">Blog</Link>
          <Link href="/agent-economy-index" className="text-xs text-white/35 hover:text-white/70 transition-colors">Agent Economy Index</Link>
        </nav>
      </div>
    </footer>
  )
}
