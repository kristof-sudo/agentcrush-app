/**
 * GET /changes.xml — RSS feed of the daily index diff (last 7 days).
 * Companion to /changes. Free, cache 1h.
 */

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const revalidate = 3600

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
    case 'new_agent':
      return `newly indexed${row.primary_category ? ` in ${row.primary_category}` : ''}`
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

export async function GET() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let rows = []
  if (sbUrl && sbKey) {
    try {
      const supabase = createClient(sbUrl, sbKey)
      const { data } = await supabase
        .from('changes_today_v1')
        .select('change_type, handle, display_name, detail, primary_category, happened_at')
        .order('happened_at', { ascending: false })
        .limit(100)
      rows = data || []
    } catch {
      /* feed renders empty if the view is absent */
    }
  }

  const items = rows
    .map((r) => {
      const name = r.display_name || r.handle
      const link = `https://agentcrush.xyz/agent/${r.handle}`
      return `
    <item>
      <title>${esc(`${LABEL[r.change_type] || r.change_type}: ${name}`)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(`${r.change_type}-${r.handle}-${r.happened_at}`)}</guid>
      <pubDate>${new Date(r.happened_at).toUTCString()}</pubDate>
      <description><![CDATA[${name} ${describe(r)}. Source: AgentCrush index.]]></description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AgentCrush — What Changed</title>
    <link>https://agentcrush.xyz/changes</link>
    <description>Daily diff of the AgentCrush index: rank movers, new agents, tier promotions, deaths and resurrections.</description>
    <language>en-us</language>
    <atom:link href="https://agentcrush.xyz/changes.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
