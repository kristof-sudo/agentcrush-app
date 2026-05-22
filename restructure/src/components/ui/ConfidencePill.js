import { getConfidenceLevel } from '@/lib/confidence'

export default function ConfidencePill({ data }) {
  const signal = getConfidenceLevel(data)

  return (
    <span
      title="Data coverage — how much signal AgentCrush has collected for this agent. Not a measure of trustworthiness."
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none cursor-help ${signal.className}`}
    >
      {signal.label}
    </span>
  )
}
