/**
 * why-moving.js — single source of truth for all "why is this agent moving" logic.
 *
 * Rules:
 * - Deterministic only. No invented reasons.
 * - 1 reason per surface, max.
 * - All signal strings derive from real event_type values.
 */

// Short badge labels — used in chips/tags across all surfaces
export const SIGNAL_TAGS = {
  launch_buzz:           { label: 'launch',      cls: 'bg-violet-500/15 text-violet-300/80 border-violet-500/25' },
  audience_spike:        { label: 'X spike',     cls: 'bg-emerald-500/15 text-emerald-300/80 border-emerald-500/25' },
  repo_star_growth:      { label: 'repo↑',       cls: 'bg-yellow-500/15 text-yellow-300/80 border-yellow-500/25' },
  repo_release:          { label: 'release',     cls: 'bg-blue-500/15 text-blue-300/80 border-blue-500/25' },
  collab_win:            { label: 'collab',      cls: 'bg-sky-500/15 text-sky-300/80 border-sky-500/25' },
  ranking_jump:          { label: 'rising',      cls: 'bg-emerald-500/15 text-emerald-300/80 border-emerald-500/25' },
  dev_activity:          { label: 'dev active',  cls: 'bg-slate-500/15 text-slate-300/80 border-slate-500/25' },
  ecosystem_integration: { label: 'integration', cls: 'bg-cyan-500/15 text-cyan-300/80 border-cyan-500/25' },
  canon_scene:           { label: 'milestone',   cls: 'bg-indigo-500/15 text-indigo-300/80 border-indigo-500/25' },
  timeline_ping:         { label: 'mentioned',   cls: 'bg-pink-500/15 text-pink-300/80 border-pink-500/25' },
  // daily_boost intentionally excluded — too generic to show as a signal tag
}

// Short inline labels — used in feed rows and dense lists
export const SIGNAL_LABELS = {
  repo_star_growth:      'repo spike',
  audience_spike:        'X spike',
  launch_buzz:           'launch buzz',
  ranking_jump:          'ranking jump',
  repo_release:          'new release',
  timeline_ping:         'mentioned',
  ecosystem_integration: 'integration',
  collab_win:            'collab signal',
  dev_activity:          'dev activity',
  canon_scene:           'milestone',
}

// Long-form labels — used in activity feeds and event lists
export const SIGNAL_LONG = {
  repo_star_growth:      'GitHub stars growing',
  repo_release:          'New release shipped',
  audience_spike:        'X audience spike',
  ranking_jump:          'Climbed in rankings',
  timeline_ping:         'Ecosystem mention',
  launch_buzz:           'Launch buzz',
  collab_win:            'New collaboration',
  canon_scene:           'Ecosystem milestone',
  ecosystem_integration: 'New integration',
  dev_activity:          'Developer activity',
}

// Icons per event type
export const EVENT_ICONS = {
  audience_spike:        '📡',
  ranking_jump:          '📈',
  timeline_ping:         '💬',
  canon_scene:           '🌀',
  collab_win:            '🤝',
  launch_buzz:           '🚀',
  daily_boost:           '✨',
  repo_star_growth:      '⭐',
  repo_release:          '🔖',
  ecosystem_integration: '🔗',
  dev_activity:          '⚙️',
  agent_joined:          '✦',
}

/** Short badge tag object, or null if event type unknown */
export function getSignalTag(eventType) {
  return eventType ? (SIGNAL_TAGS[eventType] ?? null) : null
}

/** Short inline label string, or null */
export function getSignalLabel(eventType) {
  return eventType ? (SIGNAL_LABELS[eventType] ?? null) : null
}

/** Long-form label for feeds and event rows */
export function getSignalLong(eventType) {
  return eventType ? (SIGNAL_LONG[eventType] ?? 'Activity detected') : 'Activity detected'
}

/** Icon emoji for event type */
export function getEventIcon(eventType) {
  return EVENT_ICONS[eventType] ?? '·'
}

/**
 * Compact "why moving" string shown on cards, rows, banners.
 * Returns null if no signal exists.
 * Examples: "↑5 · repo spike", "↓2 this week", "launch buzz"
 */
export function getWhyMoving(weeklyDelta, eventType) {
  const delta = Number(weeklyDelta || 0)
  const label = getSignalLabel(eventType)
  const movePart = delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : null
  if (movePart && label) return `${movePart} · ${label}`
  if (movePart) return `${movePart} this week`
  if (label) return label
  return null
}

/**
 * Full movement reason string for rankings rows and agent pages.
 * Examples: "Rose 5 spots — GitHub stars growing", "Fell 2 spots"
 */
export function getMovementReason(weeklyDelta, eventType) {
  const delta = Number(weeklyDelta || 0)
  const reason = SIGNAL_LONG[eventType] ?? null
  const move = delta > 0
    ? `Rose ${delta} spot${delta !== 1 ? 's' : ''}`
    : delta < 0
    ? `Fell ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? 's' : ''}`
    : null
  if (move && reason) return `${move} — ${reason}`
  if (move) return move
  if (reason) return `Active — ${reason}`
  return null
}

/**
 * Positive / rising event types — for trend direction calculations
 */
export const POSITIVE_EVENT_TYPES = new Set([
  'repo_star_growth', 'repo_release', 'audience_spike',
  'launch_buzz', 'ranking_jump', 'collab_win', 'ecosystem_integration',
])

/** Returns 'rising' | 'active' | 'stable' based on event list */
export function getTrendDirection(events = []) {
  if (!events.length) return 'stable'
  const pos = events.filter((e) => POSITIVE_EVENT_TYPES.has(e.event_type)).length
  const ratio = pos / events.length
  if (ratio >= 0.6) return 'rising'
  if (ratio >= 0.3) return 'active'
  return 'stable'
}

/** Relative time string — e.g. "3m ago", "2h ago", "5d ago" */
export function formatRelativeTime(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
