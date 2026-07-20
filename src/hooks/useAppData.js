import { useState, useEffect, useMemo } from 'react';
import { STORE, SLOTS, OPT, toArr, one, sumSlot, isSkipOnly, getDayMeta, getWeekStart, getWeekDates, localDateISO } from '../constants.js';
import { freshData, normalizeData, extractOldPhotos } from '../data.js';
import { photoSet, photoDel, photoClear, photoGetAll } from '../db.js';
import { supabase } from '../supabase.js';
import { storageUpload, storageDelete, storageSync, storageUploadAll } from '../storage.js';

export function useAppData(userId = null) {
  const [data, setData] = useState(() => {
    try { const s = localStorage.getItem(STORE); if (s) return normalizeData(JSON.parse(s)); } catch {}
    return freshData();
  });
  const today = localDateISO();
  const [day,    setDay]    = useState(today);
  const [tab,    setTab]    = useState('plan');
  const [wInput, setWInput] = useState('');

  // Photo state — backed by IndexedDB, not localStorage
  const [slotPhotos, setSlotPhotos] = useState({});  // { date: { slotKey: base64 } }
  const [mealPhotos, setMealPhotos] = useState({});   // { mealId: base64 }

  // Persist text data only — photos are in IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        // Trim oldest weight entries as a last resort
        try { localStorage.setItem(STORE, JSON.stringify({ ...data, weights: (data.weights || []).slice(-365) })); } catch {}
      }
    }
  }, [data]);

  // Load data + photos from Supabase when user logs in
  useEffect(() => {
    if (!userId) return;
    (async () => {
      // ── text data ──
      const { data: row, error } = await supabase
        .from('nutrition_data').select('data').eq('id', userId).single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Supabase] load error:', error);
      } else if (row?.data) {
        const wasOldFormat = row.data.selections && Object.keys(row.data.selections || {}).some(
          k => ['mon','tue','wed','thu','fri','sat','sun'].includes(k)
        );
        const normalized = normalizeData(row.data);
        setData(normalized);
        try { localStorage.setItem(STORE, JSON.stringify(normalized)); } catch {}
        if (wasOldFormat) {
          // Immediately persist migrated format so Supabase never re-migrates on next login
          supabase.from('nutrition_data').upsert({ id: userId, data: normalized })
            .then(({ error }) => { if (error) console.error('[Supabase] migration save error:', error); });
        }
      } else {
        // First login — push existing localStorage data to Supabase
        const local = JSON.parse(localStorage.getItem(STORE) || 'null');
        if (local) {
          const { error: e } = await supabase
            .from('nutrition_data').upsert({ id: userId, data: local });
          if (e) console.error('[Supabase] first-login upsert error:', e);
        }
      }

      // ── photos — download any missing from Supabase Storage ──
      const updated = await storageSync(userId);
      if (updated) {
        setSlotPhotos(updated.slots);
        setMealPhotos(updated.meals);
      }
    })();
  }, [userId]);

  // Debounced save to Supabase on every data change
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => {
      supabase.from('nutrition_data')
        .upsert({ id: userId, data })
        .then(({ error }) => { if (error) console.error('[Supabase] save error:', error); });
    }, 2000);
    return () => clearTimeout(t);
  }, [data, userId]);

  // Load photos from IndexedDB; run one-time migration of old localStorage photos
  useEffect(() => {
    photoGetAll().then(({ slots, meals }) => {
      setSlotPhotos(slots);
      setMealPhotos(meals);
    }).catch(() => {});

    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      const old = extractOldPhotos(raw);
      const entries = [
        ...Object.entries(old.slots).flatMap(([date, slotMap]) =>
          Object.entries(slotMap).map(([slot, photo]) => [`slot:${date}:${slot}`, photo])
        ),
        ...Object.entries(old.meals).map(([id, photo]) => [`meal:${id}`, photo]),
      ];
      if (!entries.length) return;

      Promise.all(entries.map(([key, photo]) => photoSet(key, photo))).then(() => {
        setSlotPhotos(old.slots);
        setMealPhotos(old.meals);
        // Strip photos from localStorage now that they're safely in IndexedDB
        const { photos: _p, ...stripped } = raw || {};
        const cleaned = { ...stripped, savedMeals: (stripped.savedMeals || []).map(({ photo: _ph, ...m }) => m) };
        try { localStorage.setItem(STORE, JSON.stringify(cleaned)); } catch {}
      }).catch(() => {});
    } catch {}
  }, []); // run once on mount

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
  const sel = data.selections[day] || {};
  const chk        = data.checked[day]    || {};
  const photos     = slotPhotos[day]      || {};

  // Merge meal photos from IndexedDB back into savedMeals objects
  const savedMeals = useMemo(() =>
    (data.savedMeals || []).map(m => ({ ...m, photo: mealPhotos[m.id] ?? null })),
    [data.savedMeals, mealPhotos]
  );

  // Ingredients are savedMeals entries with kind:'ingredient' — same features, own section
  const ingredientsList = useMemo(() => savedMeals.filter(m => m.kind === 'ingredient'), [savedMeals]);

  const eaten = useMemo(() => SLOTS.reduce((a, s) => {
    if (chk[s.key]) { const t = sumSlot(sel[s.key]); a.k+=t.k; a.p+=t.p; a.c+=t.c; a.f+=t.f; }
    return a;
  }, { k:0, p:0, c:0, f:0 }), [sel, chk]);

  const planned = useMemo(() =>
    SLOTS.reduce((a, s) => { a.k += sumSlot(sel[s.key]).k; return a; }, { k:0 }), [sel]);

  /* ── exercise (deficit display) ── */
  const exercise  = toArr((data.exercise || {})[day]);
  const exerciseK = exercise.reduce((s, e) => s + (+e.k || 0), 0);

  const addExercise = (n, k) =>
    setData(d => ({ ...d, exercise: { ...(d.exercise || {}), [day]: [...toArr((d.exercise || {})[day]), { n, k }] } }));

  const removeExercise = (idx) =>
    setData(d => {
      const arr = [...toArr((d.exercise || {})[day])];
      arr.splice(idx, 1);
      return { ...d, exercise: { ...(d.exercise || {}), [day]: arr } };
    });

  const adh = useMemo(() => {
    let done = 0, total = 0;
    weekDates.forEach(date => {
      const dm = getDayMeta(date);
      const s  = data.selections[date] || {};
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
    const s  = data.selections[date] || {};
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

  const weeklyDeficit = useMemo(() => {
    const maint = goals.maintenance || 2200;
    const days = weeklyNutrition
      .filter(dd => dd.eaten.k > 0)
      .map(dd => {
        const ex = toArr((data.exercise || {})[dd.date]).reduce((s, e) => s + (+e.k || 0), 0);
        return maint + ex - dd.eaten.k;
      });
    if (!days.length) return null;
    const total = Math.round(days.reduce((s, v) => s + v, 0));
    return { total, days: days.length, kg: total / 7700 };
  }, [weeklyNutrition, data.exercise, goals]);

  const streak = useMemo(() => {
    let count = 0;
    const d = new Date(localDateISO() + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const s  = data.selections[dateStr] || {};
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

  /* ── item mutators ── */

  const addItem = (slot, val) =>
    setData(d => {
      const cur = toArr((d.selections[day] || {})[slot]);
      const isNewSkip = typeof val === 'string' && OPT[val]?.skip;
      const next = isNewSkip ? [val] : [...cur.filter(v => !(typeof v === 'string' && OPT[v]?.skip)), val];
      const base = d.selections[day] ? { ...d.selections[day] } : {};
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: next } } };
    });

  const replaceItem = (slot, idx, val) =>
    setData(d => {
      const arr = [...toArr((d.selections[day] || {})[slot])];
      arr[idx] = val;
      const base = d.selections[day] ? { ...d.selections[day] } : {};
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: arr } } };
    });

  const removeItem = (slot, idx) => {
    const currentArr = toArr((data.selections[day] || {})[slot]);
    if (currentArr.length === 1) removeSlotPhoto(slot);
    setData(d => {
      const arr = [...toArr((d.selections[day] || {})[slot])];
      arr.splice(idx, 1);
      const base = d.selections[day] ? { ...d.selections[day] } : {};
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: arr } } };
    });
  };

  const setSlotItems = (slot, items) =>
    setData(d => {
      const base = d.selections[day] ? { ...d.selections[day] } : {};
      return { ...d, selections: { ...d.selections, [day]: { ...base, [slot]: items } } };
    });

  /* ── photo mutators — write to IndexedDB + update local state ── */

  const setSlotPhoto = (slotKey, photo) => {
    const idbKey = `slot:${day}:${slotKey}`;
    photoSet(idbKey, photo).catch(() => {});
    storageUpload(userId, idbKey, photo);
    setSlotPhotos(p => ({ ...p, [day]: { ...(p[day] || {}), [slotKey]: photo } }));
  };

  const removeSlotPhoto = (slotKey) => {
    const idbKey = `slot:${day}:${slotKey}`;
    photoDel(idbKey).catch(() => {});
    storageDelete(userId, idbKey);
    setSlotPhotos(p => {
      const dp = { ...(p[day] || {}) }; delete dp[slotKey];
      return { ...p, [day]: dp };
    });
  };

  const setSavedMealPhoto = (id, photo) => {
    const idbKey = `meal:${id}`;
    photoSet(idbKey, photo).catch(() => {});
    storageUpload(userId, idbKey, photo);
    setMealPhotos(p => ({ ...p, [id]: photo }));
  };

  const syncPhotoToMealLib = (slotKey, photo) => {
    const items = toArr(sel[slotKey]).map(v => one(v)).filter(o => o && !o.skip);
    if (!items.length) return;
    (data.savedMeals || []).forEach(m => {
      if (m.kind !== 'ingredient' && items.some(o => o.n.toLowerCase() === m.n.toLowerCase())) {
        const idbKey = `meal:${m.id}`;
        photoSet(idbKey, photo).catch(() => {});
        storageUpload(userId, idbKey, photo);
        setMealPhotos(p => ({ ...p, [m.id]: photo }));
      }
    });
  };

  /* ── other mutators ── */

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

  const saveMeal = (item, photo = null) => {
    const id = String(Date.now() + Math.random());
    const existing = (data.savedMeals || []).find(m => m.kind !== 'ingredient' && m.n.toLowerCase() === item.n.toLowerCase());
    if (existing) {
      if (!mealPhotos[existing.id] && photo) {
        photoSet(`meal:${existing.id}`, photo).catch(() => {});
        storageUpload(userId, `meal:${existing.id}`, photo);
        setMealPhotos(p => ({ ...p, [existing.id]: photo }));
      }
      return;
    }
    if (photo) {
      photoSet(`meal:${id}`, photo).catch(() => {});
      storageUpload(userId, `meal:${id}`, photo);
      setMealPhotos(p => ({ ...p, [id]: photo }));
    }
    setData(d => ({ ...d, savedMeals: [...(d.savedMeals || []), { id, ...item }] }));
  };

  const removeSavedMeal = (id) => {
    photoDel(`meal:${id}`).catch(() => {});
    storageDelete(userId, `meal:${id}`);
    setMealPhotos(p => { const n = { ...p }; delete n[id]; return n; });
    setData(d => ({ ...d, savedMeals: (d.savedMeals || []).filter(m => m.id !== id) }));
  };

  const setSavedMealPhotoAlias = setSavedMealPhoto; // keep name consistent

  const updateSavedMeal = (id, updates) =>
    setData(d => ({ ...d, savedMeals: (d.savedMeals || []).map(m => m.id === id ? { ...m, ...updates } : m) }));

  const createSavedMeal = (item, photo = null) => {
    const id = String(Date.now() + Math.random());
    if (photo) {
      photoSet(`meal:${id}`, photo).catch(() => {});
      storageUpload(userId, `meal:${id}`, photo);
      setMealPhotos(p => ({ ...p, [id]: photo }));
    }
    setData(d => ({ ...d, savedMeals: [...(d.savedMeals || []), { id, ...item }] }));
  };

  const applyWeekPlan = (planByDayId) =>
    setData(d => {
      const newSelections = { ...d.selections };
      weekDates.forEach(date => {
        const dm      = getDayMeta(date);
        const dayPlan = planByDayId[dm.id];
        if (!dayPlan) return;
        const base = d.selections[date] ? { ...d.selections[date] } : {};
        SLOTS.forEach(sl => {
          const mealName = dayPlan[sl.key];
          if (!mealName) return;
          const saved = (d.savedMeals || []).find(m => m.n === mealName && m.kind !== 'ingredient');
          if (saved) {
            const { id: _id, ...item } = saved;
            base[sl.key] = [{ ...item, custom: true }];
          }
        });
        newSelections[date] = base;
      });
      return { ...d, selections: newSelections };
    });

  const applyDayPlan = (date, slotPlan) =>
    setData(d => {
      const dm   = getDayMeta(date);
      const base = d.selections[date] ? { ...d.selections[date] } : {};
      SLOTS.forEach(sl => {
        const existing = toArr(base[sl.key]).map(v => one(v)).filter(v => v && !v.skip);
        if (existing.length > 0) return;
        const mealName = slotPlan[sl.key];
        if (!mealName) return;
        const saved = (d.savedMeals || []).find(m => m.n === mealName && m.kind !== 'ingredient');
        if (saved) {
          const { id: _id, ...item } = saved;
          base[sl.key] = [{ ...item, custom: true }];
        }
      });
      return { ...d, selections: { ...d.selections, [date]: base } };
    });

  /* ── sign-out cleanup ── */
  const clearLocalData = () => {
    localStorage.removeItem(STORE);
    photoClear().catch(() => {});
    setData(freshData());
    setSlotPhotos({});
    setMealPhotos({});
    setDay(localDateISO());
  };

  /* ── backup / restore ── */

  const getQuickBackup = () => ({ ...data, _version: 2, _photoSource: 'supabase' });

  const getArchiveBackup = async () => {
    const { default: JSZip } = await import('jszip');
    const photoData = await photoGetAll();
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify({ ...data, _version: 2 }, null, 2));
    const folder = zip.folder('photos');
    Object.entries(photoData.slots || {}).forEach(([date, slotMap]) => {
      Object.entries(slotMap || {}).forEach(([slot, url]) => {
        const b64 = url?.split(',')[1];
        if (b64) folder.file(`slot_${date}_${slot}.jpg`, b64, { base64: true });
      });
    });
    Object.entries(photoData.meals || {}).forEach(([id, url]) => {
      const b64 = url?.split(',')[1];
      if (b64) folder.file(`meal_${id}.jpg`, b64, { base64: true });
    });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  };

  const importData = async (raw) => {
    try {
      if (raw._photoSource === 'supabase') {
        // Quick backup — text only, pull photos back from Supabase Storage
        await photoClear();
        const normalized = normalizeData(raw);
        setData(normalized);
        try { localStorage.setItem(STORE, JSON.stringify(normalized)); } catch {}
        if (userId) {
          await supabase.from('nutrition_data').upsert({ id: userId, data: normalized });
          const updated = await storageSync(userId);
          if (updated) { setSlotPhotos(updated.slots); setMealPhotos(updated.meals); }
        }
        return;
      }

      // Full backup with embedded photos (_photos from archive ZIP or old JSON backup)
      await photoClear();
      const toMigrate = raw._photos ? raw._photos : extractOldPhotos(raw);
      const writes = [];
      Object.entries(toMigrate.slots || {}).forEach(([date, slotMap]) =>
        Object.entries(slotMap).forEach(([slot, photo]) => {
          if (photo) writes.push(photoSet(`slot:${date}:${slot}`, photo));
        })
      );
      Object.entries(toMigrate.meals || {}).forEach(([id, photo]) => {
        if (photo) writes.push(photoSet(`meal:${id}`, photo));
      });
      await Promise.all(writes);

      const all = await photoGetAll();
      setSlotPhotos(all.slots);
      setMealPhotos(all.meals);
      setData(normalizeData(raw));
      if (userId) storageUploadAll(userId, all);
    } catch {}
  };

  return {
    data,
    day, setDay, tab, setTab,
    meta, sel, chk, photos, savedMeals,
    eaten, planned, adh,
    exercise, exerciseK, addExercise, removeExercise, weeklyDeficit,
    weights, wStats, weekData,
    wInput, setWInput,
    goals, updateGoals,
    weekStart, weekDates, prevWeek, nextWeek,
    addItem, replaceItem, removeItem, setSlotItems,
    setSlotPhoto, removeSlotPhoto,
    toggleCheck, resetWeek, logWeight,
    saveMeal, removeSavedMeal, setSavedMealPhoto: setSavedMealPhotoAlias,
    updateSavedMeal, createSavedMeal,
    ingredientsList,
    applyWeekPlan, applyDayPlan, syncPhotoToMealLib,
    weeklyNutrition, weeklyAvg, streak,
    getQuickBackup, getArchiveBackup, importData, clearLocalData,
  };
}
