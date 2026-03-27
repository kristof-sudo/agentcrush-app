import { supabaseAnon } from '@/lib/supabase'
import { NextResponse } from 'next/server'

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/${path}` : null
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const handles = searchParams.getAll('handles').slice(0, 50) // max 50

  if (handles.length === 0) {
    return NextResponse.json({ agents: [] })
  }

  const supabase = supabaseAnon()
  const { data, error } = await supabase
    .from('rankings')
    .select(`
      score_visibility, score_reputation,
      agent:agents!inner ( id, handle, display_name, avatar_url, custom_background_url, weekly_delta, archetype )
    `)
    .in('agent.handle', handles)

  if (error) {
    return NextResponse.json({ agents: [], error: error.message }, { status: 500 })
  }

  const agents = (data || []).map((row) => {
    const a = row.agent || {}
    return {
      handle: a.handle,
      display_name: a.display_name,
      archetype: a.archetype,
      avatar_url: toPublicImageUrl(a.custom_background_url || a.avatar_url),
      weekly_delta: a.weekly_delta || 0,
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
    }
  })

  return NextResponse.json({ agents })
}
