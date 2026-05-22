// AgentCrush UI Kit — Ranking Row + Table

function ScoreBar({ value, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:4}}>
      <div style={{flex:1,height:3,borderRadius:9,background:'rgba(255,255,255,0.07)'}}>
        <div style={{height:3,borderRadius:9,background:color,width:`${Math.min(value,100)}%`}}/>
      </div>
      <span style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.4)',width:16,fontVariantNumeric:'tabular-nums'}}>{value}</span>
    </div>
  );
}

function RankBadge({ rank }) {
  const isTop = rank <= 3;
  return (
    <div style={{
      width:24,height:24,borderRadius:'50%',flexShrink:0,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:10,fontWeight:700,
      background: isTop ? 'rgba(233,30,128,0.15)' : 'rgba(255,255,255,0.06)',
      color: isTop ? '#e91e80' : 'rgba(255,255,255,0.6)',
      fontFamily:'Geist Mono,monospace',
    }}>{rank}</div>
  );
}

function RankingRow({ row, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'grid', gridTemplateColumns:'32px 1fr 70px 55px 85px 85px',
      gap:8, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.04)',
      alignItems:'center', cursor:'pointer', transition:'background .12s',
      borderLeft: row.global_rank===1 ? '2px solid #e91e80' : '2px solid transparent',
    }}
    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      <RankBadge rank={row.global_rank}/>
      <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
        <Avatar handle={row.handle} name={row.display_name} size={28}/>
        <div style={{minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontFamily:'Geist Mono,monospace',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.9)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.display_name}</span>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#4ade80',display:'inline-block',flexShrink:0}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,marginTop:1}}>
            <span style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.3)'}}>@{row.handle}</span>
            {row.weekly_delta > 0 && <span style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.3)'}}>↑ Strong upward move</span>}
          </div>
          {row.archetype && <ArchetypePill archetype={row.archetype}/>}
        </div>
      </div>
      <div><DeltaBadge value={row.weekly_delta}/></div>
      <div>
        <span style={{fontFamily:'Geist Mono,monospace',fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.9)',fontVariantNumeric:'tabular-nums'}}>{row.score_total}</span>
        <div style={{fontFamily:'Geist Mono,monospace',fontSize:8,color:'rgba(255,255,255,0.2)'}}>score</div>
      </div>
      <ScoreBar value={row.score_visibility} color="#00d4ff"/>
      <ScoreBar value={row.score_reputation} color="#e91e80"/>
    </div>
  );
}

function RankingTable({ rows, onRowClick }) {
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'32px 1fr 70px 55px 85px 85px',gap:8,padding:'5px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        {['#','AGENT','7D','SCORE','VIS','REP'].map(h=>(
          <span key={h} style={{fontFamily:'Geist Mono,monospace',fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'.06em'}}>{h}</span>
        ))}
      </div>
      {rows.map(row=><RankingRow key={row.id} row={row} onClick={()=>onRowClick&&onRowClick(row)}/>)}
    </div>
  );
}

Object.assign(window, { ScoreBar, RankBadge, RankingRow, RankingTable });
