import Link from 'next/link'

export const metadata = {
  title: 'Blog · AgentCrush',
  description: 'Notes from building AgentCrush — the agent economy, x402, and the AI agent ecosystem.',
  alternates: {
    canonical: 'https://agentcrush.xyz/blog',
  },
  openGraph: {
    title: 'Blog · AgentCrush',
    description: 'Notes from building AgentCrush — the agent economy, x402, and the AI agent ecosystem.',
    url: 'https://agentcrush.xyz/blog',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-default.png',
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
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

const POSTS = [
  {
    slug: 'agent-commerce-readiness-three-audits',
    image: '/og-three-audits.png',
    imageAlt: 'The state of agent commerce readiness: three audits, three shapes of unfinished',
    title: 'The state of agent commerce readiness: three audits, three shapes of unfinished',
    date: 'May 13, 2026',
    summary:
      'We ran the Agent Commerce Readiness Audit against aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams in agent commerce are 80% built and 20% published. Spectrum, evidence, and roadmaps.',
  },
  {
    slug: 'first-cross-protocol-agent',
    image: '/og-cross-protocol-agent.png',
    imageAlt: 'First cross-protocol agent indexed: CrewAI on ERC-8004 and x402',
    title: 'The first cross-protocol agent: CrewAI on ERC-8004 and x402',
    date: 'May 8, 2026',
    summary:
      'A worked example of an agent active on two protocol surfaces at once — CrewAI registered on ERC-8004 (Base, token #17997) with x402_supported: true. What AgentCrush sees when we cross the data, and why multi-rail becomes the default.',
  },
  {
    slug: 'x402-discovery-postmortem',
    image: '/og-x402-postmortem.png',
    imageAlt: "Working x402 payment isn't the same as working x402 discovery",
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
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-colors"
          >
            <Link href={`/blog/${post.slug}`} className="block">
              <img
                src={post.image}
                alt={post.imageAlt}
                className="w-full h-auto"
              />
            </Link>
            <div className="px-5 py-5">
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
            </div>
          </article>
        ))}
      </div>

    </main>
  )
}
