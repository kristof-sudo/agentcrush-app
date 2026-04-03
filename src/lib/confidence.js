export function getConfidenceLevel(input = {}) {
  let score = 0

  const total = Number(input.score_total || 0)
  const visibility = Number(input.visibility_score || 0)
  const reputation = Number(input.reputation_score || 0)
  const weeklyDelta = Number(input.weekly_delta || 0)
  const eventCount = Number(input.eventCount || 0)
  const hasSignal = Boolean(input.latest_event_type || input.trending?.latest_event_type)
  const rank = Number(input.global_rank || 0)

  if (total >= 700) score += 2
  else if (total > 0) score += 1

  if (visibility > 0) score += 1
  if (reputation > 0) score += 1
  if (Math.abs(weeklyDelta) > 0) score += 1
  if (hasSignal) score += 1
  if (eventCount >= 3) score += 1
  if (rank > 0 && rank <= 50) score += 1

  if (score >= 6) {
    return {
      label: 'Strong signal',
      className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    }
  }

  if (score >= 3) {
    return {
      label: 'Some signal',
      className: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: 'Limited data',
    className: 'border-white/10 bg-white/[0.05] text-white/45',
  }
}
