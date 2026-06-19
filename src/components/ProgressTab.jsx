import { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { T, NF } from '../constants.js';

function AvgRow({ label, value, goal, unit, over }) {
  const pct   = goal ? Math.min(100, Math.round((value / goal) * 100)) : null;
  const isOk  = over ? value <= goal : value >= goal;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
      <div style={{ width:70, fontSize:12, color:T.muted, flexShrink:0 }}>{label}</div>
      <div style={{ flex:1, height:6, background:T.border, borderRadius:4, overflow:'hidden' }}>
        <div style={{ width:`${pct ?? 0}%`, height:'100%', borderRadius:4,
          background: isOk ? T.ok : T.over, transition:'width .4s ease' }} />
      </div>
      <div style={{ ...NF, fontSize:12, fontWeight:700, color: isOk ? T.ok : T.over, width:60, textAlign:'right', flexShrink:0 }}>
        {value}{unit} <span style={{ color:T.faint, fontWeight:400 }}>/ {goal}</span>
      </div>
    </div>
  );
}

export function ProgressTab({ weeklyNutrition, weeklyAvg, wStats, weekData, allWeights, streak, goals, onAiSummary, onAiPlan }) {
  const isProtein = goals.focus === 'protein';
  const [weightFilter, setWeightFilter] = useState('week');

  const weightChartData = (() => {
    if (weightFilter === 'week') return weekData;
    const weights = allWeights || [];
    if (weightFilter === 'month') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      return weights
        .filter(w => w.date >= cutoffStr)
        .map(w => {
          const d = new Date(w.date + 'T12:00:00');
          return { day: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }), date: w.date, kg: w.kg };
        });
    }
    // 'all' — group by month, average kg
    const byMonth = {};
    weights.forEach(w => {
      const key = w.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(w.kg);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, kgs]) => {
        const d = new Date(key + '-15T12:00:00');
        return {
          day: d.toLocaleDateString('en-US', { month:'short', year:'2-digit' }),
          date: key,
          kg: +( kgs.reduce((s, k) => s + k, 0) / kgs.length ).toFixed(1),
        };
      });
  })();
  const hasWeight = weightChartData.some(d => d.kg !== null);

  const barData  = weeklyNutrition.map(d => ({
    day:     d.day,
    value:   isProtein ? d.eaten.p : d.eaten.k,
    goal:    isProtein ? goals.protein : goals.kcal,
  }));
  const barGoal   = isProtein ? goals.protein : goals.kcal;
  const barLabel  = isProtein ? 'Protein (g)' : 'Calories (kcal)';
  const barColor  = isProtein ? T.gold : T.ok;

  const [aiResult,    setAiResult]    = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiErr,       setAiErr]       = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planErr,     setPlanErr]     = useState(null);

  const handleSummary = async () => {
    setAiLoading(true); setAiErr(null); setAiResult(null);
    try { setAiResult(await onAiSummary()); }
    catch (e) { setAiErr(e.message || 'Failed'); }
    setAiLoading(false);
  };

  const handlePlan = async () => {
    setPlanLoading(true); setPlanErr(null);
    try { await onAiPlan(); }
    catch (e) { setPlanErr(e.message || 'Failed'); }
    setPlanLoading(false);
  };

  return (
    <div style={{ padding:'16px 16px 8px' }}>

      {/* streak */}
      <div style={{ background:T.surface, borderRadius:20, padding:'14px 18px', marginBottom:12,
        boxShadow:'0 1px 8px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:14, background:T.accentLight,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Zap size={20} color={T.gold} />
        </div>
        <div>
          <div style={{ ...NF, fontSize:28, fontWeight:700, color: streak > 0 ? T.gold : T.faint, lineHeight:1 }}>
            {streak} <span style={{ fontSize:14, color:T.muted, fontWeight:400 }}>day streak</span>
          </div>
          <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
            {streak > 0
              ? `${streak} consecutive day${streak > 1 ? 's' : ''} hitting your ${isProtein ? 'protein' : 'calorie'} goal`
              : `Hit your ${isProtein ? 'protein' : 'calorie'} goal to start a streak`}
          </div>
        </div>
      </div>

      {/* weekly avg */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700 }}>WEEKLY AVERAGES</div>
          {weeklyAvg && <div style={{ fontSize:11, color:T.faint }}>{weeklyAvg.days} day{weeklyAvg.days > 1 ? 's' : ''} logged</div>}
        </div>
        {!weeklyAvg ? (
          <p style={{ fontSize:13, color:T.faint, textAlign:'center', padding:'8px 0' }}>Check off meals to see weekly averages.</p>
        ) : (
          <>
            {isProtein ? (
              <>
                <AvgRow label="Protein"  value={weeklyAvg.p} goal={goals.protein} unit="g"    over={false} />
                <AvgRow label="Calories" value={weeklyAvg.k} goal={goals.kcal}    unit=" kcal" over={true}  />
              </>
            ) : (
              <>
                <AvgRow label="Calories" value={weeklyAvg.k} goal={goals.kcal}    unit=" kcal" over={true}  />
                <AvgRow label="Protein"  value={weeklyAvg.p} goal={goals.protein} unit="g"    over={false} />
              </>
            )}
            <AvgRow label="Carbs" value={weeklyAvg.c} goal={goals.carbs} unit="g" over={true}  />
            <AvgRow label="Fat"   value={weeklyAvg.f} goal={goals.fat}   unit="g" over={true}  />
          </>
        )}
      </div>

      {/* daily bar chart */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 8px 12px 0', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, paddingLeft:18, marginBottom:8 }}>
          {barLabel.toUpperCase()} THIS WEEK
        </div>
        <div style={{ width:'100%', height:180 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top:4, right:16, bottom:2, left:0 }}>
              <CartesianGrid stroke={T.border} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={{ borderRadius:10, border:`1px solid ${T.border}`, fontSize:12 }}
                formatter={v => [`${v} ${isProtein ? 'g' : 'kcal'}`, isProtein ? 'Protein' : 'Calories']} />
              <ReferenceLine y={barGoal} stroke={T.over} strokeDasharray="4 3" strokeWidth={1.5} />
              <Bar dataKey="value" fill={barColor} radius={[4,4,0,0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* weight chart */}
      <div style={{ background:T.surface, borderRadius:20, padding:'16px 8px 12px 0', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:18, paddingRight:12, marginBottom:8 }}>
          <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700 }}>WEIGHT TREND</div>
          <div style={{ display:'flex', gap:4 }}>
            {['week','month','all'].map(f => (
              <button key={f} onClick={() => setWeightFilter(f)}
                style={{ padding:'3px 9px', borderRadius:20, border:`1px solid ${weightFilter === f ? T.accent : T.border}`,
                  background: weightFilter === f ? T.accentLight : 'transparent',
                  color: weightFilter === f ? T.accent : T.muted,
                  fontSize:10, fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {!hasWeight ? (
          <p style={{ padding:'20px 18px', textAlign:'center', color:T.faint, fontSize:13 }}>
            Log your weight in Settings to build the trend.
          </p>
        ) : (
          <div style={{ width:'100%', height:160 }}>
            <ResponsiveContainer>
              <LineChart data={weightChartData} margin={{ top:4, right:16, bottom:2, left:0 }}>
                <CartesianGrid stroke={T.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize:10, fill:T.muted }} axisLine={{ stroke:T.border }} tickLine={false} />
                <YAxis domain={['auto','auto']} tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ borderRadius:10, border:`1px solid ${T.border}`, fontSize:12 }}
                  formatter={v => v === null ? ['—','Weight'] : [`${v} kg`,'Weight']} />
                <Line type="monotone" dataKey="kg" stroke={T.accent} strokeWidth={2.5}
                  dot={{ r:3, fill:T.accent }} activeDot={{ r:5 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
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
            <Sparkles size={14} /> {aiLoading ? 'Thinking…' : 'Summarise week'}
          </button>
          <button onClick={handlePlan} disabled={planLoading}
            style={{ flex:1, padding:'11px 0', borderRadius:12, border:`1.5px solid ${T.border}`,
              background:'transparent', color: planLoading ? T.faint : T.ink,
              fontSize:13, fontWeight:600, cursor: planLoading ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Sparkles size={14} /> {planLoading ? 'Generating…' : 'Generate plan'}
          </button>
        </div>
        {aiErr   && <p style={{ fontSize:12, color:T.over, marginBottom:10 }}>{aiErr}</p>}
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
                <b>Tip:</b> {aiResult.tip}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
