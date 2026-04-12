// ALTER TABLE news_items ADD COLUMN IF NOT EXISTS image_url text;

export const runtime = 'nodejs'
export const maxDuration = 30

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RSS_FEEDS = [
  { url: 'https://feeds.feedburner.com/venturebeat/SZYF', source: 'VentureBeat' },
  { url: 'https://huggingface.co/blog/feed.xml',          source: 'HuggingFace' },
  { url: 'https://www.therundown.ai/feed',                source: 'The Rundown' },
  { url: 'https://www.artificialintelligence-news.com/feed/', source: 'AI News' },
  { url: 'https://importai.substack.com/feed',            source: 'Import AI' },
]

const AGENT_KEYWORDS = [
  'agent', 'agentic', 'autonomous', 'multi-agent',
  'llm agent', 'ai agent', 'tool use', 'mcp', 'model context',
]

function isAgentRelevant(text) {
  const lower = text.toLowerCase()
  return AGENT_KEYWORDS.some((kw) => lower.includes(kw))
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'))
  return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : ''
}

function extractAllItems(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(match[1])
  }
  return items
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AgentCrush/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const match =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'AgentCrush/1.0 RSS Reader' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items = extractAllItems(xml)
    const results = []
    for (const itemXml of items.slice(0, 20)) {
      const title = extractTag(itemXml, 'title')
      const link = extractTag(itemXml, 'link') || extractTag(itemXml, 'guid')
      const pubDate = extractTag(itemXml, 'pubDate')
      const description = extractTag(itemXml, 'description')
      if (!title || !link) continue
      if (!isAgentRelevant(title + ' ' + description)) continue
      if (!link.startsWith('http')) continue
      results.push({
        source: feed.source,
        headline: title.slice(0, 200),
        url: link,
        summary: description?.slice(0, 300) || null,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        is_featured: false,
        image_url: null,
      })
    }
    return results
  } catch (err) {
    console.error('Feed failed ' + feed.source + ':', err.message)
    return []
  }
}

export async function GET() {
  const allItems = []
  for (const feed of RSS_FEEDS) {
    const items = await fetchFeed(feed)
    allItems.push(...items)
  }

  if (allItems.length === 0) {
    return Response.json({ inserted: 0, message: 'No agent-relevant items found' })
  }

  allItems.sort((a, b) => {
    if (!a.published_at) return 1
    if (!b.published_at) return -1
    return new Date(b.published_at) - new Date(a.published_at)
  })

  const top20 = allItems.slice(0, 20)
  top20[0].is_featured = true

  // Fetch og:image for top 3 items only
  for (let i = 0; i < Math.min(3, top20.length); i++) {
    top20[i].image_url = await fetchOgImage(top20[i].url)
  }

  const { data, error } = await supabase
    .from('news_items')
    .upsert(top20, { onConflict: 'url', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('upsert error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('cleanup_old_news')

  return Response.json({
    inserted: data?.length ?? 0,
    total_found: allItems.length,
  })
}
