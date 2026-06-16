import { useState, useEffect, useMemo } from 'react';
import { STORE, DAYS, SLOTS, DEFAULTS, OPT, toArr, one, sumSlot, isSkipOnly, getDayMeta, getWeekStart, getWeekDates } from '../constants.js';
import { freshData, normalizeData } from '../data.js';

export function useAppData() {
  const [data, setData] = useState(() => {
    try { const s = localStorage.getItem(STORE); if (s) return normalizeData(JSON.parse(s)); } catch {}
    return freshData();
  });
  const today = new Date().toISOString().slice(0, 10);
  const [day,    setDay]    = useState(today);
  const [tab,    setTab]    = useState('plan');
  const [wInput, setWInput] = useState('');

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
  }, [data]);

  /* ── derived week ── */
  const weekStart = useMemo(() => getWeekStart(day), [day]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const prevWeek = () => {
    const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() - 7);
    setDay(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + 7);
    setDay(d.toISOString().slice(0, 10));
  };

  /* ── derived day ── */
  const meta       = getDayMeta(day);
  const goals      = data.goals || { kcal:1800, protein:150, carbs:200, fat:60, focus:'protein' };
  const defaultSel = DEFAULTS[meta.id] || DEFAULTS.mon;
  const sel        = data.selections[day] || defaultSel;
  const chk        = data.checked[day]    || {};
  const photos     = data.photos?.[day]   || {};
  const savedMeals = data.savedMeals      || [];

  const eaten = useMemo(() => SLOTS.reduce((a, s) => {
    if (chk[s.key]) { const t = sumSlot(sel[s.key]); a.k+=t.k; a.p+=t.p; a.c+=t.c; a.f+=t.f; }
    return a;
  }, { k:0, p:0, c:0, f:0 }), [sel, chk]);

  const planned = useMemo(() =>
    SLOTS.reduce((a, s) => { a.k += sumSlot(sel[s.key]).k; return a; }, { k:0 }), [sel]);

  const adh = useMemo(() => {
    let done = 0, total = 0;
    weekDates.forEach(date => {
      const dm = getDayMeta(date);
      const s  = data.selections[date] || DEFAULTS[dm.id] || DEFAULTS.mon;
      const c  = data.checked[date]    || {};
      SLOTS.forEach(sl => { if (!isSkipOnly(s[sl.key])) { total++; if (c[sl.key]) done++; } });
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [data, weekDates]);

  const weights = data.weights || [];
  const wStats  = useMemo(() => {
    if (weights.length < 2) return weights.length === 1 ? { current: weights[0].kg, change: null, perWk: null } : null;
    const first = weights[0], last = weights[weights.length - 1];
    const change = +(last.kg - first.kg).toFixed(1);
    const days   = Math.max(1, (new Date(last.date) - new Date(first.date)) / 86400000);
    return { current: last.kg, change, perWk: +((change / days) * 7).toFixed(2) };
  }, [weights]);

  const weekData = useMemo(() => weekDates.map(date => {
    const entry = weights.find(w => w.date === date);
    const dm    = getDayMeta(date);
    return { day: dm.label, date, kg: entry?.kg ?? null };
  }), [weights, weekDates]);

  const weeklyNutrition = useMemo(() => weekDates.map(date => {
    const dm = getDayMeta(date);
    const s  = data.selections[date] || DEFAULTS[dm.id] || DEFAULTS.mon;
    const c  = data.checked[date] || {};
    const eaten = SLOTS.reduce((a, sl) => {
      if (c[sl.key]) { const t = sumSlot(s[sl.key]); a.k+=t.k; a.p+=t.p; a.c+=t.c; a.f+=t.f; }
      return a;
    }, { k:0, p:0, c:0, f:0 });
    return { date, day: dm.label, eaten };
  }), [data, weekDates]);

  const weeklyAvg = useMemo(() => {
    const active = weeklyNutrition.filter(d => d.eaten.k > 0);
    if (!active.length) return null;
    const n = active.length;
    return {
      k: Math.round(active.reduce((s, d) => s + d.eaten.k, 0) / n),
      p: Math.round(active.reduce((s, d) => s + d.eaten.p, 0) / n),
      c: Math.round(active.reduce((s, d) => s + d.eaten.c, 0) / n),
      f: Math.round(active.reduce((s, d) => s + d.eaten.f, 0) / n),
      days: n,
    };
  }, [weeklyNutrition]);

  const streak = useMemo(() => {
    let count = 0;
    const d = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      const dm = getDayMeta(dateStr);
      const s  = data.selections[dateStr] || DEFAULTS[dm.id] || DEFAULTS.mon;
      const c  = data.checked[dateStr] || {};
      const eaten = SLOTS.reduce((a, sl) => {
        if (c[sl.key]) { const t = sumSlot(s[sl.key]); a.k+=t.k; a.p+=t.p; a.c+=t.c; a.f+=t.f; }
        return a;
      }, { k:0, p:0, c:0, f:0 });
      const met = goals.focus === 'protein'
        ? eaten.p >= goals.protein
        : (eaten.k > 0 && eaten.k <= goals.kcal);
      if (!met) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [data, goals]);

  /* ── mutators (all keyed by `day` ISO date) ── */

  const addItem = (slot, val) =>
    setData(d => {
      const dm  = getDayMeta(day);
      const def = DEFAULTS[dm.id] || DEFAULTS.mon;
      const cur = toArr((d.selections[day] || def)[slot]);
      const isNewSkip = typeof val === 'string' && OPT[val]?.skip;
      const next = isNewSkip ? [val] : [...cur.filter(v => !(typeof v === 'string' && OPT[v]?.skip)), val];
      const base = d.selections[day] ? { ...d.selections[day] } : { ...def };
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: next } } };
    });

  const replaceItem = (slot, idx, val) =>
    setData(d => {
      const dm  = getDayMeta(day);
      const def = DEFAULTS[dm.id] || DEFAULTS.mon;
      const arr = [...toArr((d.selections[day] || def)[slot])];
      arr[idx] = val;
      const base = d.selections[day] ? { ...d.selections[day] } : { ...def };
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: arr } } };
    });

  const removeItem = (slot, idx) =>
    setData(d => {
      const dm  = getDayMeta(day);
      const def = DEFAULTS[dm.id] || DEFAULTS.mon;
      const arr = [...toArr((d.selections[day] || def)[slot])];
      arr.splice(idx, 1);
      const base = d.selections[day] ? { ...d.selections[day] } : { ...def };
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: arr } } };
    });

  const setSlotItems = (slot, items) =>
    setData(d => {
      const dm  = getDayMeta(day);
      const def = DEFAULTS[dm.id] || DEFAULTS.mon;
      const base = d.selections[day] ? { ...d.selections[day] } : { ...def };
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: items } } };
    });

  const setSlotPhoto = (slotKey, photo) =>
    setData(d => ({ ...d, photos: { ...d.photos, [day]: { ...(d.photos?.[day] || {}), [slotKey]: photo } } }));

  const removeSlotPhoto = (slotKey) =>
    setData(d => {
      const dp = { ...(d.photos?.[day] || {}) }; delete dp[slotKey];
      return { ...d, photos: { ...d.photos, [day]: dp } };
    });

  const toggleCheck = slot =>
    setData(d => ({ ...d, checked: { ...d.checked, [day]: { ...(d.checked[day] || {}), [slot]: !(d.checked[day]?.[slot]) } } }));

  const resetWeek = () =>
    setData(d => {
      const nc = { ...d.checked };
      weekDates.forEach(date => { nc[date] = {}; });
      return { ...d, checked: nc };
    });

  const logWeight = () => {
    const v = parseFloat(wInput); if (!v || v <= 0) return;
    setData(d => {
      const others = (d.weights || []).filter(w => w.date !== day);
      return { ...d, weights: [...others, { date: day, kg: v }].sort((a, b) => a.date.localeCompare(b.date)) };
    });
    setWInput('');
  };

  const updateGoals = (updates) =>
    setData(d => ({ ...d, goals: { ...(d.goals || {}), ...updates } }));

  /* When a slot photo is generated, silently sync it to any matching saved meal */
  const syncPhotoToMealLib = (slotKey, photo) =>
    setData(d => {
      const dm   = getDayMeta(day);
      const def  = DEFAULTS[dm.id] || DEFAULTS.mon;
      const items = toArr((d.selections[day] || def)[slotKey])
        .map(v => one(v)).filter(o => o && !o.skip);
      if (!items.length) return d;
      return {
        ...d,
        savedMeals: (d.savedMeals || []).map(m =>
          items.some(o => o.n.toLowerCase() === m.n.toLowerCase()) ? { ...m, photo } : m
        ),
      };
    });

  const saveMeal = (item, photo = null) =>
    setData(d => {
      const id = String(Date.now() + Math.random());
      const existing = (d.savedMeals || []).find(m => m.n.toLowerCase() === item.n.toLowerCase());
      if (existing) {
        if (!existing.photo && photo)
          return { ...d, savedMeals: d.savedMeals.map(m => m.id === existing.id ? { ...m, photo } : m) };
        return d;
      }
      return { ...d, savedMeals: [...(d.savedMeals || []), { id, ...item, photo }] };
    });

  const removeSavedMeal = id =>
    setData(d => ({ ...d, savedMeals: (d.savedMeals || []).filter(m => m.id !== id) }));

  const setSavedMealPhoto = (id, photo) =>
    setData(d => ({ ...d, savedMeals: (d.savedMeals || []).map(m => m.id === id ? { ...m, photo } : m) }));

  // Apply AI-generated week plan: planByDayId is { mon: { breakfast: "name", ... }, ... }
  // Maps meal names to savedMeals entries and writes them into the current week's dates
  const importData = (raw) => {
    try { setData(normalizeData(raw)); } catch {}
  };

  const applyWeekPlan = (planByDayId) =>
    setData(d => {
      const newSelections = { ...d.selections };
      weekDates.forEach(date => {
        const dm      = getDayMeta(date);
        const dayPlan = planByDayId[dm.id];
        if (!dayPlan) return;
        const base = d.selections[date] ? { ...d.selections[date] } : { ...(DEFAULTS[dm.id] || DEFAULTS.mon) };
        SLOTS.forEach(sl => {
          const mealName = dayPlan[sl.key];
          if (!mealName) return;
          const saved = (d.savedMeals || []).find(m => m.n === mealName);
          if (saved) {
            const { id: _id, photo: _photo, ...item } = saved;
            base[sl.key] = [{ ...item, custom: true }];
          }
        });
        newSelections[date] = base;
      });
      return { ...d, selections: newSelections };
    });

  return {
    data,
    day, setDay, tab, setTab,
    meta, sel, chk, photos, savedMeals,
    eaten, planned, adh,
    weights, wStats, weekData,
    wInput, setWInput,
    goals, updateGoals,
    weekStart, weekDates, prevWeek, nextWeek,
    addItem, replaceItem, removeItem, setSlotItems,
    setSlotPhoto, removeSlotPhoto,
    toggleCheck, resetWeek, logWeight,
    saveMeal, removeSavedMeal, setSavedMealPhoto, applyWeekPlan, syncPhotoToMealLib,
    weeklyNutrition, weeklyAvg, streak,
    importData,
  };
}
