import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Synthetic workflow_id prefixes
const SYNTHETIC_PREFIXES = ['wf_val_', 'gt_', 'wf_test_', 'wf_scout_test_']
const SYNTHETIC_EXACT = new Set(['wf_test_001', 'wf_scout_test_001'])

function classifyWorkflowId(wfId) {
  if (!wfId) return 'UNKNOWN'
  if (SYNTHETIC_EXACT.has(wfId)) return 'SYNTHETIC_TEST'
  if (SYNTHETIC_PREFIXES.some((p) => wfId.startsWith(p))) return 'SYNTHETIC_TEST'
  // Real build approval workflows use wf_ba_ prefix
  if (wfId.startsWith('wf_ba_')) return 'REAL_PRODUCT_STATE'
  // Scout/Judge runs from Phase 8/9 use standard wf_<timestamp> format but are synthetic
  // (fixed candidate pool, no real discovery). Mark as SYNTHETIC_TEST.
  return 'SYNTHETIC_TEST'
}

function classifyOutcome(outcome, wfId) {
  const base = classifyWorkflowId(wfId)
  if (base !== 'SYNTHETIC_TEST') return base
  return 'SYNTHETIC_TEST'
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: reviews, error: rErr }, { data: outcomes, error: oErr }] = await Promise.all([
    supabase
      .from('workflow_reviews')
      .select('review_id, workflow_id, trace_id, reviewer_role, review_status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('workflow_outcomes')
      .select('workflow_id, outcome, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

  const annotatedReviews = (reviews || []).map((r) => ({
    ...r,
    data_reality: classifyWorkflowId(r.workflow_id),
  }))

  const annotatedOutcomes = (outcomes || []).map((o) => ({
    ...o,
    data_reality: classifyOutcome(o.outcome, o.workflow_id),
  }))

  const allReviewsSynthetic = annotatedReviews.length > 0 && annotatedReviews.every((r) => r.data_reality === 'SYNTHETIC_TEST')
  const allOutcomesSynthetic = annotatedOutcomes.length > 0 && annotatedOutcomes.every((o) => o.data_reality === 'SYNTHETIC_TEST')

  return NextResponse.json({
    reviews: annotatedReviews,
    outcomes: annotatedOutcomes,
    all_synthetic: allReviewsSynthetic && allOutcomesSynthetic,
  })
}
