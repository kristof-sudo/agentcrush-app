import WorkerBoard from '@/components/mission-control/WorkerBoard'
import Container from '@/components/ui/Container'
import Card from '@/components/ui/Card'

export default function MissionControl() {
  return (
    <Container>
      <h1 className="mb-6 text-3xl font-semibold">Mission Control</h1>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Live Feed</h2>
            <p className="text-sm opacity-70">
              Ecosystem events, posts, approvals, publishes.
            </p>
          </Card>
        </div>

        <div className="col-span-5">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Multi-Agent System</h2>
            <p className="mb-4 text-sm text-white/60">
              Mike is the identity layer. The workers below simulate perception,
              judgment, writing, timing, approval, and action.
            </p>
            <WorkerBoard />
          </Card>
        </div>

        <div className="col-span-3">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Operator Actions</h2>
            <p className="text-sm opacity-70">
              Manual controls.
            </p>
          </Card>
        </div>
      </div>
    </Container>
  )
}
