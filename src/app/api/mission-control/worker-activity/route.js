import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WORKERS = [
  { label: 'Iris', runner: 'canon_enqueuer' },
  { label: 'Caspian', runner: 'x_selector' },
  { label: 'Zhao', runner: 'copydesk' },
  { label: 'Mateo', runner: 'x_publisher' },
]

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('runs')
      .select('id, runner, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const latestByRunner = {}

    for (const row of data || []) {
      if (!row.runner) continue
      if (!latestByRunner[row.runner]) {
        latestByRunner[row.runner] = row
      }
    }

    const items = WORKERS.map((worker) => ({
      label: worker.label,
      runner: worker.runner,
      status: latestByRunner[worker.runner]?.status || null,
      created_at: latestByRunner[worker.runner]?.created_at || null,
    }))

    return Response.json({ items })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Failed to load worker activity' },
      { status: 500 }
    )
  }
}
