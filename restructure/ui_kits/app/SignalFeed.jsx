// AgentCrush UI Kit — Signal Feed Panel

function formatRelTime(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function SignalFeedRow({ row }) {
  const sig = getSignalStyle(row.event_type);
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background .12s'}}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      <span style={{marginTop:4,width:7,height:7,borderRadius:'50%',background:sig.dot,boxShadow:`0 0 5px ${sig.dot}`,display:'inline-block',flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'baseline',gap:4,minWidth:0}}>
          <span style={{fontFamily:'Geist Mono,monospace',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.8)',flexShrink:0}}>{row.display_name}</span>
          <span style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.event_label}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
          <span style={{fontFamily:'Geist Mono,monospace',fontSize:9,fontWeight:600,color:sig.dot}}>{sig.label}</span>
          <span style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.2)',fontVariantNumeric:'tabular-nums'}}>{formatRelTime(row.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function SignalFeed({ rows }) {
  return (
    <div style={{borderRadius:8,border:'1px solid rgba(255,255,255,0.06)',background:'#0a0a14',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <CornerAccent/>
      <div style={{display:'flex',alignItems:'center',gap:6,borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'7px 12px',flexShrink:0}}>
        <span style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'#a78bfa'}}>⚡</span>
        <span style={{fontFamily:'Geist Mono,monospace',fontSize:11,fontWeight:700,color:'white'}}>SIGNAL FEED</span>
        <style>{`@keyframes ac-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <span style={{width:6,height:6,borderRadius:'50%',background:'#a78bfa',animation:'ac-pulse 1.5s ease infinite',display:'inline-block',marginLeft:2}}/>
        <span style={{marginLeft:'auto',fontFamily:'Geist Mono,monospace',fontSize:10,color:'rgba(255,255,255,0.2)',fontVariantNumeric:'tabular-nums'}}>{rows.length}</span>
      </div>
      <div style={{overflowY:'auto',maxHeight:320}}>
        {rows.map((row,i)=><SignalFeedRow key={i} row={row}/>)}
        {rows.length===0 && <div style={{padding:'20px 12px',fontFamily:'Geist Mono,monospace',fontSize:11,color:'rgba(255,255,255,0.25)'}}>No signals yet.</div>}
      </div>
    </div>
  );
}

Object.assign(window, { SignalFeed, SignalFeedRow });
