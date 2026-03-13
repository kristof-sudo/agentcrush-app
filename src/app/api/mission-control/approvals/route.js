import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        created_at,
        run_at,
        approved,
        publish_ready,
        status,
        payload,
        source_output_id,
        approval_token,
        approval_requested_at
      `)
      .eq('approved', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return Response.json({ items: data || [] })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to load approvals' },
      { status: 500 }
    )
  }
}
