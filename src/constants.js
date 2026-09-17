/* ── design tokens (CSS custom properties — themes defined in index.html) ── */
export const T = {
  bg:          'var(--bg)',
  surface:     'var(--surface)',
  border:      'var(--border)',
  ink:         'var(--ink)',
  muted:       'var(--muted)',
  faint:       'var(--faint)',
  accent:      'var(--accent)',
  accentSoft:  'var(--accent-soft)',
  accentLight: 'var(--accent-light)',
  gold:        'var(--gold)',
  goldLight:   'var(--gold-light)',
  ok:          'var(--ok)',
  over:        'var(--over)',
  blue:        'var(--blue)',
};

export const NF = { fontFamily: "'Oswald','Arial Narrow',system-ui,sans-serif", fontVariantNumeric: 'tabular-nums' };
export const sf = { fontFamily: 'ui-sans-serif,system-ui,sans-serif' };

/* ── persistence key ── */
export const STORE = 'nt-v2';

/* ── catalog ── */
export const OPT = {
  b_eggs:      { n: 'Eggs, toast & yogurt',           k: 420, p: 38, c: 29, f: 17 },
  b_arepa:     { n: 'Arepa breakfast (2) + halloumi', k: 515, p: 26, c: 53, f: 22 },
  b_big:       { n: 'Big eggs-on-toast + ½ avocado',  k: 600, p: 35, c: 36, f: 34 },
  b_lean:      { n: 'Greek yogurt + whey + berries',  k: 290, p: 42, c: 20, f: 3  },
  b_roll:      { n: 'Egg & bacon roll',               k: 450, p: 25, c: 35, f: 22 },
  l_lean:      { n: 'Lean: chicken + big salad',      k: 310, p: 47, c: 10, f: 8  },
  l_quinoa:    { n: 'Chicken + quinoa + salad',       k: 520, p: 52, c: 35, f: 18 },
  l_arepa:     { n: 'Arepa lunch (2) + chicken',      k: 460, p: 44, c: 50, f: 9  },
  l_poke:      { n: 'Poke bowl',                      k: 550, p: 35, c: 60, f: 15 },
  l_skip:      { n: 'Skip — big breakfast covers it', k: 0,   p: 0,  c: 0,  f: 0, skip: true },
  d_fish:      { n: 'White fish/chicken + potato + veg', k: 450, p: 48, c: 30, f: 14 },
  d_salmon:    { n: 'Salmon + rice + veg',            k: 485, p: 40, c: 45, f: 18 },
  d_schnitzel: { n: 'Schnitzel (200g) + salad + veg', k: 520, p: 48, c: 26, f: 20 },
  d_grill:     { n: 'Grilled chicken/fish + sweet potato', k: 530, p: 60, c: 43, f: 11 },
  d_stirfry:   { n: 'Chicken/prawn stir-fry + rice',  k: 400, p: 42, c: 30, f: 12 },
  d_burger:    { n: 'Smash burger + bun + cheese',    k: 480, p: 38, c: 32, f: 17 },
  d_leangolf:  { n: 'Lean protein + big salad',       k: 350, p: 45, c: 10, f: 12 },
  s_chobani:   { n: 'Chobani Protein',                k: 140, p: 20, c: 9,  f: 2  },
  s_fruit:     { n: 'Grapes or kiwi',                 k: 100, p: 1,  c: 25, f: 0  },
  s_skip:      { n: 'Skip',                           k: 0,   p: 0,  c: 0,  f: 0, skip: true },
};

export const SLOTS = [
  { key: 'breakfast',      label: 'Breakfast',       time: 'Morning',   opts: ['b_eggs','b_arepa','b_big','b_lean','b_roll'] },
  { key: 'morningSnack',   label: 'Morning snack',   time: '~10 am',    opts: ['s_chobani','s_fruit','s_skip'], optional: true },
  { key: 'lunch',          label: 'Lunch',           time: 'Midday',    opts: ['l_lean','l_quinoa','l_arepa','l_poke','l_skip'] },
  { key: 'afternoonSnack', label: 'Afternoon snack', time: '~3 pm',     opts: ['s_chobani','s_fruit','s_skip'], optional: true },
  { key: 'dinner',         label: 'Dinner',          time: '~5:30 pm',  opts: ['d_fish','d_salmon','d_schnitzel','d_grill','d_stirfry','d_burger','d_leangolf'] },
  { key: 'snack',          label: 'Evening snack',   time: '~8 pm',     opts: ['s_chobani','s_fruit','s_skip'], optional: true },
];

