import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      throw new Error('Missing Supabase admin env')
    }

    const body = await request.json()
    const { id, approved_by } = body || {}

    const { data, error } = await supabase
      .from('build_approvals')
      .update({
        status: 'approved',
        approved_by,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return Response.json(data)
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to approve build approval' },
      { status: 500 }
    )
  }
}
