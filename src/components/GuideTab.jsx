import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { T, NF } from '../constants.js';

function SectionHead({ num, title, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
      <span style={{ ...NF, fontSize:12, color:T.gold, fontWeight:700, paddingTop:4 }}>{num}</span>
      <div>
        <div style={{ fontSize:20, fontWeight:700, color:T.ink, letterSpacing:-0.3, lineHeight:1.15 }}>{title}</div>
        {sub && <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>{sub}</div>}
      </div>
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

  const KCAL_PER_KG = 7700;
  const perWk  = (deficit * 7) / KCAL_PER_KG;
  const perMo  = (deficit * 30) / KCAL_PER_KG;
  const cur    = parseFloat(curWt);
  const goal   = parseFloat(goalWt);
  const toGoal = (!isNaN(cur) && !isNaN(goal) && cur > goal) ? Math.round((cur - goal) / perWk) : null;

  const inputStyle = {
    width:72, textAlign:'center', fontWeight:700, fontSize:15, color:T.accent,
    background:`${T.accent}14`, border:`1.5px solid ${T.border}`, borderRadius:10,
    padding:'7px 4px', outline:'none', WebkitAppearance:'none', MozAppearance:'textfield',
  };

  return (
    <div style={{ padding:'16px 16px 32px', overflowY:'auto' }}>

      {/* ── header ── */}
      <div style={{ marginBottom:22 }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:8 }}>
          FAT-LOSS FIELD GUIDE
        </div>
        <div style={{ fontSize:28, fontWeight:800, color:T.ink, lineHeight:1.05, letterSpacing:-0.5, marginBottom:8 }}>
          Trust the <span style={{ color:T.accent }}>trend</span>,<br/>not the day.
        </div>
        <div style={{ fontSize:14, color:T.muted, lineHeight:1.55, maxWidth:'46ch' }}>
          A reminder card for the days the scale messes with your head. Your week-over-week average is the real you. Everything below explains why the daily bounces aren't.
        </div>
      </div>

      {/* ── 00 live deficit ── */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="00" title={isToday ? "Today's deficit — live" : `${dayName} — deficit`}
          sub="Checked meals minus logged exercise, against maintenance." />
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px' }}>

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

      {/* ── hero reassurance ── */}
      <div style={{ background:T.accent, borderRadius:16, padding:'20px 18px', marginBottom:22, position:'relative', overflow:'hidden' }}>
        <div style={{ fontSize:19, fontWeight:800, color:'#fff', lineHeight:1.25, marginBottom:10, position:'relative' }}>
          You'd need ~<span style={{ color:'#7FD3A8' }}>5,000 kcal</span> surplus in one day to gain just 350 g of fat.
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.72)', lineHeight:1.55, position:'relative' }}>
          Your biggest logged day in two weeks was 2,210. So a same-day jump on the scale is physically impossible to be fat — it's water, glycogen, food in transit, or recovery. Read that twice next time you panic.
        </div>
      </div>

      {/* ── 01 deficit calculator ── */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="01" title="Your deficit — your loss" sub="Drag to see what each daily deficit actually buys you." />
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px' }}>
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
        </div>
      </div>

      {/* ── 02 why the scale jumps ── */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="02" title="Why the scale jumps" sub="All temporary. All reversible. None of it fat." />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { tag:'GLYCOGEN + WATER', amt:'0.5–2 kg',   body:'A high-carb day refills glycogen, and each gram holds 3–4 g of water. Your carbs can swing 100+ g day to day — that alone moves the scale.' },
            { tag:'SODIUM',           amt:'0.5–1.5 kg', body:'One salty meal pulls in water for a day or two. Looks like gain, weighs like gain, isn\'t gain.' },
            { tag:'FOOD IN TRANSIT',  amt:'varies',     body:'Food and fluid physically inside you still count on the scale until they\'ve passed through.' },
            { tag:'RECOVERY',         amt:'24–72 hrs',  body:'A long golf round or a gym session inflames muscle and holds water while it repairs — temporary, and a sign of progress.' },
          ].map(({ tag, amt, body }) => (
            <div key={tag} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 13px' }}>
              <div style={{ ...NF, fontSize:10, color:T.accent, letterSpacing:1, marginBottom:4 }}>{tag}</div>
              <div style={{ fontSize:18, fontWeight:700, color:T.ink, marginBottom:6 }}>{amt}</div>
              <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 03 glycogen explainer ── */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="03" title="How glycogen works" sub="The single biggest reason your daily weight wanders." />
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
      </div>

      {/* ── 04 move more ── */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="04" title="Move to burn more fat" sub="Ordered by impact for your situation." />
        <div style={{ display:'grid', gap:10 }}>
          {[
            {
              rank:'01', accent:T.accent,
              title:'Steps — your biggest lever',
              body:'From ~300 to 5,000–7,000 a day. Burns real fat without eating less, lower-risk than cutting food further. The highest-impact change you can make.',
              pills:['+200–300 kcal/day', 'no extra hunger'],
            },
            {
              rank:'02', accent:T.accent,
              title:'Lift twice a week',
              body:'Doesn\'t burn huge calories in the session — its job is to tell your body to drop fat instead of muscle while in a deficit. Two full-body days is plenty.',
              pills:['Mon: Leg Press · Bench · Lat Pulldown · Row · Shoulder Press', 'Thu: Squat · RDL · Incline DB Press · Row · Lateral Raise · Curls'],
            },
            {
              rank:'03', accent:T.gold,
              title:'Get stronger, don\'t chase the burn',
              body:'Add a little weight or a rep over time. Progress on the bar protects muscle — not how sweaty or smashed a session leaves you.',
              pills:['45–60 min', 'progressive overload'],
            },
          ].map(({ rank, accent, title, body, pills }) => (
            <div key={rank} style={{ display:'flex', gap:12, background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:14 }}>
              <div style={{ ...NF, fontSize:12, color:'#fff', background:accent, borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                {rank}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:13, color:T.muted, lineHeight:1.5, marginBottom:8 }}>{body}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {pills.map(p => (
                    <span key={p} style={{ fontSize:11, background:`${T.accent}14`, color:T.accent, padding:'3px 8px', borderRadius:99 }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 05 golf day ── */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="05" title="Golf day playbook" sub="Your round burns ~1,250–1,500 active kcal. Use it." />
        <div style={{ background:T.ink, borderRadius:16, padding:'18px 16px' }}>
          {[
            { bold:'Expect the scale up the next morning.',        body:'4–5 hours of walking inflames muscle and holds water for 24–72 hrs. It\'s recovery, not fat — don\'t react to it.' },
            { bold:'Walk the course, skip the cart',               body:'where you can. That\'s most of the 1,250–1,500 kcal, and it\'s the easy win.' },
            { bold:'Hydrate and don\'t blow the deficit at the 19th.', body:'A few post-round beers and a big meal can erase the whole day\'s burn — that\'s the one way golf works against you.' },
            { bold:'Eat a touch more protein and carbs that day.', body:'You earned the calories; refuel glycogen so you recover and keep muscle. This is your highest-output day.' },
            { bold:'Pair it with a heavier-eating day or a lift',  body:'if you like — your output is highest here, so it\'s the best day to flex food upward without stalling.' },
          ].map(({ bold, body }, i) => (
            <div key={i} style={{ display:'flex', gap:12, marginBottom: i < 4 ? 14 : 0, fontSize:13.5, color:'#CFDDD5', lineHeight:1.55 }}>
              <span style={{ color:'#7FD3A8', fontWeight:700, fontSize:16, lineHeight:1.4, flexShrink:0 }}>⊕</span>
              <span><b style={{ color:'#fff' }}>{bold}</b> {body}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize:12, color:T.faint, lineHeight:1.55, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
        The 7,700 kcal/kg figure is a standard approximation; individual results vary, and early loss skews toward water. General guidance — not personalised medical advice.
      </div>
    </div>
  );
}
