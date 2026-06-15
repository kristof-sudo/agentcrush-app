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

// x402 is multi-chain: each resource's accepts[].network names the chain it
// settles on. Map the common (scheme:network) ids to human chain labels.
const CHAIN_LABELS = {
  'eip155:8453': 'Base',
  base: 'Base',
  'eip155:1': 'Ethereum',
  'eip155:137': 'Polygon',
  'eip155:42161': 'Arbitrum',
  'eip155:10': 'Optimism',
  'eip155:43114': 'Avalanche',
  'eip155:56': 'BNB',
  'eip155:480': 'World Chain',
  'eip155:196': 'X Layer',
  'cosmos:noble-1': 'Noble',
  'hyperliquid:mainnet': 'Hyperliquid',
  'stellar:pubnet': 'Stellar',
  'lightning:mainnet': 'Lightning',
  'stripe:live': 'Stripe',
}
// Known testnets — excluded from the demand leaderboard (no real economic signal).
const TESTNETS = new Set([
  'eip155:84532', 'eip155:80002', 'eip155:11155111', 'solana:devnet', 'solana:testnet', 'base-sepolia',
])

export function chainLabel(network) {
  if (!network) return 'Unknown'
  if (CHAIN_LABELS[network]) return CHAIN_LABELS[network]
  if (network.startsWith('solana:') || network === 'solana') return 'Solana'
  const m = network.match(/^eip155:(\d+)$/)
  if (m) return `EVM:${m[1]}`
  return network.split(':')[0] || network
}

export function isTestnet(network) {
  return TESTNETS.has(network)
}

/** Distinct mainnet chains a resource settles on (labels). */
export function chainsOf(resource) {
  const nets = (resource.accepts || []).map((a) => a.network).filter((n) => n && !isTestnet(n))
  return [...new Set(nets.map(chainLabel))]
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
export function rankOperators(items, { days = 14, top = 25, chain = null } = {}) {
  const cutoff = Date.now() - days * 86400000
  const byHost = {}
  const chainTotals = {} // label -> { resources, payers }
  let scanned = 0
  for (const r of items) {
    const q = r.quality || {}
    const payers = +(q.l30DaysUniquePayers || 0)
    const calls = +(q.l30DaysTotalCalls || 0)
    const last = q.lastCalledAt ? Date.parse(q.lastCalledAt) : 0
    if (payers <= 0 || last < cutoff) continue
    const chains = chainsOf(r)
    if (chain && !chains.includes(chain)) continue // chain filter
    scanned += 1
    for (const c of chains) {
      const ct = (chainTotals[c] ||= { resources: 0, payers: 0 })
      ct.resources += 1
      ct.payers = Math.max(ct.payers, payers)
    }
    const h = hostOf(r.resource)
    const o = (byHost[h] ||= {
      host: h,
      name: r.serviceName || null,
      peak_payers: 0,
      calls_30d: 0,
      resources: 0,
      last_called: 0,
      tags: new Set(),
      chains: new Set(),
    })
    o.peak_payers = Math.max(o.peak_payers, payers)
    o.calls_30d += calls
    o.resources += 1
    o.last_called = Math.max(o.last_called, last)
    if (!o.name && r.serviceName) o.name = r.serviceName
    for (const t of r.tags || []) o.tags.add(t)
    for (const c of chains) o.chains.add(c)
  }
  const operators = Object.values(byHost)
    .map((o) => ({
      host: o.host,
      name: o.name,
      unique_payers: o.peak_payers,
      calls_30d: o.calls_30d,
      endpoints: o.resources,
      last_active: new Date(o.last_called).toISOString().slice(0, 10),
      chains: [...o.chains],
      tags: [...o.tags].slice(0, 6),
    }))
    .sort((a, b) => b.unique_payers - a.unique_payers)
    .slice(0, top)
  const chain_breakdown = Object.entries(chainTotals)
    .map(([label, v]) => ({ chain: label, resources: v.resources, peak_payers: v.payers }))
    .sort((a, b) => b.resources - a.resources)
  return { operators, active_resources: scanned, chain_breakdown }
}

/** Convenience: fetch + rank in one call. */
export async function demandLeaderboard({ days = 14, top = 25, maxPages = 40, chain = null } = {}) {
  const { items, total } = await fetchBazaarIndex({ maxPages })
  const { operators, active_resources, chain_breakdown } = rankOperators(items, { days, top, chain })
  return {
    source: 'coinbase-cdp-bazaar',
    window_days: days,
    chain: chain || 'all',
    resources_scanned: items.length,
    resources_total: total,
    active_resources,
    chain_breakdown,
    operators,
  }
}
