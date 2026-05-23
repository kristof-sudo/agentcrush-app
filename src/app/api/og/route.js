import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const W = 1200
const H = 630
const ACCENT = '#e91e80'
const BG = '#08080f'

function parseKpis(raw) {
  if (!raw) return []
  return raw
    .split(',')
    .map((pair) => {
      const idx = pair.indexOf(':')
      if (idx < 0) return null
      const value = pair.slice(0, idx).trim()
      const label = pair.slice(idx + 1).trim()
      if (!value || !label) return null
      return { value, label }
    })
    .filter(Boolean)
    .slice(0, 3)
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get('title') || 'AgentCrush').slice(0, 80)
  const kicker = (searchParams.get('kicker') || 'AGENTCRUSH').slice(0, 40).toUpperCase()
  const subtitle = (searchParams.get('subtitle') || '').slice(0, 120)
  const kpis = parseKpis(searchParams.get('kpi'))

  const titleFontSize = title.length > 48 ? 56 : title.length > 28 ? 72 : 88

  const response = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: W,
          height: H,
          backgroundColor: BG,
          padding: '56px 72px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Top bar — kicker */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <div
            style={{
              display: 'flex',
              color: ACCENT,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            {kicker}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            color: '#ffffff',
            fontSize: titleFontSize,
            fontWeight: 700,
            lineHeight: 1.08,
            marginBottom: subtitle ? 20 : 0,
            maxWidth: 1060,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              display: 'flex',
              color: '#ffffff70',
              fontSize: 26,
              lineHeight: 1.3,
              maxWidth: 1060,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* KPI row — pushed to bottom */}
        {kpis.length > 0 && (
          <div style={{ display: 'flex', gap: 48, marginTop: 'auto' }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    color: ACCENT,
                    fontSize: 64,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {k.value}
                </div>
                <div
                  style={{
                    display: 'flex',
                    color: '#ffffff35',
                    fontSize: 13,
                    letterSpacing: '0.12em',
                    marginTop: 8,
                  }}
                >
                  {k.label.toUpperCase()}
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
            bottom: 40,
            right: 72,
            color: '#ffffff20',
            fontSize: 13,
            letterSpacing: '0.08em',
          }}
        >
          agentcrush.xyz
        </div>
      </div>
    ),
    { width: W, height: H }
  )

  response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return response
}
