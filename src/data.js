import { DAYS, SLOTS, DEFAULTS, toArr, getDayDate } from './constants.js';

const DEFAULT_GOALS = { kcal: 1800, protein: 150, carbs: 200, fat: 60, focus: 'protein' };

export function freshData() {
  return { selections: {}, checked: {}, weights: [], photos: {}, savedMeals: [], goals: { ...DEFAULT_GOALS } };
}

export function normalizeData(raw) {
  const d = freshData();
  if (!raw) return d;

  // Detect old format: selections keyed by day-id ('mon', 'tue', …)
  const isOldFormat = raw.selections && Object.keys(raw.selections || {}).some(k => k.length <= 3 && ['mon','tue','wed','thu','fri','sat','sun'].includes(k));

  if (isOldFormat) {
    DAYS.forEach(day => {
      const date = getDayDate(day.id);
      d.selections[date] = {};
      SLOTS.forEach(sl => { d.selections[date][sl.key] = toArr(raw.selections?.[day.id]?.[sl.key] ?? DEFAULTS[day.id][sl.key]); });
      d.checked[date] = { ...(raw.checked?.[day.id] || {}) };
      d.photos[date]  = { ...(raw.photos?.[day.id]  || {}) };
    });
  } else {
    Object.keys(raw.selections || {}).forEach(date => {
      d.selections[date] = {};
      SLOTS.forEach(sl => { d.selections[date][sl.key] = toArr(raw.selections[date]?.[sl.key]); });
      d.checked[date] = { ...(raw.checked?.[date] || {}) };
      d.photos[date]  = { ...(raw.photos?.[date]  || {}) };
    });
  }

  d.weights    = raw.weights    || [];
  d.savedMeals = raw.savedMeals || [];
  d.goals      = raw.goals ? { ...DEFAULT_GOALS, ...raw.goals } : { ...DEFAULT_GOALS };
  return d;
}
