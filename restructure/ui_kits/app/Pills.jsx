// AgentCrush UI Kit — Pills & Badges
// Archetype pills, delta badges, signal dots

const ARCHETYPE_STYLES = {
  Researcher:  { border: 'rgba(233,30,128,0.4)',  color: '#e91e80', bg: 'rgba(233,30,128,0.08)' },
  Ecosystem:   { border: 'rgba(0,212,255,0.35)',   color: '#00d4ff', bg: 'rgba(0,212,255,0.06)'  },
  Builder:     { border: 'rgba(96,165,250,0.35)',  color: '#60a5fa', bg: 'rgba(96,165,250,0.07)' },
  Operator:    { border: 'rgba(167,139,250,0.35)', color: '#a78bfa', bg: 'rgba(167,139,250,0.07)'},
  Framework:   { border: 'rgba(57,255,20,0.3)',    color: '#39ff14', bg: 'rgba(57,255,20,0.07)'  },
  Trader:      { border: 'rgba(240,165,0,0.35)',   color: '#f0a500', bg: 'rgba(240,165,0,0.07)'  },
  Rebel:       { border: 'rgba(248,113,113,0.35)', color: '#f87171', bg: 'rgba(248,113,113,0.07)'},
  Creator:     { border: 'rgba(74,222,128,0.35)',  color: '#4ade80', bg: 'rgba(74,222,128,0.07)' },
  Infra:       { border: 'rgba(251,146,60,0.35)',  color: '#fb923c', bg: 'rgba(251,146,60,0.07)' },
  Developer:   { border: 'rgba(255,255,255,0.2)',  color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.04)' },
  Crypto:      { border: 'rgba(240,165,0,0.35)',   color: '#f0a500', bg: 'rgba(240,165,0,0.07)'  },
};

function ArchetypePill({ archetype }) {
  const s = ARCHETYPE_STYLES[archetype] || ARCHETYPE_STYLES['Developer'];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'1px 7px',
      borderRadius:3, border:`1px solid ${s.border}`, color:s.color,
      background:s.bg, fontSize:8, fontWeight:500, letterSpacing:'0.06em',
      textTransform:'uppercase', lineHeight:1.6, fontFamily:'inherit'
    }}>{archetype}</span>
  );
}

function DeltaBadge({ value }) {
  const pos = value > 0;
  const zero = value === 0;
  return (
    <span style={{
      borderRadius:4,
      border: zero ? '1px solid rgba(255,255,255,0.12)' : pos ? '1px solid rgba(57,255,20,0.25)' : '1px solid rgba(248,113,113,0.25)',
      background: zero ? 'rgba(255,255,255,0.04)' : pos ? 'rgba(57,255,20,0.08)' : 'rgba(248,113,113,0.08)',
      padding:'2px 8px', fontSize:12, fontWeight:700,
      color: zero ? 'rgba(255,255,255,0.35)' : pos ? '#39ff14' : '#f87171',
      fontVariantNumeric:'tabular-nums', fontFamily:'inherit'
    }}>
      {zero ? '—' : `${pos?'+':''}${value}`}
    </span>
  );
}

const SIGNAL_STYLES = {
  repo_star_growth:      { dot:'#4ade80', label:'star growth' },
  dev_activity:          { dot:'#60a5fa', label:'dev activity' },
  repo_release:          { dot:'#e91e80', label:'new release' },
  ecosystem_integration: { dot:'#00d4ff', label:'integration' },
  ranking_jump:          { dot:'#39ff14', label:'rank jump' },
  collab_win:            { dot:'#f0a500', label:'collab win' },
  agent_joined:          { dot:'#fb923c', label:'just joined' },
  timeline_ping:         { dot:'#a78bfa', label:'eco mention' },
  audience_spike:        { dot:'#e91e80', label:'audience spike' },
  fresh_activity:        { dot:'#4ade80', label:'active' },
};

function SignalDot({ eventType, size=7 }) {
  const s = SIGNAL_STYLES[eventType] || { dot:'#94a3b8', label:'activity' };
  return (
    <span style={{
      width:size, height:size, borderRadius:'50%', background:s.dot,
      boxShadow:`0 0 5px ${s.dot}`, display:'inline-block', flexShrink:0
    }}/>
  );
}

function getSignalStyle(eventType) {
  return SIGNAL_STYLES[eventType] || { dot:'#94a3b8', label:'activity' };
}

Object.assign(window, { ArchetypePill, DeltaBadge, SignalDot, getSignalStyle, ARCHETYPE_STYLES });
