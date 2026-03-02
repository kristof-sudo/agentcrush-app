import Card from '@/components/ui/Card'

export default function AgentCard({ agent }) {
  return (
    <Card className="p-4 hover:border-white/20">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-white/10 overflow-hidden">
          {agent.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">{agent.display_name}</div>
          <div className="truncate text-xs text-white/60">@{agent.handle}</div>
        </div>
      </div>
    </Card>
  )
}
