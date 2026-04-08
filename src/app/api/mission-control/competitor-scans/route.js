import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const WATCHLIST = [
  { name: 'aiagentindex.mit.edu',  label: 'MIT AI Agent Index' },
  { name: 'aiagentsdirectory.com', label: 'AI Agents Directory' },
  { name: 'theresanaiforthat.com', label: "There's An AI For That" },
  { name: 'futuretools.io',        label: 'Future Tools' },
]

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('competitor_scans')
    .select('id, competitor, scan_date, changes, signals, recommendation, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    if (error.message?.includes('competitor_scans')) {
      return NextResponse.json({ scans: [], watchlist: WATCHLIST, migration_pending: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Latest scan per competitor for watchlist status
  const latestByCompetitor = {}
  for (const scan of (data || [])) {
    if (!latestByCompetitor[scan.competitor]) {
      latestByCompetitor[scan.competitor] = scan
    }
  }

  return NextResponse.json({
    scans: data || [],
    latest_by_competitor: latestByCompetitor,
    watchlist: WATCHLIST,
  })
}
