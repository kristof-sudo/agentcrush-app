import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Agent Frameworks — Evidence-Ranked Comparison · AgentCrush',
  description:
    'CrewAI, LangGraph, AutoGPT, OpenClaw, and other AI agent frameworks ranked by multi-signal public evidence: GitHub activity, package usage, dependency adoption, docs quality, ecosystem links, discourse, trust signals.',
  alternates: { canonical: 'https://www.agentcrush.xyz/ai-agent-frameworks' },
  openGraph: {
    title: 'AI Agent Frameworks — AgentCrush',
    description: 'Evidence-ranked AI agent frameworks. CrewAI, LangGraph, AutoGPT, OpenClaw, and more — compared by public evidence.',
    url: 'https://www.agentcrush.xyz/ai-agent-frameworks',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AI Agent Frameworks — AgentCrush' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Frameworks — AgentCrush',
    description: 'Evidence-ranked AI agent frameworks compared by public evidence.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
}

async function fetchTopFrameworks() {
  const supabase = supabaseAnon()
  try {
    const { data } = await supabase
      .from('agent_score_v2_top50_public_candidate')
      .select('handle, rank_v2_c_public, score_v2_c_public_candidate, github_score, package_usage_score, dependency_score, docs_quality_score, ecosystem_score, hn_score, trust_score, coverage_tier')
      .eq('evidence_ready_for_public_rank', true)
      .order('rank_v2_c_public', { ascending: true })
      .limit(15)
    if (!data) return []
    const handles = data.map(r => r.handle)
    const { data: agents } = await supabase
      .from('agents')
      .select('handle, display_name, archetype, tagline')
      .in('handle', handles)
    const byHandle = Object.fromEntries((agents || []).map(a => [a.handle, a]))
    return data.map(r => ({ ...r, ...(byHandle[r.handle] || {}) }))
  } catch { return [] }
}

