import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { T, NF, inp } from '../constants.js';
import { StatCard } from './ui.jsx';

export function ProgressTab({ wInput, setWInput, day, logWeight, wStats, weekData, goals, updateGoals, onAiSummary, onAiPlan }) {
  const hasAny = weekData.some(d => d.kg !== null);
  const dayLabel = (() => {
    try { return new Date(day + 'T12:00:00').toLocaleDateString('en-AU', { weekday:'long', month:'short', day:'numeric' }); }
    catch { return day; }
  })();

  const [aiResult,  setAiResult]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr,     setAiErr]     = useState(null);

  const [planLoading, setPlanLoading] = useState(false);
  const [planErr,     setPlanErr]     = useState(null);

  const handleSummary = async () => {
    setAiLoading(true); setAiErr(null); setAiResult(null);
    try {
      const result = await onAiSummary();
      setAiResult(result);
    } catch (e) {
      setAiErr(e.message || 'Failed to get summary');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePlan = async () => {
    setPlanLoading(true); setPlanErr(null);
    try {
      await onAiPlan();
    } catch (e) {
      setPlanErr(e.message || 'Failed to generate plan');
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <div style={{ padding:'16px 16px 8px' }}>

      {/* weigh-in */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:10 }}>LOG A WEIGH-IN</div>
        <div style={{ fontSize:12, color:T.muted, marginBottom:10, background:T.bg, borderRadius:10, padding:'7px 12px' }}>
          Logging for <b style={{ color:T.ink }}>{dayLabel}</b> — switch day tabs to log a different day
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
          <input value={wInput} onChange={e => setWInput(e.target.value)} inputMode="decimal" placeholder="87.5"
            style={{ ...inp, flex:1 }} />
          <span style={{ color:T.muted, fontSize:14, flexShrink:0 }}>kg</span>
          <button onClick={logWeight}
            style={{ flexShrink:0, padding:'12px 18px', borderRadius:12, border:'none',
              background:T.accent, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:5 }}>
            <Plus size={16} /> Log
          </button>
        </div>
        <p style={{ fontSize:12, color:T.faint, marginTop:6 }}>Same morning, same conditions. The trend is the truth.</p>
      </div>

      {/* stat cards */}
      {wStats && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
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

      {/* weight chart */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 8px 12px 0', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, paddingLeft:18, marginBottom:8 }}>WEIGHT TREND — THIS WEEK</div>
        {!hasAny ? (
          <p style={{ padding:'24px 18px', textAlign:'center', color:T.faint, fontSize:13 }}>
            Switch to each day tab and log your weight to build the trend.
          </p>
        ) : (
          <div style={{ width:'100%', height:200 }}>
            <ResponsiveContainer>
              <LineChart data={weekData} margin={{ top:4, right:16, bottom:2, left:0 }}>
                <CartesianGrid stroke={T.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize:10, fill:T.muted }} axisLine={{ stroke:T.border }} tickLine={false} />
                <YAxis domain={['auto','auto']} tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ borderRadius:10, border:`1px solid ${T.border}`, fontSize:12 }}
                  formatter={v => v === null ? ['—', 'Weight'] : [`${v} kg`, 'Weight']} />
                <Line type="monotone" dataKey="kg" stroke={T.accent} strokeWidth={2.5}
                  dot={{ r:3, fill:T.accent }} activeDot={{ r:5 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* goals & focus */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:12 }}>GOALS & FOCUS</div>

        {/* focus toggle */}
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

        {/* macro inputs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { key:'kcal',    label:'Calories', unit:'kcal' },
            { key:'protein', label:'Protein',  unit:'g'    },
            { key:'carbs',   label:'Carbs',    unit:'g'    },
            { key:'fat',     label:'Fat',      unit:'g'    },
          ].map(({ key, label, unit }) => (
            <div key={key}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4, fontWeight:500 }}>{label} ({unit})</div>
              <input
                type="number" inputMode="numeric"
                value={goals[key] ?? ''}
                onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0) updateGoals({ [key]: v }); }}
                style={{ ...inp, padding:'9px 12px', fontSize:15 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI insights */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:12 }}>AI INSIGHTS</div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button onClick={handleSummary} disabled={aiLoading}
            style={{ flex:1, padding:'11px 0', borderRadius:12, border:'none',
              background: aiLoading ? T.border : T.accent, color:'#fff',
              fontSize:13, fontWeight:600, cursor: aiLoading ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Sparkles size={14} /> {aiLoading ? 'Thinking…' : 'Summarise this week'}
          </button>
          <button onClick={handlePlan} disabled={planLoading}
            style={{ flex:1, padding:'11px 0', borderRadius:12, border:`1.5px solid ${T.border}`,
              background:'transparent', color: planLoading ? T.faint : T.ink,
              fontSize:13, fontWeight:600, cursor: planLoading ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Sparkles size={14} /> {planLoading ? 'Generating…' : 'Generate Week Plan'}
          </button>
        </div>

        {aiErr && <p style={{ fontSize:12, color:T.over, marginBottom:10 }}>{aiErr}</p>}
        {planErr && <p style={{ fontSize:12, color:T.over, marginBottom:10 }}>{planErr}</p>}

        {aiResult && (
          <div style={{ fontSize:13, color:T.ink }}>
            <p style={{ marginBottom:10, lineHeight:1.5 }}>{aiResult.summary}</p>
            {aiResult.wins?.length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontWeight:600, color:T.ok, marginBottom:4 }}>Wins</div>
                {aiResult.wins.map((w, i) => <div key={i} style={{ marginBottom:3 }}>• {w}</div>)}
              </div>
            )}
            {aiResult.improvements?.length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontWeight:600, color:T.gold, marginBottom:4 }}>To improve</div>
                {aiResult.improvements.map((w, i) => <div key={i} style={{ marginBottom:3 }}>• {w}</div>)}
              </div>
            )}
            {aiResult.tip && (
              <div style={{ background:T.accentLight, borderRadius:10, padding:'10px 12px', fontSize:12, color:T.accent, marginTop:8 }}>
                <b>Tip for next week:</b> {aiResult.tip}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
