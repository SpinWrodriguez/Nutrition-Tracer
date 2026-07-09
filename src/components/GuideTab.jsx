import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import { T, NF } from '../constants.js';

function Fold({ title, sub, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, marginBottom:10, overflow:'hidden' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
          padding:'14px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{title}</div>
          {sub && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{sub}</div>}
        </div>
        <ChevronDown size={16} color={T.muted} style={{ flexShrink:0, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .15s' }} />
      </button>
      {open && <div style={{ padding:'0 14px 14px' }}>{children}</div>}
    </div>
  );
}

export function GuideTab({ wStats, goals, updateGoals, dayName, isToday,
  eaten, exercise, exerciseK, addExercise, removeExercise, weeklyDeficit }) {
  const [deficit, setDeficit] = useState(300);
  const [curWt,   setCurWt]   = useState('');
  const [goalWt,  setGoalWt]  = useState('80');
  const [exName,  setExName]  = useState('');
  const [exKcal,  setExKcal]  = useState('');

  useEffect(() => {
    if (wStats?.current) setCurWt(String(wStats.current.toFixed(1)));
  }, [wStats?.current]);

  const KCAL_PER_KG = 7700;
  const perWk  = (deficit * 7) / KCAL_PER_KG;
  const perMo  = (deficit * 30) / KCAL_PER_KG;
  const cur    = parseFloat(curWt);
  const goal   = parseFloat(goalWt);
  const toGoal = (!isNaN(cur) && !isNaN(goal) && cur > goal) ? Math.round((cur - goal) / perWk) : null;

  const maint    = goals.maintenance || 2200;
  const net      = eaten.k - exerciseK;
  const dayDef   = maint - net;
  const surplus  = dayDef < 0;

  const submitExercise = () => {
    const k = Math.round(parseFloat(exKcal));
    const n = exName.trim();
    if (!n || !Number.isFinite(k) || k <= 0) return;
    addExercise(n.slice(0, 28), k);
    setExName(''); setExKcal('');
  };

  const inputStyle = {
    width:72, textAlign:'center', fontWeight:700, fontSize:15, color:T.accent,
    background:`${T.accent}14`, border:`1.5px solid ${T.border}`, borderRadius:10,
    padding:'7px 4px', outline:'none', WebkitAppearance:'none', MozAppearance:'textfield',
  };

  return (
    <div style={{ padding:'16px 16px 32px', overflowY:'auto' }}>

      {/* ── header ── */}
      <div style={{ marginBottom:18 }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:8 }}>
          COACH
        </div>
        <div style={{ fontSize:28, fontWeight:800, color:T.ink, lineHeight:1.05, letterSpacing:-0.5 }}>
          Trust the <span style={{ color:T.accent }}>trend</span>,<br/>not the day.
        </div>
      </div>

      {/* ── live deficit ── */}
      <div style={{ marginBottom:22 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px' }}>

          <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:10 }}>
            {isToday ? "TODAY'S DEFICIT — LIVE" : `${dayName.toUpperCase()} — DEFICIT`}
          </div>

          {/* headline number */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginBottom:14 }}>
            <span style={{ ...NF, fontSize:54, lineHeight:0.9, color: surplus ? T.over : T.accent, fontWeight:700 }}>
              {Math.abs(dayDef).toLocaleString()}
            </span>
            <span style={{ fontSize:13, color:T.muted, paddingBottom:7 }}>
              kcal {surplus ? 'surplus' : 'deficit'} so far
            </span>
          </div>

          {/* eaten / exercise / net */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:T.border, borderRadius:12, overflow:'hidden' }}>
            {[
              { label:'Eaten',    value:eaten.k.toLocaleString(),    unit:'kcal' },
              { label:'Exercise', value:exerciseK ? `−${exerciseK.toLocaleString()}` : '0', unit:'kcal' },
              { label:'Net',      value:net.toLocaleString(),        unit:'kcal' },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{ background:T.surface, padding:'13px 8px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:T.muted, letterSpacing:0.5, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                <div style={{ ...NF, fontSize:22, fontWeight:700, color:T.ink, lineHeight:1 }}>
                  {value} <span style={{ fontSize:11, color:T.muted, fontWeight:400 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* maintenance */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14, fontSize:13, color:T.muted }}>
            <span>Blended maintenance</span>
            <input type="number" inputMode="numeric" value={maint}
              onChange={e => updateGoals({ maintenance: Math.max(0, Math.round(+e.target.value || 0)) })}
              style={inputStyle} />
            <span>kcal</span>
          </div>

          {/* exercise log */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px dashed ${T.border}` }}>
            <div style={{ ...NF, fontSize:10, color:T.accent, letterSpacing:1, marginBottom:8 }}>EXERCISE LOG</div>
            {exercise.map((e, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <button onClick={() => removeExercise(i)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={14} color={T.faint} />
                </button>
                <span style={{ flex:1, fontSize:14, fontWeight:600, color:T.ink, minWidth:0 }}>{e.n}</span>
                <span style={{ ...NF, fontSize:14, fontWeight:700, color:T.accent }}>−{(+e.k || 0).toLocaleString()} kcal</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:6, marginTop: exercise.length ? 10 : 0 }}>
              <input value={exName} onChange={e => setExName(e.target.value)} placeholder="Golf, gym session…"
                onKeyDown={e => { if (e.key === 'Enter') submitExercise(); }}
                style={{ flex:1, minWidth:0, fontSize:14, color:T.ink, background:T.bg,
                  border:`1.5px solid ${T.border}`, borderRadius:10, padding:'8px 10px', outline:'none' }} />
              <input value={exKcal} onChange={e => { if (/^\d*$/.test(e.target.value)) setExKcal(e.target.value); }}
                placeholder="kcal" type="text" inputMode="numeric"
                onKeyDown={e => { if (e.key === 'Enter') submitExercise(); }}
                style={{ width:64, textAlign:'center', fontSize:14, fontWeight:700, color:T.accent, background:T.bg,
                  border:`1.5px solid ${T.border}`, borderRadius:10, padding:'8px 4px', outline:'none' }} />
              <button onClick={submitExercise}
                style={{ background:T.accent, border:'none', borderRadius:10, width:38, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Plus size={17} color="#fff" />
              </button>
            </div>
          </div>

          {/* weekly rollup */}
          {weeklyDeficit && (
            <div style={{ fontSize:12, color:T.muted, marginTop:14, lineHeight:1.55 }}>
              This week: ~<b style={{ color: weeklyDeficit.total < 0 ? T.over : T.accent }}>{Math.abs(weeklyDeficit.total).toLocaleString()} kcal {weeklyDeficit.total < 0 ? 'surplus' : 'deficit'}</b> across {weeklyDeficit.days} logged day{weeklyDeficit.days === 1 ? '' : 's'} ≈ <b style={{ color:T.ink }}>{Math.abs(weeklyDeficit.kg).toFixed(2)} kg</b> of fat. Your eating target and protein goal don't move — exercise deepens the deficit, it doesn't buy food back.
            </div>
          )}
        </div>
      </div>

      {/* ── field guide (collapsed) ── */}
      <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:10 }}>
        FAT-LOSS FIELD GUIDE
      </div>

      <Fold title="Your deficit — your loss" sub="Drag to see what each daily deficit actually buys you.">
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginBottom:18 }}>
          <span style={{ ...NF, fontSize:54, lineHeight:0.9, color:T.accent, fontWeight:700 }}>{deficit}</span>
          <span style={{ fontSize:13, color:T.muted, paddingBottom:7 }}>kcal / day deficit</span>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12, color:T.muted }}>
          <span>Eat less / move more</span>
          <span style={{ fontWeight:600, color:T.ink }}>{(deficit * 7).toLocaleString()} kcal / week</span>
        </div>
        <input type="range" min={200} max={700} step={25} value={deficit}
          onChange={e => setDeficit(Number(e.target.value))}
          style={{ width:'100%', accentColor:T.accent, cursor:'pointer' }} />
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.faint, marginTop:4 }}>
          <span>200</span><span>400</span><span>700</span>
        </div>

        {/* weight inputs */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:18, fontSize:13, color:T.muted }}>
          <span>From</span>
          <input type="number" inputMode="decimal" step="0.1" value={curWt}
            onChange={e => setCurWt(e.target.value)} style={inputStyle} />
          <span style={{ color:T.accent, fontWeight:700, fontSize:18 }}>→</span>
          <input type="number" inputMode="decimal" step="0.1" value={goalWt}
            onChange={e => setGoalWt(e.target.value)} style={inputStyle} />
          <span>kg</span>
        </div>

        {/* stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:T.border, borderRadius:12, overflow:'hidden', marginTop:18 }}>
          {[
            { label:'Fat / week',  value:perWk.toFixed(2), unit:'kg' },
            { label:'Fat / month', value:perMo.toFixed(1),  unit:'kg' },
            { label:'To goal',     value:toGoal != null ? String(toGoal) : '—', unit:toGoal != null ? 'wks' : '' },
          ].map(({ label, value, unit }) => (
            <div key={label} style={{ background:T.surface, padding:'13px 8px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.muted, letterSpacing:0.5, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
              <div style={{ ...NF, fontSize:22, fontWeight:700, color:T.ink, lineHeight:1 }}>
                {value} <span style={{ fontSize:11, color:T.muted, fontWeight:400 }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:12, color:T.muted, marginTop:12, lineHeight:1.55 }}>
          Maths: 1 kg of fat ≈ 7,700 kcal. Your everyday working deficit sits near <b style={{ color:T.over }}>~300 kcal</b> (≈1,900 eaten vs ≈2,200 blended maintenance), edging higher on golf weeks. The scale often drops <em>faster</em> than this early on — that's water leaving, not magic. It then settles to the true fat rate.
        </div>
      </Fold>

      <Fold title="You can't gain fat overnight" sub="It takes a ~5,000 kcal surplus to gain just 350 g.">
        <div style={{ background:T.accent, borderRadius:14, padding:'18px 16px' }}>
          <div style={{ fontSize:18, fontWeight:800, color:'#fff', lineHeight:1.25, marginBottom:10 }}>
            You'd need ~<span style={{ color:'#7FD3A8' }}>5,000 kcal</span> surplus in one day to gain just 350 g of fat.
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.72)', lineHeight:1.55 }}>
            Your biggest logged day in two weeks was 2,210. So a same-day jump on the scale is physically impossible to be fat — it's water, glycogen, food in transit, or recovery. Read that twice next time you panic.
          </div>
        </div>
      </Fold>

      <Fold title="Why the scale jumps" sub="All temporary. All reversible. None of it fat.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { tag:'GLYCOGEN + WATER', amt:'0.5–2 kg',   body:'A high-carb day refills glycogen, and each gram holds 3–4 g of water. Your carbs can swing 100+ g day to day — that alone moves the scale.' },
            { tag:'SODIUM',           amt:'0.5–1.5 kg', body:'One salty meal pulls in water for a day or two. Looks like gain, weighs like gain, isn\'t gain.' },
            { tag:'FOOD IN TRANSIT',  amt:'varies',     body:'Food and fluid physically inside you still count on the scale until they\'ve passed through.' },
            { tag:'RECOVERY',         amt:'24–72 hrs',  body:'A long golf round or a gym session inflames muscle and holds water while it repairs — temporary, and a sign of progress.' },
          ].map(({ tag, amt, body }) => (
            <div key={tag} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 13px' }}>
              <div style={{ ...NF, fontSize:10, color:T.accent, letterSpacing:1, marginBottom:4 }}>{tag}</div>
              <div style={{ fontSize:18, fontWeight:700, color:T.ink, marginBottom:6 }}>{amt}</div>
              <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </Fold>

      <Fold title="How glycogen works" sub="The single biggest reason your daily weight wanders.">
        <div style={{ background:`${T.accent}12`, borderRadius:14, padding:'18px 16px' }}>
          <p style={{ fontSize:14, color:T.ink, marginBottom:12, lineHeight:1.6 }}>
            Glycogen is your body's stored carbohydrate — a quick-energy reserve kept in your muscles (~300–500 g) and liver (~80–120 g).
          </p>
          <div style={{ borderLeft:`3px solid ${T.accent}`, paddingLeft:14, marginBottom:12 }}>
            <p style={{ fontSize:15, fontWeight:700, color:T.accent, lineHeight:1.4 }}>
              Every gram of glycogen is bound to roughly 3–4 g of water. So a full tank weighs far more on the scale than the carbs themselves.
            </p>
          </div>
          <p style={{ fontSize:14, color:T.ink, lineHeight:1.6 }}>
            Eat a big-carb day — scale up. Eat low-carb — scale down. In both cases your body fat hasn't changed at all. To lose actual fat, only one thing matters: a calorie deficit held steady across <b>weeks</b>.
          </p>
        </div>
      </Fold>

      <div style={{ fontSize:12, color:T.faint, lineHeight:1.55, paddingTop:16, borderTop:`1px solid ${T.border}`, marginTop:12 }}>
        The 7,700 kcal/kg figure is a standard approximation; individual results vary, and early loss skews toward water. General guidance — not personalised medical advice.
      </div>
    </div>
  );
}
