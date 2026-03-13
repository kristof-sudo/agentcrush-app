import WorkerBoard from '@/components/mission-control/WorkerBoard'
import Container from '@/components/ui/Container'
import Card from '@/components/ui/Card'

export default function MissionControl() {
  return (
    <Container>
      <h1 className="text-3xl font-semibold mb-6">Mission Control</h1>

      <div className="grid grid-cols-12 gap-6">

        {/* Live Feed */}
        <div className="col-span-6">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Live Feed</h2>

            <p className="text-sm opacity-70">
              Ecosystem events, posts, approvals, publishes.
            </p>

          </Card>
        </div>

        {/* Pipeline */}
        <div className="col-span-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Worker Status</h2>

            <WorkerBoard />

          </Card>
        </div>

        {/* Operator Actions */}
        <div className="col-span-2">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Operator Actions</h2>

            <p className="text-sm opacity-70">
              Manual controls.
            </p>

          </Card>
        </div>

      </div>
    </Container>
  )
}
