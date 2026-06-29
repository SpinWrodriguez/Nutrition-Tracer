import { SLOTS, toArr } from './constants.js';

const DEFAULT_GOALS = { kcal: 1800, protein: 150, carbs: 200, fat: 60, focus: 'protein' };

export function freshData() {
  return { selections: {}, checked: {}, weights: [], savedMeals: [], goals: { ...DEFAULT_GOALS } };
}

export function normalizeData(raw) {
  const d = freshData();
  if (!raw) return d;

  Object.keys(raw.selections || {}).forEach(date => {
    d.selections[date] = {};
    SLOTS.forEach(sl => { d.selections[date][sl.key] = toArr(raw.selections[date]?.[sl.key]); });
    d.checked[date] = { ...(raw.checked?.[date] || {}) };
  });

  d.weights    = raw.weights || [];
  // Strip photo field — photos live in IndexedDB now
  d.savedMeals = (raw.savedMeals || []).map(({ photo: _p, ...m }) => m);
  d.goals      = raw.goals ? { ...DEFAULT_GOALS, ...raw.goals } : { ...DEFAULT_GOALS };
  return d;
}

// Extract photos from old backup format (before IndexedDB migration)
export function extractOldPhotos(raw) {
  const slots = {}, meals = {};
  if (raw?.photos) {
    Object.entries(raw.photos).forEach(([date, slotMap]) => {
      Object.entries(slotMap || {}).forEach(([slot, photo]) => {
        if (photo) {
          if (!slots[date]) slots[date] = {};
          slots[date][slot] = photo;
        }
      });
    });
  }
  if (raw?.savedMeals) {
    raw.savedMeals.forEach(m => { if (m.photo && m.id) meals[m.id] = m.photo; });
  }
  return { slots, meals };
}
