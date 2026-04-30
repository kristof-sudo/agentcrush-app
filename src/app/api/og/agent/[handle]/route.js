import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const W = 1200
const H = 800

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function fmt(n) {
  if (n == null) return null
  const v = Number(n)
  return isNaN(v) ? null : v.toFixed(1)
}

// Fallback card when agent not found
function notFoundCard() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: W,
          height: H,
          backgroundColor: '#08080f',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', color: '#e91e80', fontSize: 18, letterSpacing: '0.12em', marginBottom: 20 }}>
          AGENTCRUSH
        </div>
        <div style={{ display: 'flex', color: '#ffffff40', fontSize: 28 }}>
          Agent not found in AgentCrush
        </div>
        <div style={{ display: 'flex', color: '#ffffff20', fontSize: 16, marginTop: 12 }}>
          agentcrush.xyz
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}

export async function GET(_req, context) {
  const raw = String((await context.params)?.handle ?? '')
  const handle = decodeURIComponent(raw).trim()

  if (!handle) return notFoundCard()

  const supabase = getSupabase()
  if (!supabase) return notFoundCard()

  // Fetch agent + ranking + v2 scores in parallel
  const [{ data: agent }, { data: v2 }] = await Promise.all([
    supabase
      .from('agents')
      .select('id, handle, display_name, tier')
      .ilike('handle', handle)
      .maybeSingle(),
    supabase
      .from('agent_score_v2_top50_public_candidate')
      .select('rank_v2_c_public, score_v2_c_public_candidate, github_score, package_usage_score, dependency_score, docs_quality_score, hn_score, ecosystem_score')
      .ilike('handle', handle)
      .maybeSingle(),
  ])

  if (!agent) return notFoundCard()

  // Fallback rank/score from legacy rankings table if not in v2 view
  let rank = v2?.rank_v2_c_public ?? null
  let score = v2?.score_v2_c_public_candidate ?? null

  if (!rank || !score) {
    const { data: legacy } = await supabase
      .from('rankings')
      .select('global_rank, score_total')
      .eq('agent_id', agent.id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    rank = rank ?? legacy?.global_rank ?? null
    score = score ?? legacy?.score_total ?? null
  }

  const displayName = agent.display_name || agent.handle
  const isEvidence = agent.tier === 'evidence_ranked'
  const tierLabel = isEvidence ? 'EVIDENCE RANKED' : 'INDEXED'
  const tierColor = isEvidence ? '#e91e80' : '#a78bfa'
  const scoreColor = isEvidence ? '#4ade80' : '#a78bfa'

  // Signal chips — only render where we have data
  const chips = [
    { label: 'GH',  value: fmt(v2?.github_score) },
    { label: 'PKG', value: fmt(v2?.package_usage_score) },
    { label: 'DEP', value: fmt(v2?.dependency_score) },
    { label: 'DOC', value: fmt(v2?.docs_quality_score) },
    { label: 'HN',  value: fmt(v2?.hn_score) },
    { label: 'ECO', value: fmt(v2?.ecosystem_score) },
  ].filter((c) => c.value !== null)

  const scoreDisplay = score != null ? Number(score).toFixed(2) : null

  const response = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: W,
          height: H,
          backgroundColor: '#08080f',
          padding: '64px 72px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56 }}>
          <div style={{ display: 'flex', color: '#e91e80', fontSize: 15, fontWeight: 700, letterSpacing: '0.14em' }}>
            AGENTCRUSH
          </div>
          <div
            style={{
              display: 'flex',
              backgroundColor: `${tierColor}18`,
              border: `1px solid ${tierColor}40`,
              borderRadius: 6,
              padding: '6px 16px',
              color: tierColor,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          >
            {tierLabel}
          </div>
        </div>

        {/* Agent name */}
        <div
          style={{
            display: 'flex',
            color: '#ffffff',
            fontSize: displayName.length > 20 ? 60 : 76,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {displayName}
        </div>

        {/* Handle */}
        <div style={{ display: 'flex', color: '#ffffff40', fontSize: 26, marginBottom: 52 }}>
          @{agent.handle}
        </div>

        {/* Score + Rank row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 56 }}>
          {scoreDisplay && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', color: scoreColor, fontSize: 80, fontWeight: 700, lineHeight: 1 }}>
                {scoreDisplay}
              </div>
              <div style={{ display: 'flex', color: '#ffffff25', fontSize: 13, letterSpacing: '0.1em', marginTop: 8 }}>
                SCORE
              </div>
            </div>
          )}
          {rank && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', color: '#e91e80', fontSize: 80, fontWeight: 700, lineHeight: 1 }}>
                #{rank}
              </div>
              <div style={{ display: 'flex', color: '#ffffff25', fontSize: 13, letterSpacing: '0.1em', marginTop: 8 }}>
                GLOBAL RANK
              </div>
            </div>
          )}
          {!scoreDisplay && !rank && (
            <div style={{ display: 'flex', color: '#ffffff30', fontSize: 24 }}>
              Intelligence indexing in progress
            </div>
          )}
        </div>

        {/* Signal chips */}
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 44 }}>
            {chips.map((chip) => (
              <div
                key={chip.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: '#ffffff08',
                  border: '1px solid #ffffff12',
                  borderRadius: 8,
                  padding: '10px 18px',
                }}
              >
                <div style={{ display: 'flex', color: '#ffffff40', fontSize: 11, letterSpacing: '0.1em', marginBottom: 4 }}>
                  {chip.label}
                </div>
                <div style={{ display: 'flex', color: '#ffffff90', fontSize: 20, fontWeight: 700 }}>
                  {chip.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom watermark */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 48,
            right: 72,
            color: '#ffffff15',
            fontSize: 13,
            letterSpacing: '0.08em',
          }}
        >
          agentcrush.xyz
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
    }
  )

  response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return response
}
