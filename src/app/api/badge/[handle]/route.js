/**
 * GET /api/badge/[handle]            — default rank badge SVG
 * GET /api/badge/[handle]?style=alive    — liveness: alive / dormant / ghost
 * GET /api/badge/[handle]?style=mover    — highlights weekly_delta
 * GET /api/badge/[handle]?style=evidence — evidence-tier badge
 * GET /api/badge/[handle]?style=trust    — composite trust score
 *
 * Returns SVG for embedding in READMEs, docs, websites.
 *
 * Strategy: backlinks → SEO + agent discovery. Every embedded badge is one
 * inbound link to agentcrush.xyz; every embed in a popular project compounds
 * over time. Free embed, cached 1 hour. The `alive` style is the flagship
 * "Verified Alive by AgentCrush" badge — green social proof projects want to
 * show, every one of them an inbound link.
 *
 * Brand: AgentCrush violet (#a78bfa) for the label, score color varies by tier.
 */

import { createClient } from '@supabase/supabase-js'
import { livenessFrom } from '@/lib/githubLiveness'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

function sanitize(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

// Approximate text width — DejaVu Sans 11px ≈ 6.5px per avg char. Good enough
// for the shields-style left/right two-segment badge layout.
function textWidth(s) {
  let w = 0
  for (const c of s) {
    if (/[ijl|.,;:'!]/.test(c)) w += 3
    else if (/[A-Z0-9#%]/.test(c)) w += 7.5
    else if (/[mw]/.test(c)) w += 8.5
    else w += 6
  }
  return Math.ceil(w)
}

const COLORS = {
  agentcrush_purple: '#a78bfa',
  evidence_ranked:   '#39ff14', // bright green
  indexed:           '#888888',
  archived:          '#555555',
  mover_up:          '#39ff14',
  mover_down:        '#ef4444',
  mover_flat:        '#999999',
  trust_verified:    '#39ff14',
  trust_provisional: '#fbbf24',
  trust_unverified:  '#fb7185',
  trust_low:         '#ef4444',
  bg:                '#0b0b0e',
  text_white:        '#ffffff',
}

const FONT = 'verdana,DejaVu Sans,sans-serif'

function buildBadge(left, right, rightColor) {
  const padX = 8
  const height = 20
  const lw = textWidth(left) + padX * 2
  const rw = textWidth(right) + padX * 2
  const totalW = lw + rw
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${height}" role="img" aria-label="${escape(left)}: ${escape(right)}">
  <title>${escape(left)}: ${escape(right)}</title>
  <linearGradient id="grad" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".05"/>
    <stop offset="1" stop-opacity=".15"/>
  </linearGradient>
  <clipPath id="clip"><rect width="${totalW}" height="${height}" rx="3"/></clipPath>
  <g clip-path="url(#clip)">
    <rect width="${lw}" height="${height}" fill="${COLORS.agentcrush_purple}"/>
    <rect x="${lw}" width="${rw}" height="${height}" fill="${rightColor}"/>
    <rect width="${totalW}" height="${height}" fill="url(#grad)"/>
  </g>
  <g fill="${COLORS.text_white}" font-family="${FONT}" font-size="11" text-anchor="middle">
    <text x="${lw / 2}" y="14">${escape(left)}</text>
    <text x="${lw + rw / 2}" y="14">${escape(right)}</text>
  </g>
</svg>`
}

function escape(s) {
  return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))
}

function svgResponse(svg, opts = {}) {
  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
    'Access-Control-Allow-Origin': '*',
    'X-AgentCrush-Source': opts.source || 'https://agentcrush.xyz',
  }
  return new Response(svg, { headers })
}

export async function GET(req, { params }) {
  const raw = (await params).handle
  // Allow ".svg" suffix on the handle path for natural embedding
  const handleClean = (typeof raw === 'string' ? raw : '').replace(/\.svg$/i, '')
  const handle = sanitize(handleClean)
  const url = new URL(req.url)
  const style = (url.searchParams.get('style') || 'rank').toLowerCase()

  if (!handle) {
    return svgResponse(buildBadge('agentcrush', 'invalid handle', COLORS.archived))
  }

  try {
    const supabase = db()
    const { data: agent } = await supabase
      .from('agents')
      .select('handle, display_name, tier, primary_category, weekly_delta, identity_status, github_pushed_at, last_event_at, activity_status')
      .ilike('handle', handle)
      .maybeSingle()

    if (!agent) {
      return svgResponse(buildBadge('agentcrush', 'not indexed', COLORS.archived))
    }

    if (style === 'evidence' || style === 'evidence-tier') {
      const tier = agent.tier || 'indexed'
      const tierColor = COLORS[tier] || COLORS.indexed
      const tierLabel = tier.replace(/_/g, ' ')
      return svgResponse(buildBadge('agentcrush', tierLabel, tierColor), { source: `https://agentcrush.xyz/agent/${handle}` })
    }

    if (style === 'alive' || style === 'liveness') {
      // Liveness from the freshest stored signal (no live GitHub call — badges are
      // hit often and must be fast/cached). Mirrors the Ghost Index window.
      const signals = [agent.github_pushed_at, agent.last_event_at]
        .map(d => (d ? Date.parse(d) : null))
        .filter(Boolean)
      const mostRecent = signals.length ? Math.max(...signals) : null
      let { state } = livenessFrom(mostRecent)
      if (state !== 'alive' && agent.activity_status === 'active') state = 'alive'
      const variants = {
        alive:   { label: '● alive',   color: COLORS.evidence_ranked },   // green
        dormant: { label: 'dormant',   color: COLORS.trust_provisional }, // amber
        ghost:   { label: 'ghost',     color: COLORS.mover_down },        // red
        unknown: { label: 'no signal', color: COLORS.indexed },           // grey
      }
      const v = variants[state] || variants.unknown
      return svgResponse(buildBadge('agentcrush · liveness', v.label, v.color), { source: `https://agentcrush.xyz/agent/${handle}` })
    }

    if (style === 'mover') {
      const d = agent.weekly_delta ?? null
      if (d == null) {
        return svgResponse(buildBadge('agentcrush', 'no delta', COLORS.mover_flat))
      }
      const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→'
      const color = d > 0 ? COLORS.mover_up : d < 0 ? COLORS.mover_down : COLORS.mover_flat
      return svgResponse(buildBadge('weekly delta', `${arrow}${Math.abs(d)}`, color), { source: `https://agentcrush.xyz/agent/${handle}` })
    }

    if (style === 'trust') {
      // Fetch the trust score from our own endpoint (same DB, same logic).
      // Cheaper: replicate the minimal logic inline. For now we approximate
      // from tier + identity_status as a fast placeholder.
      let trustLabel
      let trustColor
      if (agent.identity_status === 'verified' && agent.tier === 'evidence_ranked') { trustLabel = 'verified'; trustColor = COLORS.trust_verified }
      else if (agent.tier === 'evidence_ranked') { trustLabel = 'provisional'; trustColor = COLORS.trust_provisional }
      else if (agent.tier === 'indexed') { trustLabel = 'unverified'; trustColor = COLORS.trust_unverified }
      else { trustLabel = 'low trust'; trustColor = COLORS.trust_low }
      return svgResponse(buildBadge('agentcrush trust', trustLabel, trustColor), { source: `https://agentcrush.xyz/api/agent/${handle}/trust` })
    }

    // Default: rank badge — primary-category rank
    let right = 'tracked'
    let color = COLORS.indexed
    if (agent.tier === 'evidence_ranked') {
      right = 'evidence-ranked'
      color = COLORS.evidence_ranked
    } else if (agent.tier === 'archived') {
      right = 'archived'
      color = COLORS.archived
    }
    return svgResponse(buildBadge(`agentcrush · @${agent.handle}`, right, color), { source: `https://agentcrush.xyz/agent/${handle}` })

  } catch (e) {
    return svgResponse(buildBadge('agentcrush', 'temp unavailable', COLORS.archived))
  }
}
