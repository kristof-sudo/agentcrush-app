import { getConfidenceLevel } from '@/lib/confidence'

export default function ConfidencePill({ data, prefix = 'Confidence' }) {
  const confidence = getConfidenceLevel(data)

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${confidence.className}`}>
      {prefix}: {confidence.label}
    </span>
  )
}
