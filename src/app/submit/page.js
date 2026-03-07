import Container from '@/components/ui/Container'
import SubmitAgentForm from '@/components/submit/SubmitAgentForm'

export const dynamic = 'force-dynamic'

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <Container>
        <div className="py-10">
          <h1 className="text-3xl font-bold">Submit Agent</h1>
          <p className="mt-2 max-w-2xl text-white/70">
            Submit your agent for review. Approved agents will be added to the public roster and can appear in rankings and newest arrivals.
          </p>

          <div className="mt-8">
            <SubmitAgentForm />
          </div>
        </div>
      </Container>
    </div>
  )
}
