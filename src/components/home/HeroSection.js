'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ── Animated count-up ─────────────────────────────────────────────────── */
function Counter({ target, duration = 1800 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = null, raf
    function step(ts) {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return <>{val.toLocaleString()}</>
}

/* ── Pulsing live dot ──────────────────────────────────────────────────── */
function LiveDot({ color = '#4ade80', size = 7 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 0.5,
        animation: 'ping 1.6s cubic-bezier(0,0,.2,1) infinite',
      }} />
      <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: color, display: 'block' }} />
    </span>
  )
}

/* ── Rain + mist canvas (verbatim from design) ─────────────────────────── */
function HeroRain() {
  const canvasRef = useRef()
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    let W = c.width = c.offsetWidth, H = c.height = c.offsetHeight
    const drops = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      len: Math.random() * 60 + 20,
      speed: Math.random() * 2.5 + 1.2,
      opacity: Math.random() * 0.12 + 0.03,
      width: Math.random() * 0.6 + 0.2,
      col: Math.random() < 0.15 ? '0,212,255' : '255,255,255',
    }))
    const mists = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H * 0.7,
      r: Math.random() * 180 + 80,
      vx: (Math.random() - .5) * 0.15,
      vy: (Math.random() - .5) * 0.08,
      opacity: Math.random() * 0.04 + 0.02,
      col: i < 2 ? '0,212,255' : i < 4 ? '167,139,250' : '233,30,128',
    }))
    let raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      mists.forEach(m => {
        m.x += m.vx; m.y += m.vy
        if (m.x < -m.r) m.x = W + m.r; if (m.x > W + m.r) m.x = -m.r
        if (m.y < -m.r) m.y = H + m.r; if (m.y > H + m.r) m.y = -m.r
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r)
        g.addColorStop(0, `rgba(${m.col},${m.opacity})`)
        g.addColorStop(1, `rgba(${m.col},0)`)
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill()
      })
      drops.forEach(d => {
        d.y += d.speed
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W }
        ctx.save()
        ctx.globalAlpha = d.opacity
        ctx.strokeStyle = `rgba(${d.col},1)`
        ctx.lineWidth = d.width
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.speed * 0.4, d.y + d.len)
        ctx.stroke()
        ctx.restore()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}
    />
  )
}

/* ── Floating particles (verbatim from design) ─────────────────────────── */
function Particles() {
  const canvasRef = useRef()
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight
    const COLS = ['#e91e80', '#00d4ff', '#39ff14', '#a78bfa', '#60a5fa']
    const pts = Array.from({ length: 55 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.6,
      vy: -(Math.random() * 0.4 + 0.15),
      vx: (Math.random() - 0.5) * 0.3,
      col: COLS[i % COLS.length],
      life: Math.random(),
      maxLife: Math.random() * 0.6 + 0.4,
      glow: Math.random() * 6 + 3,
    }))
    let raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.life += 0.003
        if (p.life > p.maxLife) { p.life = 0; p.x = Math.random() * W; p.y = H + 10 }
        p.x += p.vx; p.y += p.vy
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.75
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowBlur = p.glow * 3
        ctx.shadowColor = p.col
        ctx.fillStyle = p.col
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
    />
  )
}

/* ── Scanline overlay ──────────────────────────────────────────────────── */
function Scanline() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 2, overflow: 'hidden', opacity: 0.025,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.8) 3px,rgba(0,0,0,0.8) 4px)',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: 200,
        background: 'linear-gradient(to bottom,rgba(0,212,255,0.06),transparent)',
        animation: 'scanline 8s linear infinite',
      }} />
    </div>
  )
}

