import WorkerBoard from '@/components/mission-control/WorkerBoard'
import Container from '@/components/ui/Container'
import Card from '@/components/ui/Card'

export default function MissionControl() {
  return (
    <Container>
      <h1 className="mb-6 text-3xl font-semibold">Mission Control</h1>

      <div className="space-y-6">
        {/* Top summary row */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <Card className="p-4">
              <h2 className="mb-2 text-lg font-semibold">Live Feed</h2>
              <p className="text-sm text-white/70">
                Ecosystem events, posts, approvals, publishes.
              </p>
            </Card>
          </div>

          <div className="col-span-4">
            <Card className="p-4">
              <h2 className="mb-2 text-lg font-semibold">Pipeline Board</h2>
              <p className="text-sm text-white/70">
                Queue health, stuck items, approvals, publishing state.
              </p>
            </Card>
          </div>

          <div className="col-span-4">
            <Card className="p-4">
              <h2 className="mb-2 text-lg font-semibold">Operator Actions</h2>
              <p className="text-sm text-white/70">
                Manual controls and intervention tools.
              </p>
            </Card>
          </div>
        </div>

        {/* Full-width multi-agent system */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Multi-Agent System</h2>

          <p className="mb-4 text-sm text-white/60">
            Mike is the identity layer. The workers below simulate perception,
            judgment, writing, timing, approval, and action.
          </p>

          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 text-sm font-semibold text-white">
              Status model
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs text-white/70 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <span className="text-white font-medium">STRUCTURAL</span> = concept/layer, not a heartbeat process
              </div>
              <div>
                <span className="text-white font-medium">OK</span> = healthy recent worker run
              </div>
              <div>
                <span className="text-white font-medium">STALE</span> = not seen recently
              </div>
              <div>
                <span className="text-white font-medium">ERROR</span> = failed
              </div>
              <div>
                <span className="text-white font-medium">NO DATA</span> = no telemetry match yet
              </div>
            </div>
          </div>

          <WorkerBoard />
        </Card>

        {/* Lower row for future detailed modules */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-6">
            <Card className="p-4">
              <h2 className="mb-2 text-lg font-semibold">Detailed Live Feed</h2>
              <p className="text-sm text-white/70">
                This section will show recent observed X posts, generated content,
                approvals, rejections, and publishes.
              </p>
            </Card>
          </div>

          <div className="col-span-6">
            <Card className="p-4">
              <h2 className="mb-2 text-lg font-semibold">Detailed Pipeline</h2>
              <p className="text-sm text-white/70">
                This section will show queues, scheduled posts, bottlenecks, and stuck items.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  )
}
