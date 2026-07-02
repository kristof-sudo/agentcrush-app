/**
 * GET /watchlist.xml?handles=a,b,c — personalized RSS alerts for a watchlist.
 *
 * "Dead-agent alerts" without accounts or email: the URL carries the list,
 * any feed reader is the alert channel. Items = index changes (deaths,
 * resurrections, rank moves, promotions) for the watched handles, last 14d.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

const MAX_HANDLES = 50

const LABEL = {
  rank_up: '▲ Rank up',
  rank_down: '▼ Rank down',
  new_agent: '+ Newly indexed',
  tier_promotion: '★ Promoted to evidence-ranked',
  died: '✝ Went ghost',
  resurrected: '↻ Resurrected',
}

function esc(s) {
  return String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
}

function describe(row) {
  const d = row.detail || {}
  switch (row.change_type) {
    case 'rank_up':
      return `moved up ${d.delta} places (#${d.rank_from} → #${d.rank_to})`
    case 'rank_down':
      return `moved down ${Math.abs(d.delta)} places (#${d.rank_from} → #${d.rank_to})`
    case 'tier_promotion':
      return 'promoted to evidence-ranked'
    case 'died':
      return 'no public signal for 30 days — moved to ghost'
    case 'resurrected':
      return 'first public signal after 30+ days of silence'
    default:
      return row.change_type
  }
}

export async function GET(req) {
  trackHit('/watchlist.xml', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const handles = (searchParams.get('handles') || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_HANDLES)

  let rows = []
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (handles.length && sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey)
      const since = new Date(Date.now() - 14 * 86400000).toISOString()
      const { data } = await sb
        .from('changes_today_v1')
        .select('change_type, handle, display_name, detail, happened_at')
        .in('handle', handles)
        .gte('happened_at', since)
        .order('happened_at', { ascending: false })
        .limit(100)
      rows = data || []
    } catch {
      rows = []
    }
  }

  const items = rows
    .map((r) => {
      const title = `${LABEL[r.change_type] || r.change_type}: ${r.display_name || r.handle}`
      const link = `https://agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`
      return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(`${r.handle}-${r.change_type}-${r.happened_at}`)}</guid>
      <pubDate>${new Date(r.happened_at).toUTCString()}</pubDate>
      <description>${esc(`${r.display_name || r.handle} ${describe(r)}.`)}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AgentCrush watchlist alerts (${handles.length} agents)</title>
    <link>https://agentcrush.xyz/watchlist</link>
    <description>Deaths, resurrections, rank moves and promotions for your watched AI agents. Accountless — the URL is the subscription.</description>
    <ttl>60</ttl>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
    },
  })
}
