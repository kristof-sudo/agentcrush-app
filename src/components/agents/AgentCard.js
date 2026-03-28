import Link from 'next/link'
import {
  getAgentArchetype,
  getAgentDisplayName,
  getAgentShortDescription,
  isDemoAgent,
} from '@/lib/agent-quality'

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300', 'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300', 'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300', 'bg-cyan-500/25 text-cyan-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
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
  const rank = agent?.global_rank ?? null
  const delta = agent?.weekly_delta ?? 0

  const imageUrl = toPublicImageUrl(agent?.custom_background_url || agent?.avatar_url)

  return (
    <Link
      href={`/agent/${encodeURIComponent(agent?.handle || '')}`}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
    >
      {/* Avatar */}
      <div className={`h-10 w-10 shrink-0 rounded-md overflow-hidden flex items-center justify-center border border-white/[0.07] ${!imageUrl ? avatarColor(agent?.handle) : 'bg-white/[0.04]'}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[13px] font-bold">{displayName[0]?.toUpperCase()}</span>
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-white/90 leading-tight">{displayName}</span>
          {isVerified && (
            <span className="text-[9px] px-1 py-0.5 rounded border border-white/20 bg-white/10 text-white/70 leading-none shrink-0">✓</span>
          )}
          {isDemo && (
            <span className="text-[9px] px-1 py-0.5 rounded border border-white/10 bg-white/5 text-white/40 leading-none shrink-0">demo</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] text-white/40 truncate">{archetype}</span>
          {metaLabel && (
            <span className="text-[10px] text-white/25 truncate">· {metaLabel}</span>
          )}
        </div>
        {description && (
          <div className="mt-0.5 line-clamp-1 text-[11px] text-white/50">{description}</div>
        )}
      </div>

      {/* Right: rank + delta */}
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        {rank != null && (
          <span className="text-[10px] tabular-nums text-white/30">#{rank}</span>
        )}
        {delta !== 0 && (
          <span className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </Link>
  )
}
