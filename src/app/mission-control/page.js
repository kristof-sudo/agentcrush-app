import WorkerBoard from '@/components/mission-control/WorkerBoard'
import PipelineFlow from '@/components/mission-control/PipelineFlow'
import QueueBoard from '@/components/mission-control/QueueBoard'
import LiveFeed from '@/components/mission-control/LiveFeed'
import ApprovalsPanel from '@/components/mission-control/ApprovalsPanel'
import PipelineHealth from '@/components/mission-control/PipelineHealth'
import Container from '@/components/ui/Container'
import Card from '@/components/ui/Card'
import LastWorkerActivity from '@/components/mission-control/LastWorkerActivity'
import PipelineHelperBox from '@/components/mission-control/PipelineHelperBox'
import OperatorActionsPanel from '@/components/mission-control/OperatorActionsPanel'

export default function MissionControl() {
  return (
    <Container>
      <h1 className="mb-6 text-3xl font-semibold">Mission Control</h1>

      <div className="space-y-6">
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
  <OperatorActionsPanel />
</div>
        </div>

        <PipelineFlow />

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
                <span className="font-medium text-white">STRUCTURAL</span> = concept/layer, not a heartbeat process
              </div>
              <div>
                <span className="font-medium text-white">OK</span> = healthy recent worker run
              </div>
              <div>
                <span className="font-medium text-white">STALE</span> = not seen recently
              </div>
              <div>
                <span className="font-medium text-white">ERROR</span> = failed
              </div>
              <div>
                <span className="font-medium text-white">NO DATA</span> = no telemetry match yet
              </div>
            </div>
          </div>

          <WorkerBoard />
        </Card>

        <PipelineHealth />
        <LastWorkerActivity />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-6 space-y-6">
            <Card className="p-4">
              <h2 className="mb-1 text-lg font-semibold">Live Ecosystem Feed</h2>
              <p className="mb-4 text-xs text-white/60">
                Latest external observations and Mike’s newest published posts.
              </p>
              <LiveFeed />
            </Card>

            <Card className="p-4">
              <h2 className="mb-1 text-lg font-semibold">Scheduled Posts</h2>
              <p className="mb-4 text-xs text-white/60">
                Approved posts waiting for their publishing slot.
              </p>
              <ApprovalsPanel />
            </Card>
          </div>

          <div className="col-span-6">
  <Card className="p-4">
    <h2 className="mb-4 text-lg font-semibold">Detailed Pipeline</h2>
    <p className="mb-4 text-sm text-white/70">
      This section shows queue depth across scanner, selector,
      generation, and publishing.
    </p>

    <div className="space-y-4">
      <QueueBoard />
      <PipelineHelperBox />
    </div>
  </Card>
</div>
        </div>
      </div>
    </Container>
  )
}
