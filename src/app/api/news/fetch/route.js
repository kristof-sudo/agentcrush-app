import Parser from 'rss-parser'
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
  'llm agent', 'ai agent', 'tool use', 'function calling',
  'mcp', 'model context',
]

function isAgentRelevant(text) {
  const lower = text.toLowerCase()
  return AGENT_KEYWORDS.some((kw) => lower.includes(kw))
}

export async function GET() {
  const parser = new Parser({ timeout: 10000 })
  const allItems = []

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const item of parsed.items.slice(0, 20)) {
        const text = (item.title || '') + ' ' + (item.contentSnippet || '')
        if (!isAgentRelevant(text)) continue
        if (!item.link) continue

        allItems.push({
          source: feed.source,
          headline: item.title?.trim().slice(0, 200) || '',
          url: item.link,
          summary: item.contentSnippet?.trim().slice(0, 300) || null,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          is_featured: false,
        })
      }
    } catch (err) {
      console.error(`RSS fetch failed for ${feed.source}:`, err.message)
    }
  }

  if (allItems.length === 0) {
    return Response.json({ inserted: 0, message: 'No agent-relevant items found' })
  }

  // Sort by published_at desc, take top 20
  allItems.sort((a, b) => {
    if (!a.published_at) return 1
    if (!b.published_at) return -1
    return new Date(b.published_at) - new Date(a.published_at)
  })

  const top20 = allItems.slice(0, 20)

  // Mark first item as featured
  top20[0].is_featured = true

  // Upsert — skip duplicates by url
  const { data, error } = await supabase
    .from('news_items')
    .upsert(top20, { onConflict: 'url', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('news_items upsert error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Keep only 50 most recent items to avoid table bloat
  await supabase.rpc('cleanup_old_news')

  return Response.json({ inserted: data?.length ?? 0, total_found: allItems.length })
}