export const DAYS = [
  { id:'mon', label:'Mon', name:'Monday',    tag:'Arepa day',                star:false, gk:1800, gp:150 },
  { id:'tue', label:'Tue', name:'Tuesday',   tag:'Salmon night',             star:true,  gk:1800, gp:155 },
  { id:'wed', label:'Wed', name:'Wednesday', tag:'Schnitzel · 2 meals',      star:true,  gk:1450, gp:135 },
  { id:'thu', label:'Thu', name:'Thursday',  tag:'Big breakfast · 2 meals',  star:false, gk:1450, gp:140 },
  { id:'fri', label:'Fri', name:'Friday',    tag:'Arepa lunch',              star:false, gk:1800, gp:150 },
  { id:'sat', label:'Sat', name:'Saturday',  tag:'Burger night',             star:true,  gk:1800, gp:150 },
  { id:'sun', label:'Sun', name:'Sunday',    tag:'Golf day — fuel it',       star:false, gk:2100, gp:140 },
];

/* ── helpers ── */
// Use local calendar date (not UTC) so Australian users don't get "yesterday"
export const dateToLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const localDateISO = () => dateToLocalISO(new Date());
// ISO date `n` days before/after an ISO date (local calendar, noon-anchored so DST can't shift the day)
export const shiftISO = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return dateToLocalISO(d); };
export const isWeekendISO = iso => { const dow = new Date(iso + 'T12:00:00').getDay(); return dow === 0 || dow === 6; };

/* ── item metadata that must survive any rebuild of an item from its fields ──
   analysis/aiChat: AI conversation; conf: 'weighed'|'labelled'|'estimated'; basis: 'cooked'|'raw'|'labelled'|'mixed' */
export const ITEM_META_KEYS = ['analysis', 'aiChat', 'conf', 'basis'];
export const pickItemMeta = o => ITEM_META_KEYS.reduce((a, k) => (o?.[k] != null ? { ...a, [k]: o[k] } : a), {});

/* ── ingredient basis ("per") parsing ──
   Valid: "<number> <unit…>" e.g. "60 g", "1 slice (22 g)", "400 ml bottle", "1 sachet".
   countLike: unit is a countable thing (slice, piece, bar…) rather than a mass/volume, so
   a basis of "2 slices" can be normalised to "1 slice" by dividing the macros. */
const MASS_UNITS = /^(g|gr|gram|grams|kg|ml|l|litre|liter|oz|cup|cups|tbsp|tsp)\b/i;
export function parseBasis(per) {
  const s = String(per || '').trim();
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z][\w\s()./-]*)$/);
  if (!m) return { ok: false, n: null, unit: '', countLike: false, raw: s };
  const n = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].trim();
  return { ok: n > 0 && unit.length > 0, n, unit, countLike: !MASS_UNITS.test(unit), raw: s };
}
export const singularUnit = u => u.replace(/^([a-zA-Z]+?)s\b/, '$1'); // slices → slice, bars → bar

/* ── exercise presets (Coach tab) — net kcal above resting for an ~82 kg adult ── */
export const EXERCISE_PRESETS = [
  { n: 'Golf 18 holes (walking)', k: 1000 },
  { n: 'Golf 9 holes (walking)',  k: 500  },
  { n: 'Driving range',           k: 150  },
  { n: 'Gym session',             k: 200  },
  { n: 'Gardening (1 hr)',        k: 250  },
  { n: 'Walk 30 min',             k: 150  },
];
export const toArr    = v => Array.isArray(v) ? v : (v ? [v] : []);
export const one      = v => typeof v === 'string' ? (OPT[v] ? { ...OPT[v] } : null) : v;
export const sumSlot  = items => toArr(items).reduce((a, v) => {
  const o = one(v); if (o && !o.skip) { a.k+=o.k; a.p+=o.p; a.c+=o.c; a.f+=o.f; } return a;
}, { k:0, p:0, c:0, f:0 });
// Returns ISO date string for the Monday of the week containing `date`
export function getWeekStart(date) {
  const d = new Date(typeof date === 'string' ? date + 'T12:00:00' : date);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

// Returns 7 ISO date strings Mon–Sun for the week starting at weekStartStr
export function getWeekDates(weekStartStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

// Returns the DAYS entry (id, label, name, tag, star, gk, gp) for an ISO date
export function getDayMeta(dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun..6=Sat
  return DAYS[dow === 0 ? 6 : dow - 1]; // DAYS is Mon=0..Sun=6
}

export const isSkipOnly = items => {
  const arr = toArr(items);
  return arr.length === 0 || arr.every(v => one(v)?.skip);
};

export const inp = {
  padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`,
  fontSize: 16, color: T.ink, outline: 'none', background: T.surface, width: '100%',
  fontFamily: 'ui-sans-serif,system-ui,sans-serif',
};

/* ── AFCD search ── */
import { AFCD } from './afcd.js';

export function searchAFCD(q) {
  if (!q || q.trim().length < 2) return [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (const [name, kcal, p, c, f] of AFCD) {
    const lo = name.toLowerCase();
    const score = terms.reduce((s, t) => s + (lo.includes(t) ? 1 : 0), 0);
    if (score > 0) out.push({ name, kcal, p, c, f, score });
  }
  return out.sort((a, b) => b.score - a.score || a.name.length - b.name.length).slice(0, 7);
}
