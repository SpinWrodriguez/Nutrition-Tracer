import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { T, NF } from '../constants.js';

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

export function StatCard({ label, value, unit, color, description }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handler); };
  }, [open]);

  return (
    <div ref={ref} onClick={() => description && setOpen(v => !v)}
      style={{ background:T.surface, borderRadius:16, padding:'14px 10px', textAlign:'center',
        boxShadow:'0 1px 6px rgba(0,0,0,0.05)', cursor:description ? 'pointer' : 'default',
        userSelect:'none', WebkitUserSelect:'none' }}>
      <div style={{ fontSize:11, color:T.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      <div style={{ ...NF, fontSize:24, fontWeight:700, color:color||T.ink }}>{value}</div>
      <div style={{ fontSize:11, color:T.faint }}>{unit}</div>
      {open && description && (
        <div style={{ fontSize:11, color:T.muted, marginTop:6, lineHeight:1.4, fontStyle:'italic' }}>
          {description}
        </div>
      )}
    </div>
  );
}

export function AnalysisModal({ name, text, onClose }) {
  return (
    <>
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:110 }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:111,
        background:T.surface, borderRadius:'24px 24px 0 0',
        maxHeight:'70vh', display:'flex', flexDirection:'column',
        boxShadow:'0 -6px 40px rgba(0,0,0,0.18)',
        paddingBottom:'env(safe-area-inset-bottom)' }}>

        <div style={{ width:40, height:4, background:T.border, borderRadius:2, margin:'12px auto 4px', flexShrink:0 }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 18px 12px', flexShrink:0, borderBottom:`1px solid ${T.border}` }}>
          <div>
            <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.muted, fontWeight:600 }}>AI ANALYSIS</div>
            <div style={{ fontSize:17, fontWeight:700, color:T.ink }}>{name}</div>
          </div>
          <button onClick={onClose}
            style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${T.border}`,
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} color={T.muted} />
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 18px 20px' }}>
          <p style={{ fontSize:14, lineHeight:1.55, color:T.ink, margin:0, whiteSpace:'pre-wrap' }}>{text}</p>
        </div>
      </div>
    </>
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
