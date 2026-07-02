'use client'

import { useState } from 'react'

/**
 * Webhook alert subscription card (monitoring product v1).
 * Degrades honestly: while the migration is pending the API answers 503
 * not_enabled and we show "coming shortly" instead of a broken form.
 */
export default function AlertSubscribe({ handles = [] }) {
  const [url, setUrl] = useState('')
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [result, setResult] = useState(null)

  const subscribe = async () => {
    setState('busy')
    setResult(null)
    try {
      const res = await fetch('/api/watchlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles, webhook_url: url.trim() }),
      })
      const j = await res.json()
      if (res.ok) {
        setState('done')
        setResult(j)
      } else {
        setState('error')
        setResult({ error: j.error === 'not_enabled' ? 'Webhook alerts are launching shortly — the RSS feed above works today.' : j.error })
      }
    } catch {
      setState('error')
      setResult({ error: 'request failed — try again' })
    }
  }

  if (handles.length === 0) return null

  return (
    <section style={{ padding: '16px', background: '#0a0a14', border: '1px solid rgba(250,204,21,0.15)', borderRadius: 8, marginBottom: 24 }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(250,204,21,0.7)', marginBottom: 8 }}>
        Push alerts — webhook
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', marginBottom: 12 }}>
        We check hourly and POST signed alerts (deaths, resurrections, rank moves, promotions)
        for your {handles.length} watched agent{handles.length === 1 ? '' : 's'} to your endpoint.
        HTTPS only; payloads carry an HMAC signature you can verify.
      </p>

      {state !== 'done' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.example/agentcrush-alerts"
            style={{ flex: 1, minWidth: 220, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', outline: 'none' }}
          />
          <button
            onClick={subscribe}
            disabled={state === 'busy' || !url.trim().startsWith('https://')}
            style={{ padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer', background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.35)', color: '#facc15', opacity: state === 'busy' || !url.trim().startsWith('https://') ? 0.5 : 1 }}
          >
            {state === 'busy' ? 'Verifying endpoint…' : 'Enable alerts'}
          </button>
        </div>
      )}

      {state === 'error' && result?.error && (
        <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>{result.error}</p>
      )}

      {state === 'done' && result && (
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 12, color: '#4ade80', marginBottom: 8 }}>
            ✓ Test ping delivered. Alerts are live for this endpoint.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)', marginBottom: 4 }}>
            Signing secret — <strong style={{ color: '#facc15' }}>copy it now, it is shown only once</strong>:
          </p>
          <code style={{ display: 'block', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', fontSize: 11, fontFamily: 'monospace', color: '#e2e8f0', wordBreak: 'break-all' }}>
            {result.secret}
          </code>
          <p style={{ fontSize: 11, color: 'rgba(226,232,240,0.3)', marginTop: 8, fontFamily: 'monospace' }}>
            subscription: {result.subscription_id} · verify: x-agentcrush-signature = HMAC-SHA256(raw body, secret)
          </p>
        </div>
      )}
    </section>
  )
}
