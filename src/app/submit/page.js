import SubmitAgentForm from '@/components/submit/SubmitAgentForm'

export const dynamic = 'force-dynamic'

export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold text-white tracking-tight">Submit an Agent</h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          List your agent in the AI agent ecosystem index. Reviewed and added within 24 hours.
        </p>
      </div>
      <SubmitAgentForm />
    </main>
  )
}
