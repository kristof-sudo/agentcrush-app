// AgentCrush UI Kit — Navigation (Header + Footer)

const AVATAR_COLORS = [
  { bg:'rgba(167,139,250,0.2)', color:'#a78bfa' },
  { bg:'rgba(74,222,128,0.2)',  color:'#4ade80' },
  { bg:'rgba(96,165,250,0.2)',  color:'#60a5fa' },
  { bg:'rgba(251,191,36,0.2)',  color:'#fbbf24' },
  { bg:'rgba(233,30,128,0.2)', color:'#e91e80' },
  { bg:'rgba(0,212,255,0.2)',   color:'#00d4ff' },
  { bg:'rgba(248,113,113,0.2)', color:'#f87171' },
];
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i=0; i<handle.length; i++) hash = (hash*31+handle.charCodeAt(i))&0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function Avatar({ handle, name, avatarUrl, size=28 }) {
  const ac = avatarColor(handle);
  return (
    <div style={{
      width:size, height:size, borderRadius:4, overflow:'hidden',
      border:'1px solid rgba(255,255,255,0.07)', flexShrink:0,
      background: avatarUrl ? 'rgba(255,255,255,0.04)' : ac.bg,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : <span style={{fontFamily:'Geist Mono,monospace',fontSize:size*0.35,fontWeight:700,color:ac.color}}>
            {(name||handle||'?')[0].toUpperCase()}
          </span>
      }
    </div>
  );
}

function CornerAccent({ color='rgba(233,30,128,0.4)' }) {
  const s = (pos) => ({ position:'absolute', width:10, height:10, pointerEvents:'none', ...pos });
  const b = `1px solid ${color}`;
  return <>
    <span style={{...s({top:0,left:0}),   borderTop:b,borderLeft:b}}/>
    <span style={{...s({top:0,right:0}),  borderTop:b,borderRight:b}}/>
    <span style={{...s({bottom:0,left:0}),borderBottom:b,borderLeft:b}}/>
    <span style={{...s({bottom:0,right:0}),borderBottom:b,borderRight:b}}/>
  </>;
}

function LiveDot() {
  return (
    <span style={{position:'relative',display:'inline-flex',width:7,height:7,alignItems:'center',justifyContent:'center'}}>
      <style>{`@keyframes ac-ping{0%{transform:scale(1);opacity:.5}75%,100%{transform:scale(2.2);opacity:0}}`}</style>
      <span style={{position:'absolute',inset:0,borderRadius:'50%',background:'#4ade80',opacity:.5,animation:'ac-ping 1.5s cubic-bezier(0,0,.2,1) infinite'}}/>
      <span style={{position:'relative',width:7,height:7,borderRadius:'50%',background:'#4ade80',display:'block'}}/>
    </span>
  );
}

function Header({ onNav, activePage, trending }) {
  const navLinks = [
    { id:'home',       label:'Rankings'   },
    { id:'categories', label:'Categories' },
    { id:'use-cases',  label:'Use Cases'  },
    { id:'submit',     label:'Submit'     },
  ];
  return (
    <header style={{
      position:'sticky', top:0, zIndex:50,
      borderBottom:'1px solid rgba(233,30,128,0.12)',
      background:'rgba(8,8,15,0.92)', backdropFilter:'blur(20px)',
    }}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 16px',display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',gap:16,paddingTop:10,paddingBottom:10}}>
        {/* Logo */}
        <button onClick={()=>onNav('home')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
          <img src="../../assets/agentcrush-logo.png" alt="AgentCrush" style={{height:32,width:'auto'}}/>
        </button>
        {/* Nav */}
        <nav style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
          {navLinks.map(({id,label})=>(
            <button key={id} onClick={()=>onNav(id)} style={{
              background:'none',border:'none',cursor:'pointer',padding:'2px 0',
              fontFamily:'Geist Mono,monospace',fontSize:12,fontWeight:600,
              color: activePage===id ? 'white' : 'rgba(255,255,255,0.5)',
              position:'relative', transition:'color .15s',
            }}>
              {label}
              {activePage===id && <span style={{position:'absolute',bottom:-2,left:0,right:0,height:1,background:'#e91e80'}}/>}
            </button>
          ))}
        </nav>
        {/* Right */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {trending && (
            <button onClick={()=>onNav('home')} style={{
              display:'flex',alignItems:'center',gap:6,borderRadius:4,
              border:'1px solid rgba(57,255,20,0.25)',background:'rgba(57,255,20,0.06)',
              padding:'5px 10px',fontFamily:'Geist Mono,monospace',fontSize:11,cursor:'pointer',
            }}>
              <span style={{fontWeight:700,color:'#39ff14'}}>↑</span>
              <span style={{color:'rgba(255,255,255,0.7)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{trending.name}</span>
              <span style={{fontWeight:700,color:'#39ff14',fontVariantNumeric:'tabular-nums'}}>+{trending.delta}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer({ onNav }) {
  return (
    <footer style={{borderTop:'1px solid rgba(255,255,255,0.04)',padding:'12px 16px',textAlign:'center'}}>
      <p style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.2)'}}>
        © 2026 AgentCrush · The AI Agent Ecosystem Index
      </p>
      <div style={{marginTop:4,display:'flex',justifyContent:'center',gap:20}}>
        {['About','Terms'].map(l=>(
          <button key={l} style={{background:'none',border:'none',cursor:'pointer',fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.2)'}}>
            {l}
          </button>
        ))}
      </div>
    </footer>
  );
}

Object.assign(window, { Avatar, CornerAccent, LiveDot, Header, Footer, avatarColor });
