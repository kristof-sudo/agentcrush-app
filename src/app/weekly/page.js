import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { currentIsoWeek, formatWeekId, formatWeekPeriod } from '@/lib/iso-week'

export const dynamic = 'force-dynamic'
export const revalidate = 600

export const metadata = {
  title: 'Digest Archive · AgentCrush',
  description: 'Signal digest archive from the AgentCrush index — ranking moves, ecosystem events, protocol activity. Published monthly as State of the Index.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
}

// Hand-curated issues with editorial summaries.
const CURATED = [
  {
    week: 'state-2026-08',
    label: 'State of the Index — August 2026',
    summary: 'Ghost Index closed at 54.0%, down 1.7 points across August (55.7% → 54.0%). Evidence-ranked tier grew from 162 to 191 (+29 promotions). Developer board: openclaw fell to #3 as OpenAI Agents Python climbed to #2. Service board: agent-teams-ai entered top 5. 135,267 daily snapshots archived.',
    href: '/weekly/state-2026-08',
  },
  {
    week: 'state-2026-07',
    label: 'State of the Index — July 2026',
    summary: 'Ghost Index closed at 55.7%, down 2.8 points across July (58.5% → 55.7%). Evidence-ranked tier grew from 145 to 162. CrewAI moved to #1 on the Developer board. 91,114 daily snapshots archived. All four boards at month close.',
    href: '/weekly/state-2026-07',
  },
  {
    week: '2026-W30',
    label: 'W30 · July 20–26, 2026',
    summary: 'The settlement layer got measured. x402register spent eight days probing every public x402 endpoint independently — 95% of volume in one routing pair, ~$37K/mo total. Base cemented 85–92% share of agent settlement. The identity-to-reputation gap hardened into product builds. 1,413 indexed, 56.6% alive.',
    href: '/weekly/2026-W30',
  },
  {
    week: '2026-W29',
    label: 'W29 · July 13–19, 2026',
    summary: 'The verdict moves into the payment path. The ERC-8004 pattern crossed chains (HANKO on Solana), the agent-verification layer got visibly crowded, compliance showed up as a machine-payable x402 vertical — and we shipped Guard, a free deterministic pre-settlement check on any x402 payment address, wired wallet-binding integrity into counterparty verdicts, and fixed our own machine-facing endpoint that had been under-reporting a 72,756-snapshot archive as zero.',
    href: '/weekly/2026-W29',
  },
  {
    week: '2026-W28',
    label: 'W28 · July 6–12, 2026',
    summary: 'Identity is table stakes; the contested layer is proof. The agent economy spent the week building it — ERC-8004 reputation leaderboards, github-signed execution receipts, on-chain tool registries, A2A spec-hardening — while we published a lesson in reading proof honestly (why our MCP category reads 100% and tokenized reads 0%, both instrument artifacts, not verdicts), hardened Virtuals coverage to 57,606 agents, and corrected our evidence-ranked count to 145.',
    href: '/weekly/2026-W28',
  },
  {
    week: '2026-W27',
    label: 'W27 · June 29 – July 5, 2026',
    summary: 'The ecosystem asked what happens when agents disagree; we shipped the evidence layer — one-click verification against Base, per-agent proofs, full history on every profile, the Ghost Report (43 famous names, 404k stars, silent), and dead-agent alerts. Plus an honest note on our own three-day paywall outage.',
    href: '/weekly/2026-W27',
  },
  {
    week: '2026-W26',
    label: 'W26 · June 22–28, 2026',
    summary: 'Forty thousand agents started trading real assets and the x402 conversation consolidated around trust — so we made our own numbers checkable: a verifiable historic record, a third (runtime) signal family, and the W24 service-liveness gap closed (0% → 97.9%).',
    href: '/weekly/2026-W26',
  },
  {
    week: '2026-W25',
    label: 'W25 · June 15–21, 2026',
    summary: 'No standalone issue — W25 signals were consolidated into the W26 digest during the Ghost Index recount.',
    href: '/weekly/2026-W26',
  },
  {
    week: '2026-W24',
    label: 'W24 · June 8–14, 2026',
    summary: 'The agents making real money are invisible: the x402 Demand Leaderboard finds the top earners unindexed, the "agent demand" number turns out ~99.8% bots, and trust scoring becomes an IETF draft.',
    href: '/weekly/2026-W24',
  },
  {
    week: '2026-W23',
    label: 'W23 · June 2–8, 2026',
    summary: 'MCP Server Index launches as the 5th category ranking. ERC-8004 trust layer tooling arrives in a cluster (Boon, Argus, avisradar). Autonomous pipeline — 8 timers — goes live.',
    href: '/weekly/2026-W23',
  },
  {
    week: '2026-W22',
    label: 'W22 · May 25–31, 2026',
    summary: 'Confidence tiers extended to every category, risk-flag infrastructure ships, and the Agent Payments Stack gets its full LLM Gateway treatment.',
    href: '/weekly/2026-W22',
  },
  {
    week: '2026-W21',
    label: 'W21 · May 18–24, 2026',
    summary: 'Where the four category rankings stand, the Agent Payments Stack index goes live, and confidence tiers ship on every score.',
    href: '/weekly/2026-W21',
  },
]

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createClient(url, key)
}

