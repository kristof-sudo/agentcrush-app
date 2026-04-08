import { NextResponse } from 'next/server'

// Scout/Judge runner requires local Node CLI execution (tools/run-scout-judge-workflow.mjs).
// Not available in Vercel serverless — use local CLI for synthetic test runs.
export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Scout/Judge trigger requires local execution. Run: node tools/run-scout-judge-workflow.mjs' },
    { status: 501 }
  )
}
