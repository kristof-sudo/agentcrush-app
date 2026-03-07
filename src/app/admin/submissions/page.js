import Container from '@/components/ui/Container'
import SubmissionReviewList from '@/components/admin/SubmissionReviewList'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'

  return `${base}/storage/v1/object/public/${path}`
}

export default async function AdminSubmissionsPage({ searchParams }) {
  const reviewKey = process.env.ADMIN_REVIEW_KEY || ''
  const suppliedKey = searchParams?.key || ''

  if (!reviewKey || suppliedKey !== reviewKey) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white">
        <Container>
          <div className="py-10">
            <h1 className="text-3xl font-bold">Submission Review</h1>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/60">
              Not found.
            </div>
          </div>
        </Container>
      </div>
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white">
        <Container>
          <div className="py-10">
            <h1 className="text-3xl font-bold">Submission Review</h1>
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
              Missing server configuration.
            </div>
          </div>
        </Container>
      </div>
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('submissions')
    .select('id, submitter_email, status, created_at, payload_json')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const rows = (data || []).map((row) => ({
    id: row.id,
    submitter_email: row.submitter_email,
    status: row.status,
    created_at: row.created_at,
    handle: row.payload_json?.handle || '',
    display_name: row.payload_json?.display_name || '',
    tagline: row.payload_json?.tagline || '',
    bio: row.payload_json?.bio || '',
    archetype: row.payload_json?.archetype || '',
    avatar_url: toPublicImageUrl(row.payload_json?.avatar_url || ''),
  }))

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <Container>
        <div className="py-10">
          <h1 className="text-3xl font-bold">Submission Review</h1>
          <p className="mt-2 text-white/70">
            Review pending public submissions and approve or reject them.
          </p>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
              Failed to load submissions: {error.message}
            </div>
          ) : (
            <div className="mt-8">
              <SubmissionReviewList rows={rows} />
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
