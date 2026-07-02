/**
 * GET /api/watchlist/feed.xml
 *
 * Personalized RSS feed for a caller-supplied watchlist of handles.
 * Each item is one change event (rank move, death, resurrection, etc.)
 * for the tracked agents over the last 7 days.
 *
 * Query params:
 *   ?handles=a,b,c   — comma-separated handles (max 50)
 *
 * CORS-open, free. The subscription IS the URL — no accounts needed.
 * Cache: 15 min.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function changeLabel(row) {
  const d = row.detail || {}
  switch (row.change_type) {
    case 'rank_up':
      return `moved up: #${d.rank_from} → #${d.rank_to}`
    case 'rank_down':
      return `moved down: #${d.rank_from} → #${d.rank_to}`
    case 'tier_promotion':
      return 'promoted to evidence-ranked'
    case 'died':
      return 'went ghost (no signal 30+ days)'
    case 'resurrected':
      return 'returned after 30+ days silent'
    case 'new_agent':
      return 'newly indexed'
    default:
      return row.change_type
  }
}

export async function GET(req) {
  trackHit('/api/watchlist/feed.xml', req, 'free_200')

  const { searchParams } = new URL(req.url)
  const handlesParam = searchParams.get('handles') || ''
  const handles = handlesParam.split(',').map((h) => h.trim()).filter(Boolean).slice(0, 50)

  if (handles.length === 0) {
    return new Response('Pass ?handles=handle1,handle2', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const since = new Date(Date.now() - 7 * 86400000).toISOString()

  try {
    const { data, error } = await db()
      .from('changes_today_v1')
      .select('change_type, handle, display_name, primary_category, detail, happened_at')
      .in('handle', handles)
      .gte('happened_at', since)
      .order('happened_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const items = (data || [])
      .map(
        (row) => `
    <item>
      <title>${escapeXml(row.display_name)} — ${escapeXml(changeLabel(row))}</title>
      <link>https://agentcrush.xyz/agent/${escapeXml(row.handle)}</link>
      <guid isPermaLink="false">${escapeXml(row.handle)}-${escapeXml(row.change_type)}-${escapeXml(row.happened_at)}</guid>
      <pubDate>${new Date(row.happened_at).toUTCString()}</pubDate>
      <description>${escapeXml(row.display_name)} (${escapeXml((row.primary_category || 'agent').replace('_', ' '))}) — ${escapeXml(changeLabel(row))}</description>
    </item>`
      )
      .join('')

    const titleHandles =
      handles.slice(0, 3).join(', ') + (handles.length > 3 ? ` +${handles.length - 3}` : '')
    const feedUrl = `https://agentcrush.xyz/api/watchlist/feed.xml?handles=${escapeXml(handles.join(','))}`

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AgentCrush Watchlist — ${escapeXml(titleHandles)}</title>
    <link>https://agentcrush.xyz/watchlist</link>
    <description>Personalized change alerts for tracked AI agents</description>
    <language>en</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(
      `<?xml version="1.0"?><error>${escapeXml(e.message)}</error>`,
      { status: 503, headers: { 'Content-Type': 'application/xml' } }
    )
  }
}
