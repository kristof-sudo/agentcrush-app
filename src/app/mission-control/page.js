import StatusBar from '@/components/mission-control/StatusBar'
import ApprovalQueue from '@/components/mission-control/ApprovalQueue'
import PipelineHealthPanel from '@/components/mission-control/PipelineHealthPanel'
import CostTracker from '@/components/mission-control/CostTracker'
import WorkerActivityBoard from '@/components/mission-control/WorkerActivityBoard'
import OperatorActionsPanel from '@/components/mission-control/OperatorActionsPanel'
import Container from '@/components/ui/Container'
import Card from '@/components/ui/Card'

export default function MissionControl() {
  return (
    <Container>
      <h1 className="mb-4 text-2xl font-semibold">Mission Control</h1>

      {/* 1. Status bar — sticky, always visible */}
      <StatusBar />

      {/* 2. Approval queue — most important */}
      <Card className="mb-6 p-5">
        <ApprovalQueue />
      </Card>

      {/* 3. Pipeline health + Cost tracker side by side */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <PipelineHealthPanel />
        </Card>

        <Card className="p-5">
          <CostTracker />
        </Card>
      </div>

      {/* 4. Worker activity */}
      <Card className="mb-6 p-5">
        <WorkerActivityBoard />
      </Card>

      {/* 5. Operator actions (retry / cancel by ID) */}
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-white/70">Operator Actions</h2>
        <OperatorActionsPanel />
      </Card>
    </Container>
  )
}