async function autoGenerated() {
  // List of week_ids in the Supabase weekly_digest_sections table (excluding curated weeks).
  try {
    const supabase = db()
    const { data } = await supabase
      .from('weekly_digest_sections')
      .select('week_id, briefs_included, generated_at, ecosystem_section')
      .order('week_id', { ascending: false })
    if (!data) return []
    const curatedSet = new Set(CURATED.map(c => c.week))
    return data
      .filter(r => !curatedSet.has(r.week_id))
      .map(r => ({
        week: r.week_id,
        label: (() => {
          const m = r.week_id.match(/^(\d{4})-W(\d{1,2})$/)
          if (!m) return r.week_id
          return `W${Number(m[2])} · ${formatWeekPeriod(Number(m[1]), Number(m[2]))}`
        })(),
        // Lead with the actual editorial — the ecosystem section's opening line —
        // never a "how it was made" label.
        summary: ((r.ecosystem_section || '').trim().split(/(?<=[.!?])\s/)[0] || '').slice(0, 190)
          || 'Where the rankings stand, what shipped, and the protocol signals that moved the agent economy.',
        href: `/weekly/${r.week_id}`,
      }))
  } catch {
    return []
  }
}

export default async function WeeklyIndexPage() {
  const auto = await autoGenerated()
  // Merge auto-generated + curated, dedup by week, then sort newest-first.
  // Curated takes precedence over auto for the same week (CURATED iterated first
  // in the dedup); ISO week IDs (YYYY-Www) sort chronologically as strings.
  const seen = new Set()
  const issues = [...CURATED, ...auto]
    .filter(i => {
      if (seen.has(i.week)) return false
      seen.add(i.week)
      return true
    })
    .sort((a, b) => b.week.localeCompare(a.week))

  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
          Digest Archive
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          AgentCrush Weekly
        </h1>
        <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-lg">
          Ranking moves, ecosystem signals, and protocol activity from the AgentCrush index.
          Now published monthly as State of the Index.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/weekly.xml"
            className="text-xs font-mono text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors border border-[#00d4ff]/20 rounded px-3 py-1.5"
          >
            RSS feed →
          </a>
        </div>
      </div>

      <div className="space-y-4">
        {issues.map((issue) => (
          <Link
            key={issue.week}
            href={issue.href}
            className="block rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 hover:border-white/[0.14] hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-xs font-mono text-[#00d4ff]/70">{issue.label}</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
              {issue.summary}
            </p>
            <p className="text-xs font-mono text-violet-400/50 mt-2 group-hover:text-violet-300 transition-colors">
              Read →
            </p>
          </Link>
        ))}
      </div>

    </main>
  )
}
