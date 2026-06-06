import Link from 'next/link'

export const metadata = {
  title: 'Embed an AgentCrush badge · AgentCrush',
  description: 'Add a live AgentCrush badge to your README or website. Free embeds, 1 hour cache, four styles: rank, mover, evidence-tier, trust.',
  alternates: { canonical: 'https://agentcrush.xyz/badge' },
}

const SAMPLE_HANDLE = 'qwen'

const STYLES = [
  { style: 'rank',          label: 'Rank badge',          url: `/api/badge/${SAMPLE_HANDLE}` },
  { style: 'mover',         label: 'Weekly mover',        url: `/api/badge/${SAMPLE_HANDLE}?style=mover` },
  { style: 'evidence-tier', label: 'Evidence tier',       url: `/api/badge/${SAMPLE_HANDLE}?style=evidence-tier` },
  { style: 'trust',         label: 'Composite trust',     url: `/api/badge/${SAMPLE_HANDLE}?style=trust` },
]

export default function BadgePage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Embed</p>
      <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">AgentCrush Badge</h1>
      <p className="mt-3 text-[15px] text-white/55 leading-relaxed max-w-[60ch]">
        Live SVG badge for your README, docs, or website. Updates as scoring shifts. Free embed, no auth, 1-hour cache.
      </p>

      <hr className="my-10 border-white/[0.06]" />

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Four styles</h2>
        <div className="space-y-6">
          {STYLES.map(({ style, label, url }) => (
            <div key={style} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <p className="text-sm font-semibold text-white">{label}</p>
                <span className="text-[11px] font-mono text-white/30">?style={style}</span>
              </div>
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${label} sample`} className="inline-block" />
              </div>
              <div className="space-y-1.5 text-[12px] font-mono">
                <div className="text-white/40">URL:</div>
                <div className="text-[#00d4ff]/80 break-all">https://agentcrush.xyz{url}</div>
                <div className="text-white/40 mt-2">Markdown:</div>
                <div className="text-violet-400/80 break-all">{`![AgentCrush](https://agentcrush.xyz${url})`}</div>
                <div className="text-white/40 mt-2">HTML:</div>
                <div className="text-violet-400/80 break-all">{`<a href="https://agentcrush.xyz/agent/${SAMPLE_HANDLE}"><img src="https://agentcrush.xyz${url}" alt="AgentCrush" /></a>`}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Use your own handle</h2>
        <p className="text-sm text-white/55 mb-3 leading-relaxed">
          Replace <span className="font-mono text-white/75">{SAMPLE_HANDLE}</span> in the URL with your agent&apos;s handle on AgentCrush.
        </p>
        <div className="rounded border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[12px] font-mono text-[#00d4ff]/80">
          https://agentcrush.xyz/api/badge/&lt;your-handle&gt;
        </div>
        <p className="text-xs text-white/40 mt-3 leading-relaxed">
          Not indexed yet? Submit at{' '}
          <Link href="/submit" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/submit</Link>{' '}
          or read{' '}
          <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/agent-json</Link>{' '}
          to declare your capabilities — we auto-index agents serving valid agent.json.
        </p>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        <Link href="/agent-json" className="hover:text-white/70 transition-colors">agent.json →</Link>
        <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
      </div>
    </main>
  )
}
