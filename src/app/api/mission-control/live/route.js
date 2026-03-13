import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function extractPublishedText(row) {
  const payload = row?.payload || {}

  if (typeof payload === 'string') return payload
  if (payload.text) return payload.text
  if (payload.x_text) return payload.x_text
  if (payload.body) return payload.body
  if (payload.caption) return payload.caption
  if (payload.content) return payload.content

  return 'Published post'
}

export async function GET() {
  try {
    const [observedRes, publishedRes] = await Promise.all([
      supabase
        .from('x_observed_posts')
        .select('id, created_at, author_handle, text_content')
        .order('created_at', { ascending: false })
        .limit(8),

      supabase
        .from('scheduled_posts')
        .select('id, created_at, sent_at, payload, status')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(8),
    ])

    if (observedRes.error) throw observedRes.error
    if (publishedRes.error) throw publishedRes.error

    const observedItems = (observedRes.data || []).map((row) => ({
      id: `observed_${row.id}`,
      type: 'observed',
      created_at: row.created_at,
      title: row.author_handle ? `Observed on X · @${row.author_handle}` : 'Observed on X',
      text: row.text_content || 'No text available',
    }))

    const publishedItems = (publishedRes.data || []).map((row) => ({
      id: `published_${row.id}`,
      type: 'published',
      created_at: row.sent_at || row.created_at,
      title: 'Published by Mike',
      text: extractPublishedText(row),
    }))

    const items = [...observedItems, ...publishedItems]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12)

    return Response.json({ items })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to load live feed' },
      { status: 500 }
    )
  }
}
