import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const [lastPostRes, postsTodayRes, approvalQueueRes, costTodayRes, costMonthRes] =
      await Promise.all([
        // Last published post
        supabase
          .from('scheduled_posts')
          .select('sent_at')
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Posts published today
        supabase
          .from('scheduled_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', startOfDay()),

        // Pending approval queue
        supabase
          .from('scheduled_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'queued')
          .eq('approved', false)
          .not('approval_requested_at', 'is', null),

        // OpenAI cost today (graceful — column may not exist)
        supabase
          .from('copydesk_outputs')
          .select('model_cost_usd')
          .gte('created_at', startOfDay()),

        // OpenAI cost this month
        supabase
          .from('copydesk_outputs')
          .select('model_cost_usd')
          .gte('created_at', startOfMonth()),
      ])

    const lastPostAt = lastPostRes.data?.sent_at || null
    const postsToday = postsTodayRes.count ?? 0
    const approvalQueueCount = approvalQueueRes.count ?? 0

    // Compute Mike status
    let mikeStatus = 'PAUSED'
    if (lastPostAt) {
      const ageMs = Date.now() - new Date(lastPostAt).getTime()
      const ageHours = ageMs / (1000 * 60 * 60)
      if (ageHours <= 2) mikeStatus = 'POSTING'
      else if (ageHours >= 24) mikeStatus = 'STUCK'
      else mikeStatus = 'PAUSED'
    }

    // Cost sums (null if column missing / no data)
    const sumCost = (rows) => {
      if (!rows || rows.length === 0) return null
      if (!('model_cost_usd' in (rows[0] || {}))) return null
      const total = rows.reduce((s, r) => s + (r.model_cost_usd || 0), 0)
      return parseFloat(total.toFixed(4))
    }

    return Response.json({
      mikeStatus,
      lastPostAt,
      postsToday,
      approvalQueueCount,
      openaiCostToday: sumCost(costTodayRes.data),
      openaiCostMonth: sumCost(costMonthRes.data),
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
