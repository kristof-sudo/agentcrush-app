/**
 * ISO 8601 week helpers — pure functions, no deps.
 * Used by /weekly/[week] dynamic route + weekly-digest-generator worker.
 */

// Parse "YYYY-Wnn" → { year, week } or null.
export function parseWeekId(id) {
  if (typeof id !== 'string') return null
  const m = id.match(/^(\d{4})-W(\d{1,2})$/)
  if (!m) return null
  const year = Number(m[1])
  const week = Number(m[2])
  if (year < 2020 || year > 2099) return null
  if (week < 1 || week > 53) return null
  return { year, week }
}

// Format { year, week } → "YYYY-Wnn".
export function formatWeekId(year, week) {
  return `${year}-W${String(week).padStart(2, '0')}`
}

// Monday of ISO week (UTC).
export function isoWeekStart(year, week) {
  // Jan 4 is always in week 1 of the year (ISO definition).
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7 // Sun=7 in ISO
  const week1Mon = new Date(Date.UTC(year, 0, 4 - jan4Day + 1))
  const target = new Date(week1Mon)
  target.setUTCDate(target.getUTCDate() + (week - 1) * 7)
  return target
}

export function isoWeekEnd(year, week) {
  const start = isoWeekStart(year, week)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return end
}

// Current ISO week as { year, week } from `date` (defaults to now).
export function currentIsoWeek(date = new Date()) {
  // Copy + set to Thursday of the current week (ISO weeks are anchored to Thursday).
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

// "May 18–24, 2026" style period label.
export function formatWeekPeriod(year, week) {
  const start = isoWeekStart(year, week)
  const end = isoWeekEnd(year, week)
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const sM = MO[start.getUTCMonth()]
  const eM = MO[end.getUTCMonth()]
  const sD = start.getUTCDate()
  const eD = end.getUTCDate()
  if (sM === eM) return `${sM} ${sD}–${eD}, ${year}`
  return `${sM} ${sD} – ${eM} ${eD}, ${year}`
}

// "May 18–24" without year (for headers).
export function formatWeekPeriodShort(year, week) {
  const s = formatWeekPeriod(year, week)
  return s.replace(/,\s*\d{4}$/, '')
}

// ISO date strings (YYYY-MM-DD) for the week's range — for DB queries.
export function isoWeekDateRange(year, week) {
  const start = isoWeekStart(year, week)
  const end = isoWeekEnd(year, week)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

// Generate an array of the 7 ISO dates Mon-Sun.
export function isoWeekDates(year, week) {
  const start = isoWeekStart(year, week)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
