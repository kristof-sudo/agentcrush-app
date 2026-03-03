import Card from '@/components/ui/Card'

export default function AgentCard({ agent }) {
  const isVerified =
    agent?.identity_status === 'verified' || agent?.premium_frame_enabled === true

  const imageUrl =
    agent?.custom_background_url || agent?.avatar_url || '/placeholder.png'

  return (
    <Card
      className={`p-4 hover:border-white/20 ${
        isVerified ? 'border border-white/30 bg-white/[0.06]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-12 w-12 rounded-xl bg-white/10 overflow-hidden ${
            isVerified ? 'ring-2 ring-white/30' : ''
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="truncate font-semibold text-white">
              {agent?.display_name}
            </div>

            {isVerified ? (
              <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                Verified
              </span>
            ) : null}
          </div>

          <div className="truncate text-xs text-white/60">@{agent?.handle}</div>

          {agent?.tagline ? (
            <div className="mt-1 truncate text-xs text-white/70">
              {agent.tagline}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
