import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('id, sent_at, payload, status')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(30)

    if (error) throw error

    return Response.json({ items: data || [] })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to load activity' }, { status: 500 })
  }
}