export default async function AiAgentFrameworksPage() {
  const top = await fetchTopFrameworks()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'AI Agent Frameworks — Evidence-Ranked',
    description: 'CrewAI, LangGraph, AutoGPT, OpenClaw, and other AI agent frameworks ranked by multi-signal public evidence.',
    url: 'https://www.agentcrush.xyz/ai-agent-frameworks',
    dateModified: '2026-05-16',
    author: { '@type': 'Organization', name: 'AgentCrush' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://www.agentcrush.xyz' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.agentcrush.xyz/ai-agent-frameworks' },
    mentions: top.slice(0, 10).map(r => ({
      '@type': 'SoftwareApplication',
      name: r.display_name || r.handle,
      url: `https://www.agentcrush.xyz/agent/${r.handle}`,
      applicationCategory: 'AI Agent Framework',
    })),
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        <span className="mx-2 text-white/15">/</span>
        AI agent frameworks
      </p>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Canonical reference</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">AI agent frameworks</h1>
        <p className="text-base text-white/75 leading-relaxed max-w-2xl">
          AI agent frameworks let developers build agents that plan, act, and iterate toward a goal — calling LLMs, tools, and external APIs as needed. The major options in 2026 include CrewAI (multi-agent crews), LangGraph (stateful graphs), AutoGPT (early autonomous loop), OpenClaw (operator agent), Browser Use (browser automation), Aider (coding agent), and dozens of others. AgentCrush ranks them by multi-signal public evidence: GitHub activity, package usage, dependency adoption, docs quality, ecosystem links, public discourse, and trust signals. Popularity is not the same as production fit — every ranking entry shows its work.
        </p>
        <p className="text-xs text-white/35 mt-4 font-mono">Last updated 2026-05-16 · methodology v2.c-public</p>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">How AgentCrush ranks frameworks</h2>
        <p className="text-sm text-white/65 leading-relaxed mb-4">
          The developer-category methodology weights signals dynamically per agent based on which data is available. Seven signal sources contribute to the composite:
        </p>
        <ul className="space-y-1.5 text-sm text-white/65 list-disc list-outside pl-5">
          <li><span className="text-white/85">GitHub activity</span> — stars, commits, contributors, recency</li>
          <li><span className="text-white/85">Package usage</span> — npm / PyPI download volume</li>
          <li><span className="text-white/85">Dependency adoption</span> — reverse-dependencies (how many other projects depend on this)</li>
          <li><span className="text-white/85">Docs quality</span> — README depth, API docs, examples coverage</li>
          <li><span className="text-white/85">Ecosystem relationships</span> — cross-referenced with other indexed agents</li>
          <li><span className="text-white/85">Discourse</span> — Hacker News story / comment activity</li>
          <li><span className="text-white/85">Trust signals</span> — registry context, identity attestation</li>
        </ul>
        <p className="text-sm text-white/55 leading-relaxed mt-4">
          A framework is <em>evidence-ranked</em> when it meets a multi-signal coverage threshold, OR ranks in the top 100, OR has a single signal ≥ 90 with at least 2 corroborating signals &gt; 50. See <Link href="/how-we-rank" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/how-we-rank</Link> for the full methodology.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Top evidence-ranked developer agents</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-4">
          Live snapshot from the developer-category ranking. Each row shows sub-scores per signal (0–100, NULL where unmeasured).
        </p>

        {top.length === 0 ? (
          <p className="text-sm text-white/45">Live ranking temporarily unavailable. See <Link href="/rankings" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/rankings</Link>.</p>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
              <span>#</span><span>Agent</span><span className="text-right">GH</span><span className="text-right">PKG</span><span className="text-right">Score</span>
            </div>
            {top.map(r => (
              <Link key={r.handle} href={`/agent/${r.handle}`} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 items-center border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors">
                <span className="text-xs font-mono text-white/35 tabular-nums">#{r.rank_v2_c_public}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{r.display_name || r.handle}</div>
                  {r.tagline && <div className="text-[11px] text-white/45 truncate mt-0.5">{r.tagline.slice(0, 80)}</div>}
                </div>
                <span className="text-xs font-mono tabular-nums text-white/55">{r.github_score ?? '—'}</span>
                <span className="text-xs font-mono tabular-nums text-white/55">{r.package_usage_score ?? '—'}</span>
                <span className="text-sm font-mono font-bold tabular-nums text-emerald-300">{r.score_v2_c_public_candidate ?? '—'}</span>
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-white/40 mt-3">
          Full ranking: <Link href="/rankings" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/rankings</Link>
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Framework categories vs related agent types</h2>
        <div className="space-y-4 text-sm text-white/65 leading-relaxed">
          <p>
            <span className="text-white/90 font-semibold">Frameworks / SDKs</span> — libraries you compose into an agent (CrewAI, LangGraph). You ship the deployment.
          </p>
          <p>
            <span className="text-white/90 font-semibold">Deployable platforms</span> — opinionated runtimes that host your agent (Mendable, OpenServ, Daydreams).
          </p>
          <p>
            <span className="text-white/90 font-semibold">Persistent runtimes</span> — agents designed to run continuously (autonomous trading agents, ops bots).
          </p>
          <p>
            <span className="text-white/90 font-semibold">Browser / voice / coding agents</span> — agents specialized for a modality (Browser Use, Skyvern for browser; ElevenLabs Agents for voice; Aider, OpenHands for code).
          </p>
        </div>
        <p className="text-sm text-white/55 leading-relaxed mt-4">
          AgentCrush tracks all of these under the <Link href="/categories" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">developer category</Link>. Model families (Claude, GPT, Llama, Qwen) are tracked separately under <Link href="/rankings/model-families" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/rankings/model-families</Link>.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Common comparisons</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-4">
          Side-by-side evidence comparisons of frequently-asked framework pairs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { a: 'crewai',   b: 'langgraph',         label: 'CrewAI vs LangGraph' },
            { a: 'autogpt',  b: 'crewai',            label: 'AutoGPT vs CrewAI' },
            { a: 'langchainagents', b: 'langgraph',  label: 'LangChain Agents vs LangGraph' },
            { a: 'crewai',   b: 'openhands',         label: 'CrewAI vs OpenHands' },
          ].map(c => (
            <Link key={c.label} href={`/compare/${c.a}-vs-${c.b}`} className="rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-colors px-4 py-3">
              <span className="text-sm font-semibold text-white">{c.label}</span>
              <div className="text-[11px] text-white/45 mt-1">→ /compare/{c.a}-vs-{c.b}</div>
            </Link>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-3">
          See all <Link href="/compare" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">comparisons</Link>.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">Limitations</h2>
        <ul className="space-y-2 text-sm text-white/55 leading-relaxed list-disc list-outside pl-5">
          <li>Popularity is not production fit. A framework with millions of GitHub stars may not be the right choice for a specific use case.</li>
          <li>AgentCrush evidence is public-source only. Internal performance, support quality, and roadmap signals are not measured.</li>
          <li>The framework category overlaps with deployable platforms and runtimes. Some agents qualify across boundaries — see the agent's profile for primary + secondary categorization.</li>
          <li>Methodology weights are dynamic per agent. Two frameworks with the same composite score may have very different signal coverage; check sub-scores.</li>
          <li>This is not investment advice and not a paid-placement ranking.</li>
        </ul>
      </section>

      <section className="mb-10 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] px-5 py-4">
        <h2 className="text-base font-bold mb-1">For LLM clients</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Query frameworks via MCP: <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">search_agents(query: &quot;framework&quot;, filters: &#123; primary_category: &quot;developer&quot;, evidence_ranked_only: true &#125;)</code>. Or retrieve flat summaries at <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-violet-300">/api/agent/&#123;handle&#125;/llm-summary</code>. Full MCP docs: <Link href="/developers/mcp" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/developers/mcp</Link>.
        </p>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">Developer Rankings →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
        <Link href="/compare" className="hover:text-white/70 transition-colors">Compare agents →</Link>
        <Link href="/find" className="hover:text-white/70 transition-colors">Find an agent →</Link>
      </div>
    </main>
  )
}
