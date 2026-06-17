import { useState, useEffect } from 'react';
import { Flame, Dumbbell, TrendingUp, Star, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { T, NF, sf, SLOTS, toArr, one, sumSlot, isSkipOnly, getDayMeta } from './constants.js';
import { useAppData } from './hooks/useAppData.js';
import { useItemSheet } from './hooks/useItemSheet.js';
import { MacroGauge, NavBtn } from './components/ui.jsx';
import { MealCard } from './components/MealCard.jsx';
import { AiChat } from './components/AiChat.jsx';
import { AddItemSheet } from './components/AddItemSheet.jsx';
import { ProgressTab } from './components/ProgressTab.jsx';
import { SettingsTab } from './components/SettingsTab.jsx';
import { SavedMealsTab } from './components/SavedMealsTab.jsx';
import { aiWeeklySummary, aiGeneratePlan, compressImage } from './api.js';

export default function App() {
  const app = useAppData();
  const sheet = useItemSheet({
    sel:          app.sel,
    day:          app.day,
    addItem:      app.addItem,
    replaceItem:  app.replaceItem,
    setSlotPhoto:       app.setSlotPhoto,
    saveMeal:           app.saveMeal,
    syncPhotoToMealLib: app.syncPhotoToMealLib,
    savedMeals:         app.savedMeals,
  });

  // clipboard: { slotKey, items, label, fromDay }
  const [clipboard, setClipboard] = useState(null);

  const { day, setDay, tab, setTab, meta, sel, chk, photos, eaten, planned, adh } = app;
  const { openSheet, closeSheet, open, generatingSlot, photoErr, setPhotoErr, handleGeneratePhoto } = sheet;

  const todayISO = new Date().toISOString().slice(0, 10);

  /* ── theme toggle ── */
  const [theme, setTheme] = useState(() => localStorage.getItem('nt-theme') || 'green');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'blue' ? '#4A6880' : '#1C4230');
    localStorage.setItem('nt-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'green' ? 'blue' : 'green');

  /* ── week label for header ── */
  const weekLabel = (() => {
    const s = new Date(app.weekStart + 'T12:00:00');
    const e = new Date(app.weekStart + 'T12:00:00'); e.setDate(e.getDate() + 6);
    return `${s.toLocaleDateString('en-AU', { month:'short', day:'numeric' })} – ${e.toLocaleDateString('en-AU', { month:'short', day:'numeric' })}`;
  })();

  /* ── clipboard helpers ── */
  const copySlot = (slotKey) => {
    const items = toArr(sel[slotKey]);
    const label = SLOTS.find(s => s.key === slotKey)?.label || slotKey;
    const photo = photos[slotKey] || null;
    setClipboard({ slotKey, items, label, fromDay: meta.name, photo });
  };

  const pasteToSlot = (slotKey) => {
    if (!clipboard) return;
    app.setSlotItems(slotKey, clipboard.items);
    if (clipboard.photo) app.setSlotPhoto(slotKey, clipboard.photo);
    setClipboard(null);
  };

  /* ── AI callbacks passed to ProgressTab ── */
  const onAiSummary = async () => {
    const days = app.weekDates.map(date => {
      const dm = getDayMeta(date);
      const s  = app.data.selections[date] || {};
      const c  = app.data.checked[date]    || {};
      return {
        date,
        label: dm.name,
        slots: SLOTS.map(sl => ({
          key:   sl.key,
          label: sl.label,
          items: toArr(s[sl.key]).map(v => one(v)).filter(Boolean),
        })),
        checked: c,
      };
    });
    return aiWeeklySummary({ weekLabel, days, weights: app.weights, goals: app.goals });
  };

  const onAiPlan = async () => {
    const plan = await aiGeneratePlan({ savedMeals: app.savedMeals, goals: app.goals, weekLabel });
    app.applyWeekPlan(plan);
  };

  return (
    <div style={{ background:T.bg, minHeight:'100%', color:T.ink, ...sf }}>
      <div style={{ maxWidth:430, margin:'0 auto', paddingBottom:80 }}>

        {/* ── header ── */}
        <div style={{ background:T.accent, padding:'calc(env(safe-area-inset-top, 0px) + 10px) 16px 0', position:'sticky', top:0, zIndex:10 }}>

          {/* title + adherence row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:8 }}>
            <div>
              <div style={{ ...NF, fontSize:18, fontWeight:700, color:'#fff', lineHeight:1 }}>{meta.name}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2 }}>{meta.tag}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ ...NF, fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:1 }}>THIS WEEK</div>
              <div style={{ ...NF, fontSize:22, fontWeight:700, color:'#fff', lineHeight:1 }}>{adh.pct}%</div>
            </div>
          </div>

          {/* ── week navigation ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:8 }}>
            <button onClick={app.prevWeek}
              style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'4px 8px',
                color:'#fff', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.85)', fontWeight:500 }}>{weekLabel}</span>
            <button onClick={app.nextWeek}
              style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'4px 8px',
                color:'#fff', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ── day strip ── */}
        <div style={{ background:T.accent, paddingBottom:8 }}>
          <div style={{ display:'flex', gap:5, overflowX:'auto', padding:'0 12px', scrollbarWidth:'none' }}>
            {app.weekDates.map(date => {
              const dm      = getDayMeta(date);
              const active  = date === day;
              const isToday = date === todayISO;
              const dayNum  = new Date(date + 'T12:00:00').getDate();
              return (
                <button key={date} onClick={() => { setDay(date); closeSheet(); }}
                  style={{ flexShrink:0, minWidth:44, padding:'6px 4px', borderRadius:10, border:'none',
                    cursor:'pointer', background:active ? '#fff' : 'rgba(255,255,255,0.12)',
                    color:active ? T.accent : 'rgba(255,255,255,0.75)', position:'relative', transition:'background 0.15s' }}>
                  {dm.star && <div style={{ position:'absolute', top:3, right:4, width:4, height:4, borderRadius:'50%', background:T.gold }} />}
                  <div style={{ ...NF, fontSize:13, fontWeight:700 }}>{dm.label}</div>
                  <div style={{ fontSize:10, fontWeight:500, marginTop:1, opacity:0.85 }}>{dayNum}</div>
                  {isToday && <div style={{ fontSize:8, letterSpacing:0.5, marginTop:1, fontWeight:600, opacity:0.8 }}>TODAY</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── plan tab ── */}
        {tab === 'plan' && (
          <div style={{ padding:'16px 16px 8px' }}>

            {/* macro summary */}
            {(() => {
              const isProteinFocus = app.goals.focus === 'protein';
              const carbsOver = app.goals.carbs && eaten.c > app.goals.carbs;
              const fatOver   = app.goals.fat   && eaten.f > app.goals.fat;
              const calGauge  = <MacroGauge
                icon={<Flame size={14} color={eaten.k > app.goals.kcal ? T.over : T.ok} />}
                label="Calories eaten" value={eaten.k} goal={app.goals.kcal} unit="kcal"
                color={eaten.k > app.goals.kcal ? T.over : T.ok}
              />;
              const proGauge  = <MacroGauge
                icon={<Dumbbell size={14} color={T.gold} />}
                label="Protein eaten" value={eaten.p} goal={app.goals.protein} unit="g"
                color={T.gold}
              />;
              return (
                <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px 14px', marginBottom:14, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
                  {isProteinFocus ? proGauge : calGauge}
                  <div style={{ height:14 }} />
                  {isProteinFocus ? calGauge : proGauge}
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:12, paddingTop:10, borderTop:`1px dashed ${T.border}`, fontSize:12, color:T.muted }}>
                    <span>
                      Carbs <b style={{ color:T.ink }}>{eaten.c}g</b>
                      <span style={{ color: carbsOver ? T.over : T.faint, marginLeft:2 }}>{carbsOver ? '↑' : '↓'}</span>
                      {' · '}
                      Fat <b style={{ color:T.ink }}>{eaten.f}g</b>
                      <span style={{ color: fatOver ? T.over : T.faint, marginLeft:2 }}>{fatOver ? '↑' : '↓'}</span>
                    </span>
                    <span style={{ color:T.faint }}>Plan: {planned.k} kcal</span>
                  </div>
                </div>
              );
            })()}

            {/* meal cards */}
            {SLOTS.map(s => {
              const items    = toArr(sel[s.key]);
              const skipOnly = isSkipOnly(items);
              const photo    = photos[s.key] || null;
              return (
                <MealCard
                  key={s.key}
                  slot={s}
                  items={items}
                  totals={sumSlot(items)}
                  isChecked={!!chk[s.key]}
                  skipOnly={skipOnly}
                  photo={photo}
                  hasFood={!skipOnly && items.filter(v => one(v) && !one(v)?.skip).length > 0}
                  isGenerating={generatingSlot === s.key}
                  photoErr={!generatingSlot ? photoErr : null}
                  clipboard={clipboard}
                  onCheck={() => app.toggleCheck(s.key)}
                  onAdd={() => openSheet(s.key)}
                  onEdit={idx => openSheet(s.key, idx)}
                  onRemoveItem={idx => app.removeItem(s.key, idx)}
                  onRemovePhoto={() => app.removeSlotPhoto(s.key)}
                  onGeneratePhoto={() => handleGeneratePhoto(s.key)}
                  onPickPhoto={async (dataUrl) => app.setSlotPhoto(s.key, await compressImage(dataUrl, 600, 0.75))}
                  onClearError={() => setPhotoErr(null)}
                  onCopy={() => copySlot(s.key)}
                  onPaste={() => pasteToSlot(s.key)}
                  onCancelCopy={() => setClipboard(null)}
                  onSaveItem={item => app.saveMeal({ n:item.n, k:item.k, p:item.p, c:item.c, f:item.f }, photo)}
                  focus={app.goals.focus}
                />
              );
            })}

          </div>
        )}

        {/* ── progress tab ── */}
        {tab === 'progress' && (
          <ProgressTab
            weeklyNutrition={app.weeklyNutrition}
            weeklyAvg={app.weeklyAvg}
            wStats={app.wStats}
            weekData={app.weekData}
            streak={app.streak}
            goals={app.goals}
            onAiSummary={onAiSummary}
            onAiPlan={onAiPlan}
          />
        )}

        {/* ── settings tab ── */}
        {tab === 'settings' && (
          <SettingsTab
            wInput={app.wInput} setWInput={app.setWInput}
            day={app.day}
            logWeight={app.logWeight}
            wStats={app.wStats}
            goals={app.goals} updateGoals={app.updateGoals}
            theme={theme} toggleTheme={toggleTheme}
            data={app.data} importData={app.importData}
          />
        )}

        {/* ── saved meals tab ── */}
        {tab === 'saved' && (
          <SavedMealsTab
            savedMeals={app.savedMeals}
            removeSavedMeal={app.removeSavedMeal}
            setSavedMealPhoto={app.setSavedMealPhoto}
            addItem={app.addItem}
            setSlotPhoto={app.setSlotPhoto}
          />
        )}
      </div>

      {/* ── AI chat FAB ── */}
      <AiChat dayContext={{
        dayName: meta.name,
        goals:   app.goals,
        eaten:   eaten,
        slots:   SLOTS.map(s => ({
          label:   s.label,
          items:   toArr(sel[s.key]).map(v => one(v)).filter(Boolean),
          checked: !!chk[s.key],
        })),
      }} />

      {/* ── bottom nav ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:20,
        background:T.surface, borderTop:`1px solid ${T.border}`,
        display:'flex', paddingBottom:'env(safe-area-inset-bottom)' }}>
        <NavBtn active={tab==='plan'}     onClick={() => setTab('plan')}     icon={<Flame size={20}/>}      label="Plan" />
        <NavBtn active={tab==='progress'} onClick={() => setTab('progress')} icon={<TrendingUp size={20}/>} label="Progress" />
        <NavBtn active={tab==='saved'}    onClick={() => setTab('saved')}    icon={<Star size={20}/>}       label="Saved" />
        <NavBtn active={tab==='settings'} onClick={() => setTab('settings')} icon={<Settings size={20}/>}  label="Settings" />
      </div>

      {/* ── add / edit item sheet ── */}
      {open && <AddItemSheet sheet={sheet} />}
    </div>
  );
}
