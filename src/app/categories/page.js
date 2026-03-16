import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

function groupLabel(value) {
  if (value === 'agent_type') return 'Agent Types'
  if (value === 'framework') return 'Frameworks'
  if (value === 'infrastructure') return 'Infrastructure'
  return value
}

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = supabaseAnon()

  const { data, error } = await supabase
    .from('v_category_counts')
    .select('*')
    .order('category_group', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const grouped = (data || []).reduce((acc, row) => {
    const key = row.category_group || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const orderedGroups = ['agent_type', 'framework', 'infrastructure']

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        Categories
      </h1>

      <p className="mt-2 max-w-3xl text-white/60">
        Browse the AI agent ecosystem by agent type, framework, and infrastructure.
      </p>

      <div className="mt-8 space-y-8">
        {orderedGroups.map((group) => {
          const items = grouped[group] || []
          if (items.length === 0) return null

          return (
            <section key={group}>
              <div className="mb-3 text-lg font-semibold text-white/90">
                {groupLabel(group)}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/categories/${item.slug}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-medium text-white">
                          {item.name}
                        </div>

                        <div className="mt-1 text-sm text-white/50">
                          {item.category_group.replace('_', ' ')}
                        </div>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                        {item.agent_count} agent{item.agent_count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
