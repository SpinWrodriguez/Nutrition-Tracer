import { useRef, useState } from 'react';
import { Plus, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { T, NF, inp } from '../constants.js';
import { StatCard } from './ui.jsx';

export function SettingsTab({ wInput, setWInput, day, logWeight, wStats, goals, updateGoals, theme, toggleTheme, data, importData }) {
  const fileRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null); // 'ok' | 'err'
  const dayLabel = (() => {
    try { return new Date(day + 'T12:00:00').toLocaleDateString('en-AU', { weekday:'long', month:'short', day:'numeric' }); }
    catch { return day; }
  })();

  const handleDownload = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `nutrition-tracer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);
        importData(raw);
        setImportStatus('ok');
      } catch {
        setImportStatus('err');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ padding:'16px 16px 8px' }}>

      {/* weigh-in */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:10 }}>LOG WEIGHT</div>
        <div style={{ fontSize:12, color:T.muted, marginBottom:10, background:T.bg, borderRadius:10, padding:'7px 12px' }}>
          Logging for <b style={{ color:T.ink }}>{dayLabel}</b> — switch day to log a different day
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
          <input value={wInput} onChange={e => setWInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && logWeight()}
            inputMode="decimal" placeholder="87.5"
            style={{ ...inp, flex:1 }} />
          <span style={{ color:T.muted, fontSize:14, flexShrink:0 }}>kg</span>
          <button onClick={logWeight}
            style={{ flexShrink:0, padding:'12px 18px', borderRadius:12, border:'none',
              background:T.accent, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:5 }}>
            <Plus size={16} /> Log
          </button>
        </div>
        {wStats && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:10 }}>
            <StatCard label="Current" value={`${wStats.current}`} unit="kg" />
            <StatCard label="Change"
              value={wStats.change === null ? '—' : `${wStats.change > 0 ? '+' : ''}${wStats.change}`}
              unit="kg"
              color={wStats.change === null ? T.muted : wStats.change < 0 ? T.ok : wStats.change > 0 ? T.over : T.ink} />
            <StatCard label="Per week" unit="kg"
              value={wStats.perWk == null ? '—' : `${wStats.perWk > 0 ? '+' : ''}${wStats.perWk}`}
              color={wStats.perWk == null ? T.muted : wStats.perWk < 0 ? T.ok : T.over} />
          </div>
        )}
      </div>

      {/* goals & focus */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:12 }}>GOALS & FOCUS</div>

        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {['calorie', 'protein'].map(f => (
            <button key={f} onClick={() => updateGoals({ focus: f })}
              style={{ flex:1, padding:'9px 0', borderRadius:12, border:`1.5px solid ${goals.focus === f ? T.accent : T.border}`,
                background: goals.focus === f ? T.accentLight : 'transparent',
                color: goals.focus === f ? T.accent : T.muted,
                fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {f === 'calorie' ? 'Calorie focused' : 'Protein focused'}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { key:'kcal',    label:'Calories', unit:'kcal' },
            { key:'protein', label:'Protein',  unit:'g'    },
            { key:'carbs',   label:'Carbs',    unit:'g'    },
            { key:'fat',     label:'Fat',      unit:'g'    },
          ].map(({ key, label, unit }) => (
            <div key={key}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4, fontWeight:500 }}>{label} ({unit})</div>
              <input type="text" inputMode="numeric"
                value={goals[key] ?? ''}
                onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0) updateGoals({ [key]: v }); }}
                style={{ ...inp, padding:'9px 12px', fontSize:15 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* theme */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:12 }}>THEME</div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { key:'green', label:'Forest', accent:'#1C4230', bg:'#F6F6F2' },
            { key:'blue',  label:'Slate',  accent:'#4A6880', bg:'#EDF0F4' },
          ].map(t => (
            <button key={t.key} onClick={() => theme !== t.key && toggleTheme()}
              style={{ flex:1, padding:'12px', borderRadius:14, cursor:'pointer',
                border:`2px solid ${theme === t.key ? T.accent : T.border}`,
                background: theme === t.key ? T.accentLight : 'transparent',
                display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:t.accent, flexShrink:0,
                boxShadow:`inset 0 -6px 0 ${t.bg}22` }} />
              <span style={{ fontSize:13, fontWeight:600, color: theme === t.key ? T.accent : T.muted }}>{t.label}</span>
              {theme === t.key && <span style={{ marginLeft:'auto', fontSize:11, color:T.accent }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* data backup */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginTop:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:6 }}>DATA BACKUP</div>
        <p style={{ fontSize:12, color:T.muted, marginBottom:12, lineHeight:1.5 }}>
          Download your meals, plans, weights and saved meals as a JSON file. Upload to restore on any device.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleDownload}
            style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${T.border}`,
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:7, fontSize:13, fontWeight:600, color:T.ink }}>
            <Download size={15} color={T.accentSoft} /> Download
          </button>
          <button onClick={() => fileRef.current?.click()}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'none',
              background:T.accent, cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:7, fontSize:13, fontWeight:600, color:'#fff' }}>
            <Upload size={15} color="#fff" /> Upload
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display:'none' }} onChange={handleUpload} />
        </div>
        {importStatus === 'ok' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, fontSize:12, color:T.ok }}>
            <CheckCircle size={14} /> Data restored successfully
          </div>
        )}
        {importStatus === 'err' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, fontSize:12, color:T.over }}>
            <AlertCircle size={14} /> Invalid file — make sure it's a Nutrition Tracer backup
          </div>
        )}
      </div>
    </div>
  );
}
