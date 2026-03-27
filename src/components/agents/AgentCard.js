import Card from '@/components/ui/Card'
import Link from 'next/link'
import {
  getAgentArchetype,
  getAgentDisplayName,
  getAgentShortDescription,
  isDemoAgent,
} from '@/lib/agent-quality'

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'

  return `${base}/storage/v1/object/public/${path}`
}

export default function AgentCard({ agent }) {
  const isDemo = isDemoAgent(agent)
  const isVerified =
    !isDemo && (agent?.identity_status === 'verified' || agent?.premium_frame_enabled === true)
  const displayName = getAgentDisplayName(agent)
  const archetype = getAgentArchetype(agent)
  const description = getAgentShortDescription(agent)

  const imageUrl = toPublicImageUrl(
    agent?.custom_background_url || agent?.avatar_url
  )

  return (
    <Link
      href={`/agent/${encodeURIComponent(agent?.handle || '')}`}
      className="block"
    >
      <Card
        className={`p-4 transition hover:border-white/20 hover:bg-white/[0.04] ${
          isVerified ? 'border border-white/30 bg-white/[0.06]' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-16 w-16 rounded-xl bg-white/10 overflow-hidden ${
              isVerified ? 'ring-2 ring-white/30' : ''
            }`}
          >
            <img
              src={imageUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="truncate font-semibold text-white">
                {displayName}
              </div>

              {isDemo ? (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70">
                  Demo
                </span>
              ) : isVerified ? (
                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                  Verified
                </span>
              ) : null}
            </div>

            <div className="truncate text-xs text-white/60">
              @{agent?.handle}
            </div>

            <div className="mt-1 truncate text-xs text-white/70">
              {archetype}
            </div>

            <div className="mt-1 line-clamp-2 text-xs text-white/60">
              {description}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
