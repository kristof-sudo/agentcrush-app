const STEPS = [
  { label: 'WORLD', tone: 'border-white/15 text-white/80' },
  { label: 'X Scanner', tone: 'border-cyan-400/30 text-cyan-300' },
  { label: 'X Selector', tone: 'border-violet-400/30 text-violet-300' },
  { label: 'CopyDesk', tone: 'border-teal-400/30 text-teal-300' },
  { label: 'Canon Engine', tone: 'border-fuchsia-400/30 text-fuchsia-300' },
  { label: 'Scheduler', tone: 'border-amber-400/30 text-amber-300' },
  { label: 'Approval', tone: 'border-orange-400/30 text-orange-300' },
  { label: 'Publisher', tone: 'border-emerald-400/30 text-emerald-300' },
  { label: 'X', tone: 'border-slate-400/30 text-slate-300' },
]

export default function PipelineFlow() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-sm font-semibold text-white">System flow</div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`rounded-lg border px-3 py-2 ${step.tone}`}>
              {step.label}
            </div>
            {index < STEPS.length - 1 && (
              <div className="text-white/35">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
