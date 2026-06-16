import { X } from 'lucide-react';
import { T, NF, sf } from './constants.js';

export function PhotoBanner({ photo, onRemove }) {
  return (
    <div style={{ position:'relative', borderTopLeftRadius:14, borderTopRightRadius:14, overflow:'hidden' }}>
      <img src={photo} alt="meal"
        style={{ width:'100%', height:140, objectFit:'cover', display:'block' }} />
      <button onClick={onRemove}
        style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.5)',
          border:'none', borderRadius:'50%', width:26, height:26, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
        <X size={13} color="#fff" />
      </button>
    </div>
  );
}

export function MacroGauge({ icon, label, value, goal, unit, color }) {
  const pct = Math.min(100, goal ? (value / goal) * 100 : 0);
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:T.muted }}>
          {icon} {label}
        </span>
        <span style={{ ...NF, fontSize:20, fontWeight:700 }}>
          <span style={{ color }}>{value}</span>
          <span style={{ color:T.faint, fontSize:13 }}> / {goal} {unit}</span>
        </span>
      </div>
      <div style={{ height:8, background:T.border, borderRadius:20, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:20, transition:'width .35s ease' }} />
      </div>
    </div>
  );
}

export function StatCard({ label, value, unit, color }) {
  return (
    <div style={{ background:T.surface, borderRadius:16, padding:'14px 10px', textAlign:'center', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize:11, color:T.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      <div style={{ ...NF, fontSize:24, fontWeight:700, color:color||T.ink }}>{value}</div>
      <div style={{ fontSize:11, color:T.faint }}>{unit}</div>
    </div>
  );
}

export function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, padding:'12px 0 10px', border:'none', background:'transparent', cursor:'pointer',
        color:active ? T.accent : T.faint, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      {icon}
      <span style={{ ...NF, fontSize:11, fontWeight:600, letterSpacing:0.5 }}>{label}</span>
    </button>
  );
}
