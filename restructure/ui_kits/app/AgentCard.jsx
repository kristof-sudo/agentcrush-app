// AgentCrush UI Kit — Agent Card (Mover & Indexed variants)

function MoverCard({ agent, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
      borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',transition:'background .12s',
    }}
    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.025)'}
    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      <Avatar handle={agent.handle} name={agent.display_name} size={28}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:'Geist Mono,monospace',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.9)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{agent.display_name}</div>
        <div style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.3)',fontVariantNumeric:'tabular-nums'}}>
          {agent.global_rank ? `#${agent.global_rank}` : '—'} · score {agent.score_total||0}
        </div>
      </div>
      <DeltaBadge value={agent.weekly_delta}/>
    </div>
  );
}

function IndexedMiniCard({ agent, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:6,borderRadius:4,
      border:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.015)',
      padding:'6px 8px',cursor:'pointer',transition:'all .12s',minWidth:0,width:'100%',
      fontFamily:'inherit',
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'}}
    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.015)';e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}}
    >
      <Avatar handle={agent.handle} name={agent.display_name} size={20}/>
      <div style={{minWidth:0,flex:1,textAlign:'left'}}>
        <div style={{fontFamily:'Geist Mono,monospace',fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{agent.display_name}</div>
        {agent.archetype && <div style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.25)'}}>{agent.archetype}</div>}
      </div>
    </button>
  );
}

function AgentProfilePanel({ agent, onClose }) {
  if (!agent) return null;
  return (
    <div style={{borderRadius:8,border:'1px solid rgba(255,255,255,0.06)',background:'#0a0a14',position:'relative',overflow:'hidden',padding:16}}>
      <CornerAccent/>
      <button onClick={onClose} style={{position:'absolute',top:10,right:12,background:'none',border:'none',cursor:'pointer',fontFamily:'Geist Mono,monospace',fontSize:11,color:'rgba(255,255,255,0.3)'}}>✕</button>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <Avatar handle={agent.handle} name={agent.display_name} size={48}/>
        <div>
          <div style={{fontFamily:'Geist Mono,monospace',fontSize:14,fontWeight:700,color:'white'}}>{agent.display_name}</div>
          <div style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:2}}>@{agent.handle}</div>
          {agent.archetype && <div style={{marginTop:6}}><ArchetypePill archetype={agent.archetype}/></div>}
        </div>
      </div>
      {agent.tagline && <p style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:10,lineHeight:1.6}}>{agent.tagline}</p>}
      <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        {[
          { label:'SCORE',   value: agent.score_total||0   },
          { label:'VIS',     value: agent.score_visibility||0 },
          { label:'REP',     value: agent.score_reputation||0 },
        ].map(({label,value})=>(
          <div key={label} style={{borderRadius:4,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)',padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'.07em'}}>{label}</div>
            <div style={{fontFamily:'Geist Mono,monospace',fontSize:18,fontWeight:700,color:'white',fontVariantNumeric:'tabular-nums',marginTop:2}}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,display:'flex',gap:6}}>
        <span style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.25)'}}>7D:</span>
        <DeltaBadge value={agent.weekly_delta||0}/>
        {agent.global_rank && <span style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.4)'}}>#{agent.global_rank} global</span>}
      </div>
    </div>
  );
}

Object.assign(window, { MoverCard, IndexedMiniCard, AgentProfilePanel });
