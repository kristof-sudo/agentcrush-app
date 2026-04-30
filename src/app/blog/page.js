import Link from 'next/link'

export const metadata = {
  title: 'Blog · AgentCrush',
  description: 'Notes from building AgentCrush — the agent economy, x402, and the AI agent ecosystem.',
  alternates: {
    canonical: 'https://www.agentcrush.xyz/blog',
  },
  openGraph: {
    title: 'Blog · AgentCrush',
    description: 'Notes from building AgentCrush — the agent economy, x402, and the AI agent ecosystem.',
    url: 'https://www.agentcrush.xyz/blog',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://www.agentcrush.xyz/og-default.png',
        width: 1200,
        height: 630,
        alt: 'AgentCrush — AI Agent Rankings',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog · AgentCrush',
    description: 'Notes from building AgentCrush — the agent economy, x402, and the AI agent ecosystem.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
}

const POSTS = [
  {
    slug: 'x402-discovery-postmortem',
    title: "Working x402 payment isn't the same as working x402 discovery",
    date: 'April 30, 2026',
    summary:
      "Notes from getting AgentCrush indexed on Agentic.Market: the boring metadata gotchas that almost stopped me, and the checklist that finally worked.",
  },
]

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/70 mb-2">
          Blog
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Notes from the build
        </h1>
        <p className="mt-2 text-sm text-white/40 leading-relaxed">
          Field notes on the agent economy, x402 commerce, and building AgentCrush.
        </p>
      </div>

      <div className="space-y-6">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-5 hover:border-white/[0.12] transition-colors"
          >
            <time className="text-xs font-mono text-white/25 block mb-2">{post.date}</time>
            <h2 className="text-base font-semibold text-white leading-snug mb-2">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-[#e91e80] transition-colors"
              >
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-white/45 leading-relaxed mb-4">{post.summary}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
            >
              Read →
            </Link>
          </article>
        ))}
      </div>

    </main>
  )
}