/* ── Main export ───────────────────────────────────────────────────────── */
export default function HeroSection({ agentCount, signalsToday, evidenceRankedCount }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const heroRef = useRef()

  useEffect(() => {
    const fn = (e) => {
      const r = heroRef.current?.getBoundingClientRect()
      if (!r) return
      setMouse({
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      })
    }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])

  const stats = [
    { label: 'agents indexed', value: agentCount || 0 },
    evidenceRankedCount != null ? { label: 'evidence ranked', value: evidenceRankedCount, color: '#00d4ff' } : null,
    { label: 'signals today', value: signalsToday || 0, color: '#e91e80' },
    { label: 'machine-callable', value: null, extra: 'MCP + X402', color: 'rgba(167,139,250,0.8)', href: '/developers' },
  ].filter(Boolean)

  return (
    <>
      <Particles />
      <Scanline />

      <div
        ref={heroRef}
        style={{
          position: 'relative',
          height: '100vh',
          minHeight: 640,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingTop: 56,
        }}
      >
        {/* Hero image — parallax + breathe */}
        <div style={{
          position: 'absolute', inset: '-5%',
          backgroundImage: 'url(/hero-main.png)',
          backgroundSize: 'cover', backgroundPosition: 'center 40%',
          transform: `translate(${mouse.x * -18}px, ${mouse.y * -12}px)`,
          transition: 'transform .08s ease-out',
          filter: 'brightness(0.6) saturate(1.4)',
          animation: 'heroBreathe 22s ease-in-out infinite',
        }} />

        {/* Arena world blend layer */}
        <div style={{
          position: 'absolute', inset: '-5%',
          backgroundImage: 'url(/bg-arena-world.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: `translate(${mouse.x * -8}px, ${mouse.y * -6}px)`,
          opacity: 0.12,
          mixBlendMode: 'screen',
          transition: 'transform .12s ease-out',
        }} />

        {/* Bottom fade into content */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(8,8,15,0.1) 0%, rgba(8,8,15,0) 30%, rgba(8,8,15,0.5) 65%, rgba(8,8,15,1) 100%)',
        }} />

        {/* Top fade from header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 200,
          background: 'linear-gradient(to bottom,rgba(8,8,15,0.7),transparent)',
        }} />

        {/* Cyan light beam */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', width: 2, height: '70%',
          background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,0.25), transparent)',
          transformOrigin: 'top center',
          animation: 'beamSweep 7s ease-in-out infinite',
          filter: 'blur(6px)',
        }} />
        {/* Pink light beam */}
        <div style={{
          position: 'absolute', top: '-20%', left: '42%', width: 2, height: '60%',
          background: 'linear-gradient(to bottom, transparent, rgba(233,30,128,0.2), transparent)',
          transformOrigin: 'top center',
          animation: 'beamSweep 9s ease-in-out infinite 2s',
          filter: 'blur(8px)',
        }} />

        {/* Rain + mist canvas */}
        <HeroRain />

        {/* Neon ring 1 (cyan) */}
        <div style={{
          position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          border: '1.5px solid rgba(0,212,255,0.18)',
          animation: 'ringPulse 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Neon ring 2 (pink) */}
        <div style={{
          position: 'absolute', bottom: -90, left: '50%', transform: 'translateX(-50%)',
          width: 480, height: 480, borderRadius: '50%',
          border: '1px solid rgba(233,30,128,0.12)',
          animation: 'ringPulse 4s ease-in-out infinite 1s',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 10,
          maxWidth: 1200, margin: '0 auto',
          padding: '0 20px 80px', width: '100%',
        }}>
          {/* Live badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, animation: 'fadeIn .8s ease both' }}>
            <LiveDot />
            <span style={{
              fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
              fontSize: 10, color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '.1em',
            }}>
              Cross-protocol agent intelligence · free MCP + paid x402 APIs · updated every 4 hours
            </span>
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: 'var(--font-display,Michroma,sans-serif)',
            fontSize: 'clamp(20px,5vw,48px)',
            fontWeight: 400,
            color: 'white', lineHeight: 1.1, letterSpacing: '.01em',
            maxWidth: 760,
            animation: 'slideUp .9s cubic-bezier(.2,.8,.4,1) both .1s',
          }}>
            Strategic market intelligence<br />
            for the{' '}
            <span style={{ color: '#e91e80', animation: 'glowBreathe 3s ease-in-out infinite' }}>
              agent economy.
            </span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
            fontSize: 13, color: 'rgba(255,255,255,0.55)',
            marginTop: 14, maxWidth: 540, lineHeight: 1.7,
            animation: 'slideUp .9s cubic-bezier(.2,.8,.4,1) both .18s',
          }}>
            AgentCrush indexes AI agents across open-source, x402, ERC-8004, A2A, MCP, and agent marketplaces — tracking activity, adoption, history, and machine-readable credibility signals over time.
          </p>

          {/* Supporting line */}
          <p style={{
            fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
            fontSize: 11, color: 'rgba(255,255,255,0.30)',
            marginTop: 10, maxWidth: 560, lineHeight: 1.75,
            animation: 'slideUp .9s cubic-bezier(.2,.8,.4,1) both .25s',
          }}>
            Track which agents are active, gaining adoption, economically relevant, and connected across the emerging agent web.
          </p>

          {/* CTAs */}
          <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'slideUp .9s cubic-bezier(.2,.8,.4,1) both .4s' }}>
            <Link href="/rankings" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              borderRadius: 4, border: '1px solid rgba(57,255,20,0.6)',
              background: 'rgba(57,255,20,0.1)',
              padding: '11px 22px',
              fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
              fontSize: 13, fontWeight: 700, color: '#39ff14', textDecoration: 'none',
              boxShadow: '0 0 20px rgba(57,255,20,0.12)',
              transition: 'all .2s',
            }}>
              Browse Evidence Rankings →
            </Link>
            <Link href="/explore" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              padding: '11px 22px',
              fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
              fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
              transition: 'all .2s',
            }}>
              Explore Agent Index →
            </Link>
            <Link href="/for-agents" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 4, border: '1px solid rgba(167,139,250,0.3)',
              background: 'rgba(167,139,250,0.06)',
              padding: '11px 18px',
              fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
              fontSize: 12, color: 'rgba(167,139,250,0.8)', textDecoration: 'none',
              transition: 'all .2s',
            }}>
              For AI Agents & APIs
            </Link>
            <Link href="/agent-economy-index" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 4, border: '1px solid rgba(0,212,255,0.25)',
              background: 'rgba(0,212,255,0.05)',
              padding: '11px 18px',
              fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
              fontSize: 12, color: 'rgba(0,212,255,0.75)', textDecoration: 'none',
              transition: 'all .2s',
            }}>
              Agent Economy Index →
            </Link>
          </div>

          {/* Stat row with animated count-up */}
          <div style={{
            marginTop: 40, display: 'flex', gap: 20, flexWrap: 'wrap',
            animation: 'fadeIn 1s ease both .6s',
          }}>
            {stats.map(s => {
              const inner = (
                <>
                  <span style={{
                    fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
                    fontSize: s.value != null ? 20 : 16,
                    fontWeight: 700,
                    color: s.color || 'white',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {s.value != null ? <Counter target={s.value} /> : s.extra}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
                    fontSize: 10, color: 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '.07em',
                  }}>
                    {s.label}
                  </span>
                </>
              )
              return s.href ? (
                <Link key={s.label} href={s.href} style={{ display: 'flex', alignItems: 'baseline', gap: 7, textDecoration: 'none' }}>
                  {inner}
                </Link>
              ) : (
                <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
