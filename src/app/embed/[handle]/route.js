import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const FONT = 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace'
const W = 280
const H = 64

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncate(str, max) {
  const s = String(str ?? '')
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function svgResponse(body, status = 200, cacheSeconds = 3600) {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=86400`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function notFoundSvg() {
  const W2 = 240
  const H2 = 40
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}" role="img" aria-label="Agent not found on AgentCrush">
<title>Not found · AgentCrush</title>
<rect width="${W2}" height="${H2}" rx="4" fill="#0a0a14"/>
<rect x="0.5" y="0.5" width="${W2 - 1}" height="${H2 - 1}" rx="3.5" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
<rect width="3" height="${H2}" rx="0" fill="#475569" opacity="0.55"/>
<text x="14" y="25" font-family="${esc(FONT)}" font-size="11" fill="#64748b">Not found on AgentCrush</text>
</svg>`
}

function evidenceSvg(name, rank, score) {
  const safeName = esc(truncate(name, 26))
  const rankLine = rank != null
    ? esc(`#${rank}${score != null ? `  ·  Score ${Number(score).toLocaleString('en-US')}` : ''}`)
    : esc(score != null ? `Score ${Number(score).toLocaleString('en-US')}` : 'Evidence ranked')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="AgentCrush rank badge">
<title>AgentCrush · ${esc(name)}</title>
<rect width="${W}" height="${H}" rx="4" fill="#0a0a14"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3.5" fill="none" stroke="#e91e80" stroke-opacity="0.25" stroke-width="1"/>
<rect width="3" height="${H}" rx="0" fill="#e91e80" opacity="0.85"/>
<circle cx="18" cy="20" r="2.5" fill="#e91e80" opacity="0.9"/>
<text x="28" y="24" font-family="${esc(FONT)}" font-size="13" font-weight="700" fill="#e2e8f0">${safeName}</text>
<text x="28" y="38" font-family="${esc(FONT)}" font-size="10" fill="#00d4ff">${rankLine}</text>
<text x="28" y="52" font-family="${esc(FONT)}" font-size="8" font-weight="700" fill="#e91e80" opacity="0.7" letter-spacing="0.06em">EVIDENCE RANKED · AGENTCRUSH.XYZ</text>
</svg>`
}

function indexedSvg(name) {
  const safeName = esc(truncate(name, 26))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="AgentCrush indexed badge">
<title>AgentCrush · ${esc(name)}</title>
<rect width="${W}" height="${H}" rx="4" fill="#0a0a14"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3.5" fill="none" stroke="#a78bfa" stroke-opacity="0.2" stroke-width="1"/>
<rect width="3" height="${H}" rx="0" fill="#a78bfa" opacity="0.7"/>
<circle cx="18" cy="20" r="2.5" fill="#a78bfa" opacity="0.6"/>
<text x="28" y="24" font-family="${esc(FONT)}" font-size="13" font-weight="700" fill="#e2e8f0" opacity="0.8">${safeName}</text>
<text x="28" y="38" font-family="${esc(FONT)}" font-size="10" fill="#a78bfa">Indexed on AgentCrush</text>
<text x="28" y="52" font-family="${esc(FONT)}" font-size="8" font-weight="700" fill="#a78bfa" opacity="0.5" letter-spacing="0.06em">LIMITED EVIDENCE · AGENTCRUSH.XYZ</text>
</svg>`
}

export async function GET(_req, context) {
  const raw = String((await context.params)?.handle ?? '')
  const handle = raw.replace(/\.svg$/i, '').trim()

  if (!handle) {
    return svgResponse(notFoundSvg(), 404, 300)
  }

  const supabase = getSupabase()
  if (!supabase) {
    return svgResponse(notFoundSvg(), 500, 0)
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier')
    .ilike('handle', handle)
    .maybeSingle()

  if (!agent || agent.tier === 'archived') {
    return svgResponse(notFoundSvg(), 404, 300)
  }

  const name = agent.display_name || agent.handle

  if (agent.tier !== 'evidence_ranked') {
    return svgResponse(indexedSvg(name))
  }

  const { data: ranking } = await supabase
    .from('rankings')
    .select('global_rank, score_total')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return svgResponse(evidenceSvg(name, ranking?.global_rank ?? null, ranking?.score_total ?? null))
}
