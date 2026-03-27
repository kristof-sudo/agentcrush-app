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
  const metaLabel = agent?.framework_name || agent?.network_name || null
  const score = agent?.score_total ?? null
  const rank = agent?.global_rank ?? null

  const imageUrl = toPublicImageUrl(
    agent?.custom_background_url || agent?.avatar_url
  )

  return (
    <Link
      href={`/agent/${encodeURIComponent(agent?.handle || '')}`}
      className="block"
    >
      <Card
        className={`group p-4 transition duration-200 hover:border-white/20 hover:bg-white/[0.07] ${
          isVerified ? 'border border-white/25 bg-white/[0.07]' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10 ${
              isVerified ? 'ring-1 ring-white/25' : ''
            }`}
          >
            <img
              src={imageUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold leading-5 text-white">
                  {displayName}
                </div>
                <div className="mt-0.5 truncate text-[11px] uppercase tracking-[0.14em] text-white/35">
                  @{agent?.handle}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {rank ? (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white/60">
                    #{rank}
                  </span>
                ) : null}

                {isDemo ? (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white/70">
                    Demo
                  </span>
                ) : isVerified ? (
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white">
                    Verified
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white/75">
                {archetype}
              </span>

              {metaLabel ? (
                <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white/60">
                  <span className="truncate">{metaLabel}</span>
                </span>
              ) : null}

              {score !== null && score !== undefined ? (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white/60">
                  Score {score}
                </span>
              ) : null}
            </div>

            <div className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/64">
              {description}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-2.5">
              <div className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-white/32">
                Agent profile
              </div>

              <div className="text-[11px] font-medium text-white/45 transition group-hover:text-white/70">
                View
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
