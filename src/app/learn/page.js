import Link from 'next/link'

export const metadata = {
  title: 'Learn — What are AI agents? | AgentCrush',
  description:
    'A plain-language intro to AI agents, the agent economy, and why this matters now. No jargon. No prior knowledge needed.',
  alternates: {
    canonical: 'https://agentcrush.xyz/learn',
  },
  openGraph: {
    title: 'Learn — What are AI agents? | AgentCrush',
    description:
      'A plain-language intro to AI agents, the agent economy, and why this matters now.',
    url: 'https://agentcrush.xyz/learn',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — Learn about AI agents' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn — What are AI agents? | AgentCrush',
    description:
      'A plain-language intro to AI agents, the agent economy, and why this matters now.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

export default function LearnPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        <span className="mx-2 text-white/15">/</span>
        Learn
      </p>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        What are AI agents?
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        A plain-language intro. No jargon. No prior knowledge needed.
      </p>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-6 text-[15px] text-white/70 leading-[1.75]">

        {/* Section 1 — what's an agent */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white pt-2">An AI agent isn&apos;t just a chatbot.</h2>
          <p>
            When you type a message into ChatGPT, you&apos;re using a <span className="text-white/90">language model</span>. It responds to you. One turn at a time. You ask, it answers.
          </p>
          <p>
            An <span className="text-white/90">AI agent</span> is the same kind of model, but wrapped in code that lets it{' '}
            <em className="text-amber-300/90 not-italic font-medium">do things</em>. It can browse the web, run programs, send emails, query databases, write code, file pull requests, and increasingly — buy things, sign contracts, and coordinate with other agents.
          </p>
          <p>
            The difference between a chatbot and an agent is the difference between a stranger you ask a question to, and an assistant you give a goal to.
          </p>
        </section>

        {/* Section 2 — categories */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white pt-4">There are different kinds of agents.</h2>
          <p>
            Not all agents do the same thing. The ones we index fall into roughly five categories:
          </p>
          <ul className="space-y-3 mt-2">
            <li className="flex gap-3">
              <span className="text-violet-400/80 font-mono text-xs uppercase tracking-wider mt-0.5 shrink-0 w-24">Builder</span>
              <span className="text-white/55">Code. Cursor, Devin, Claude Code, Aider. They write software.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400/80 font-mono text-xs uppercase tracking-wider mt-0.5 shrink-0 w-24">Researcher</span>
              <span className="text-white/55">Search and synthesize. Perplexity, Elicit, NotebookLM.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400/80 font-mono text-xs uppercase tracking-wider mt-0.5 shrink-0 w-24">Operator</span>
              <span className="text-white/55">Orchestrate workflows. LangChain, CrewAI, AutoGen. They run multi-step jobs.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400/80 font-mono text-xs uppercase tracking-wider mt-0.5 shrink-0 w-24">Trader</span>
              <span className="text-white/55">Crypto/markets. aixbt, Zerebro, Griffain. They watch prices, trade, post commentary.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400/80 font-mono text-xs uppercase tracking-wider mt-0.5 shrink-0 w-24">Creator</span>
              <span className="text-white/55">Make media. Suno, ElevenLabs, Runway. They generate audio, voice, video.</span>
            </li>
          </ul>
          <p className="mt-3">
            We track over 1,390 agents across these categories. Some are early experiments. Some are processing real money. The differences matter.
          </p>
        </section>

        {/* Section 3 — agent economy */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white pt-4">The &quot;agent economy&quot; is real, and it&apos;s starting now.</h2>
          <p>
            For most of the last decade, agents were a research curiosity. They didn&apos;t actually do anything outside a demo.
          </p>
          <p>
            That changed in 2025-2026. Three things happened at once:
          </p>
          <ol className="list-decimal pl-5 space-y-2 marker:text-white/30">
            <li>
              Language models got reliable enough to act on goals, not just answer questions.
            </li>
            <li>
              <span className="text-white/90">Standards emerged</span> — protocols like x402 (machine payments in USDC), ERC-8004 (agent identity onchain), MCP (tool interfaces), AP2 (payment intents). Suddenly agents can find each other, pay each other, and prove who they are.
            </li>
            <li>
              <span className="text-white/90">Companies started shipping</span> — Coinbase&apos;s CDP Bazaar lists agent-payable APIs. AWS Bedrock AgentCore launched with x402 as default. Visa, Stripe, and others added agent-payment rails.
            </li>
          </ol>
          <p>
            For the first time, agents can transact. With humans, with services, and with each other.
          </p>
        </section>

        {/* Section 4 — why agentcrush */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white pt-4">So where does AgentCrush fit?</h2>
          <p>
            If you imagine the agent economy as the early internet, AgentCrush is the directory.
          </p>
          <p>
            Of all the agents being launched — research projects, startups, crypto bots, enterprise tools — which ones are actually worth paying attention to? Which ones are real? Which ones have shown up consistently? Which ones already work across the new protocols?
          </p>
          <p>
            We answer that with public data: GitHub activity, ecosystem integrations, x402 endpoints live, ERC-8004 registrations, MCP servers, Bazaar listings. We don&apos;t pick favorites — we rank by evidence.
          </p>
          <p>
            Think CoinMarketCap for AI agents. Bloomberg for the agent economy. A neutral reference where humans and other agents can check who&apos;s real.
          </p>
        </section>

        {/* Section 5 — where to go next */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white pt-4">Where to go from here.</h2>
          <p>Pick the path that matches where you are right now:</p>

          <div className="grid gap-3 mt-3">
            <Link href="/rankings" className="block rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] px-4 py-3 hover:border-emerald-400/40 hover:bg-emerald-400/[0.08] transition-colors group">
              <div className="text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">Browse the rankings →</div>
              <div className="text-xs text-white/45 mt-1">See which agents are scoring highest right now, by category.</div>
            </Link>

            <Link href="/blog" className="block rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 hover:border-white/[0.15] transition-colors group">
              <div className="text-sm font-semibold text-white/80 group-hover:text-white">Read our blog →</div>
              <div className="text-xs text-white/45 mt-1">Field notes from auditing real agents and the protocols they ship on.</div>
            </Link>

            <Link href="/categories" className="block rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 hover:border-white/[0.15] transition-colors group">
              <div className="text-sm font-semibold text-white/80 group-hover:text-white">Explore by category →</div>
              <div className="text-xs text-white/45 mt-1">Builder, Researcher, Operator, Trader, Creator. Pick what you need.</div>
            </Link>

            <Link href="/how-we-rank" className="block rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 hover:border-white/[0.15] transition-colors group">
              <div className="text-sm font-semibold text-white/80 group-hover:text-white">How we rank →</div>
              <div className="text-xs text-white/45 mt-1">Our methodology. Evidence signals, tiers, what counts and what doesn&apos;t.</div>
            </Link>
          </div>
        </section>

        {/* Section 6 — closing */}
        <section className="space-y-4 pt-4">
          <p className="text-white/55 italic">
            This is the early internet of agents. Most of the interesting stuff hasn&apos;t happened yet. The companies that figure out where to plug in early will own the next phase.
          </p>
          <p className="text-white/55 italic">
            Welcome to the index.
          </p>
        </section>

      </div>
    </main>
  )
}
