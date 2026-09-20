import { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import { T, NF, EXERCISE_PRESETS, shiftISO, localDateISO } from '../constants.js';

/* ── Coach tab ──
   Answers two questions, in this order: "Am I on track this week?" and "what did I do today?".
   The maintenance setting and its calibration check live in Settings (they are configuration,
   not a daily read). The long fat-loss field guide is reduced to one collapsed fold. */

function Fold({ title, sub, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
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

const Cell = ({ label, value, unit, color }) => (
  <div style={{ background:T.surface, padding:'12px 6px', textAlign:'center' }}>
    <div style={{ fontSize:10, color:T.muted, letterSpacing:0.5, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
    <div style={{ ...NF, fontSize:20, fontWeight:700, color: color || T.ink, lineHeight:1 }}>
      {value} <span style={{ fontSize:11, color:T.muted, fontWeight:400 }}>{unit}</span>
    </div>
  </div>
);

export function GuideTab({ goals, dayName, isToday, eaten, exercise, exerciseK, addExercise, removeExercise,
  weeklyDeficit, wStats, markers = [] }) {
  const [exName, setExName] = useState('');
  const [exKcal, setExKcal] = useState('');

  const submitExercise = () => {
    const k = Math.round(parseFloat(exKcal));
    const n = exName.trim();
    if (!n || !Number.isFinite(k) || k <= 0) return;
    addExercise(n.slice(0, 28), k);
    setExName(''); setExKcal('');
  };

  // A marker (creatine start, new block…) inside the last 4 weeks means the scale is
  // carrying water that the trend line will misread as slower fat loss.
  const today = localDateISO();
  const recentMarker = markers.find(m => m.date >= shiftISO(today, -28) && m.date <= today);

  const wk = weeklyDeficit;
  const verdict = (() => {
    if (!wk) return null;
    const d = wk.avgDeficit;
    if (d < 0)   return { color:T.over, text:'Surplus this week. One or two big days usually explain it — check the weekend.' };
    if (d < 200) return { color:T.gold, text:'Thin deficit. Fat loss will be slow at this pace; weekends are usually where it leaks.' };
    if (d <= 700) return { color:T.ok, text:'On track. This pace loses about a third of a kilo a week. Keep doing this.' };
    return { color:T.gold, text:'Aggressive. Fine for a week, but watch recovery if you are lifting.' };
  })();

  const rate = wStats?.recentPerWk;

  return (
    <div style={{ padding:'16px 16px 32px', overflowY:'auto' }}>

      {/* ── header ── */}
      <div style={{ marginBottom:18 }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:8 }}>COACH</div>
        <div style={{ fontSize:28, fontWeight:800, color:T.ink, lineHeight:1.05, letterSpacing:-0.5 }}>
          Trust the <span style={{ color:T.accent }}>trend</span>,<br/>not the day.
        </div>
      </div>

      {/* ── this week ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px', marginBottom:12 }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:10 }}>THIS WEEK</div>

        {!wk ? (
          <div style={{ fontSize:13, color:T.muted }}>Check off meals to see how the week is tracking.</div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:4 }}>
              <span style={{ ...NF, fontSize:54, lineHeight:0.9, fontWeight:700, color: wk.avgDeficit < 0 ? T.over : T.accent }}>
                {Math.abs(Math.round(wk.avgDeficit)).toLocaleString()}
              </span>
              <span style={{ fontSize:13, color:T.muted, paddingBottom:7 }}>
                kcal/day {wk.avgDeficit < 0 ? 'surplus' : 'deficit'}, average
              </span>
            </div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>
              ≈ <b style={{ color:T.ink }}>{Math.abs(wk.paceKgWk).toFixed(2)} kg/wk</b> pace · {wk.days} day{wk.days === 1 ? '' : 's'} logged
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:T.border, borderRadius:12, overflow:'hidden' }}>
              <Cell label="Eaten / day" value={wk.avgEaten.toLocaleString()} unit="kcal" />
              <Cell label="Exercise / day" value={wk.avgEx.toLocaleString()} unit="kcal" />
              <Cell label="Target" value={goals.kcal.toLocaleString()} unit="kcal" color={wk.avgEaten > goals.kcal ? T.over : T.ink} />
            </div>

            {verdict && (
              <div style={{ fontSize:13, color:T.ink, marginTop:14, lineHeight:1.5, paddingLeft:10, borderLeft:`3px solid ${verdict.color}` }}>
                {verdict.text}
              </div>
            )}

            {/* what the scale says, smoothed, against the plan */}
            <div style={{ marginTop:14, paddingTop:12, borderTop:`1px dashed ${T.border}`, fontSize:12, color:T.muted, lineHeight:1.55 }}>
              {rate != null ? (
                <>
                  Scale, 7-day average: <b style={{ color: rate < 0 ? T.ok : rate > 0 ? T.over : T.ink }}>{rate > 0 ? '+' : ''}{rate.toFixed(2)} kg/wk</b> over the last 4 weeks.
                  {recentMarker && (
                    <> <b style={{ color:T.gold }}>"{recentMarker.label}"</b> ({new Date(recentMarker.date + 'T12:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short' })}) sits inside that window, so the scale is holding water and under-reads fat loss. Judge by the deficit above until it clears.</>
                  )}
                </>
              ) : (
                <>Log weight daily for four weeks and the scale trend will appear here.</>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── today ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'16px 16px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700 }}>{isToday ? 'TODAY' : dayName.toUpperCase()}</div>
          <div style={{ fontSize:12, color:T.muted }}>
            <b style={{ ...NF, fontSize:15, color: eaten.k > goals.kcal ? T.over : T.ink }}>{eaten.k.toLocaleString()}</b> / {goals.kcal.toLocaleString()} kcal eaten
            {exerciseK > 0 && <> · <b style={{ ...NF, fontSize:15, color:T.accent }}>−{exerciseK.toLocaleString()}</b> exercise</>}
          </div>
        </div>

        {exercise.map((e, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <button onClick={() => removeExercise(i)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:2, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} color={T.faint} />
            </button>
            <span style={{ flex:1, fontSize:14, fontWeight:600, color:T.ink, minWidth:0 }}>{e.n}</span>
            <span style={{ ...NF, fontSize:14, fontWeight:700, color:T.accent }}>−{(+e.k || 0).toLocaleString()} kcal</span>
          </div>
        ))}

        {/* presets fill the inputs so the kcal can still be adjusted before adding */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginTop: exercise.length ? 8 : 0, scrollbarWidth:'none' }}>
          {EXERCISE_PRESETS.map(p => (
            <button key={p.n} onClick={() => { setExName(p.n); setExKcal(String(p.k)); }}
              style={{ flexShrink:0, padding:'5px 10px', borderRadius:20, border:`1px solid ${exName === p.n ? T.accent : T.border}`,
                background: exName === p.n ? T.accentLight : 'transparent', color: exName === p.n ? T.accent : T.muted,
                fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              {p.n} · {p.k}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:6 }}>
          <input value={exName} onChange={e => setExName(e.target.value)} placeholder="Log exercise…"
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
        <div style={{ fontSize:11, color:T.faint, marginTop:8 }}>
          Exercise deepens the deficit shown above. It never raises the eating target.
        </div>
      </div>

      {/* ── one fold of reading material ── */}
      <Fold title="Reading the scale" sub="Why a daily reading can jump a kilo without any fat changing.">
        {[
          ['Water and glycogen', 'A high-carb or salty day holds 0.5–2 kg of water for a day or two. Big golf-weekend dinners do this every week.'],
          ['Creatine', 'Pulls about a kilo of water into muscle in the first weeks and keeps it there while you take it. Compare against the weight after it settled, not before.'],
          ['Training', 'A hard session inflames muscle and holds water for 24–72 hours. A sign of work done, not fat gained.'],
          ['The whoosh', 'Fat loss often shows up as a flat fortnight then a sudden drop. Your log has done this twice already. Judge by the 7-day average over four weeks.'],
        ].map(([h, body]) => (
          <div key={h} style={{ marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:2 }}>{h}</div>
            <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.5 }}>{body}</div>
          </div>
        ))}
        <div style={{ fontSize:11, color:T.faint, lineHeight:1.5, marginTop:6 }}>
          1 kg of fat ≈ 7,700 kcal. Your daily burn setting lives in Settings → Goals, with a check against your own scale data.
        </div>
      </Fold>
    </div>
  );
}
