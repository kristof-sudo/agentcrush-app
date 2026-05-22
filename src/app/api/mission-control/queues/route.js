import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'build-only'
)

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw new Error(`${table}: ${error.message}`)
  }

  return count || 0
}

async function countByStatus(table, statuses) {
  const out = {}

  for (const status of statuses) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('status', status)

    if (error) {
      out[status] = null
    } else {
      out[status] = count || 0
    }
  }

  return out
}

async function scheduledPostMetrics() {
  const [total, queued, sent, cancelled, approved, publishReady] = await Promise.all([
    supabase.from('scheduled_posts').select('*', { count: 'exact', head: true }),
    supabase.from('scheduled_posts').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('scheduled_posts').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('scheduled_posts').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('scheduled_posts').select('*', { count: 'exact', head: true }).eq('approved', true),
    supabase.from('scheduled_posts').select('*', { count: 'exact', head: true }).eq('publish_ready', true),
  ])

  return {
    total: total.count || 0,
    queued: queued.count || 0,
    sent: sent.count || 0,
    cancelled: cancelled.count || 0,
    approved: approved.count || 0,
    publish_ready: publishReady.count || 0,
  }
}

async function copydeskOutputMetrics() {
  const total = await countRows('copydesk_outputs')

  return {
    total,
  }
}

async function observedPostMetrics() {
  const total = await countRows('x_observed_posts')

  const { count: processedCount } = await supabase
    .from('x_observed_posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_processed', true)

  const { count: usedCount } = await supabase
    .from('x_observed_posts')
    .select('*', { count: 'exact', head: true })
    .eq('used_for_job', true)

  const { count: ignoredCount } = await supabase
    .from('x_observed_posts')
    .select('*', { count: 'exact', head: true })
    .eq('ignored', true)

  return {
    total,
    processed: processedCount || 0,
    used_for_job: usedCount || 0,
    ignored: ignoredCount || 0,
  }
}

export async function GET() {
  try {
    const [
      observedPosts,
      interactionJobs,
      copydeskJobs,
      copydeskOutputs,
      scheduledPosts,
    ] = await Promise.all([
      observedPostMetrics(),
      countByStatus('interaction_jobs', ['pending', 'processing', 'completed', 'failed', 'cancelled']),
      countByStatus('copydesk_jobs', ['queued', 'processing', 'completed', 'failed', 'cancelled']),
      copydeskOutputMetrics(),
      scheduledPostMetrics(),
    ])

    return Response.json({
      queues: {
        x_observed_posts: observedPosts,
        interaction_jobs: interactionJobs,
        copydesk_jobs: copydeskJobs,
        copydesk_outputs: copydeskOutputs,
        scheduled_posts: scheduledPosts,
      },
    })
  } catch (error) {
    return Response.json(
      { error: error.message || 'Failed to load queue metrics' },
      { status: 500 }
    )
  }
}
