/**
 * x402demand.js — live x402 demand leaderboard from Coinbase CDP Bazaar.
 *
 * Pulls the public CDP Bazaar discovery index, aggregates by host into "funded
 * operators" (services already taking x402 payments), ranks by unique paying
 * wallets, and keeps those active within `days`. This is the demand-side map of
 * the agent economy — who already spends/earns money via x402 — which nobody
 * else publishes. Shared by tools/x402-demand-radar.mjs and /api/x402/demand/v1.
 *
 * Pure fetch + aggregate. No DB, no auth, no writes.
 */

const ENDPOINT = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources'

export function hostOf(u) {
  try {
    return new URL(u).host
  } catch {
    return String(u).slice(0, 60)
  }
}

/** Fetch the full live Bazaar index (paginated). */
export async function fetchBazaarIndex({ maxPages = 40 } = {}) {
  let offset = 0
  let total = null
  let pages = 0
  const all = []
  for (;;) {
    const res = await fetch(`${ENDPOINT}?limit=1000&offset=${offset}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`CDP Bazaar HTTP ${res.status}`)
    const body = await res.json()
    const items = body.items || []
    all.push(...items)
    total = body.pagination?.total ?? total
    offset += items.length
    pages += 1
    if (!items.length || (total != null && offset >= total) || pages >= maxPages) break
  }
  return { items: all, total }
}

/**
 * Aggregate raw resources into ranked funded operators.
 * payers can't be summed across a host's endpoints (same wallet recurs), so we
 * take the peak unique-payer count as the host's reach; calls are summed.
 */
export function rankOperators(items, { days = 14, top = 25 } = {}) {
  const cutoff = Date.now() - days * 86400000
  const byHost = {}
  let scanned = 0
  for (const r of items) {
    const q = r.quality || {}
    const payers = +(q.l30DaysUniquePayers || 0)
    const calls = +(q.l30DaysTotalCalls || 0)
    const last = q.lastCalledAt ? Date.parse(q.lastCalledAt) : 0
    if (payers <= 0 || last < cutoff) continue
    scanned += 1
    const h = hostOf(r.resource)
    const o = (byHost[h] ||= {
      host: h,
      name: r.serviceName || null,
      peak_payers: 0,
      calls_30d: 0,
      resources: 0,
      last_called: 0,
      tags: new Set(),
    })
    o.peak_payers = Math.max(o.peak_payers, payers)
    o.calls_30d += calls
    o.resources += 1
    o.last_called = Math.max(o.last_called, last)
    if (!o.name && r.serviceName) o.name = r.serviceName
    for (const t of r.tags || []) o.tags.add(t)
  }
  const operators = Object.values(byHost)
    .map((o) => ({
      host: o.host,
      name: o.name,
      unique_payers: o.peak_payers,
      calls_30d: o.calls_30d,
      endpoints: o.resources,
      last_active: new Date(o.last_called).toISOString().slice(0, 10),
      tags: [...o.tags].slice(0, 6),
    }))
    .sort((a, b) => b.unique_payers - a.unique_payers)
    .slice(0, top)
  return { operators, active_resources: scanned }
}

/** Convenience: fetch + rank in one call. */
export async function demandLeaderboard({ days = 14, top = 25, maxPages = 40 } = {}) {
  const { items, total } = await fetchBazaarIndex({ maxPages })
  const { operators, active_resources } = rankOperators(items, { days, top })
  return {
    source: 'coinbase-cdp-bazaar',
    window_days: days,
    resources_scanned: items.length,
    resources_total: total,
    active_resources,
    operators,
  }
}
