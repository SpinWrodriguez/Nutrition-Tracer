import { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Plus, Flame, Dumbbell, Scale, RotateCcw, Trophy, Sparkles, Database, X, Star, Camera, Pencil, Wand2, Droplets } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { AFCD } from './afcd.js';

/* ── tokens ── */
const T = {
  bg: '#F6F6F2',
  surface: '#FFFFFF',
  border: '#ECEAE4',
  ink: '#1A231C',
  muted: '#7A8A7A',
  faint: '#B0BAB0',
  accent: '#1C4230',
  accentSoft: '#2E6244',
  accentLight: '#EBF3ED',
  gold: '#B8862A',
  goldLight: '#FAF4E4',
  ok: '#2A7A50',
  over: '#C0392B',
  blue: '#1A4A7A',
};
const NF = { fontFamily: "'Oswald','Arial Narrow',system-ui,sans-serif", fontVariantNumeric: 'tabular-nums' };
const sf = { fontFamily: 'ui-sans-serif,system-ui,sans-serif' };

/* ── AFCD search ── */
function searchAFCD(q) {
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

/* ── catalog ── */
const OPT = {
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

const SLOTS = [
  { key: 'breakfast', label: 'Breakfast', time: 'Morning',   opts: ['b_eggs','b_arepa','b_big','b_lean','b_roll'] },
  { key: 'lunch',     label: 'Lunch',     time: 'Midday',    opts: ['l_lean','l_quinoa','l_arepa','l_poke','l_skip'] },
  { key: 'dinner',    label: 'Dinner',    time: '~5:30 pm',  opts: ['d_fish','d_salmon','d_schnitzel','d_grill','d_stirfry','d_burger','d_leangolf'] },
  { key: 'snack',     label: 'Evening snack', time: '~8 pm', opts: ['s_chobani','s_fruit','s_skip'] },
];

const DAYS = [
  { id:'mon', label:'Mon', name:'Monday',    tag:'Arepa day',                star:false, gk:1800, gp:150 },
  { id:'tue', label:'Tue', name:'Tuesday',   tag:'Salmon night',             star:true,  gk:1800, gp:155 },
  { id:'wed', label:'Wed', name:'Wednesday', tag:'Schnitzel · 2 meals',      star:true,  gk:1450, gp:135 },
  { id:'thu', label:'Thu', name:'Thursday',  tag:'Big breakfast · 2 meals',  star:false, gk:1450, gp:140 },
  { id:'fri', label:'Fri', name:'Friday',    tag:'Arepa lunch',              star:false, gk:1800, gp:150 },
  { id:'sat', label:'Sat', name:'Saturday',  tag:'Burger night',             star:true,  gk:1800, gp:150 },
  { id:'sun', label:'Sun', name:'Sunday',    tag:'Golf day — fuel it',       star:false, gk:2100, gp:140 },
];

const DEFAULTS = {
  mon: { breakfast:['b_arepa'], lunch:['l_lean'],   dinner:['d_fish'],      snack:['s_chobani'] },
  tue: { breakfast:['b_eggs'],  lunch:['l_quinoa'], dinner:['d_salmon'],    snack:['s_chobani'] },
  wed: { breakfast:['b_big'],   lunch:['l_skip'],   dinner:['d_schnitzel'], snack:['s_chobani'] },
  thu: { breakfast:['b_big'],   lunch:['l_skip'],   dinner:['d_grill'],     snack:['s_chobani'] },
  fri: { breakfast:['b_eggs'],  lunch:['l_arepa'],  dinner:['d_stirfry'],   snack:['s_chobani'] },
  sat: { breakfast:['b_eggs'],  lunch:['l_lean'],   dinner:['d_burger'],    snack:['s_chobani'] },
  sun: { breakfast:['b_roll'],  lunch:['l_poke'],   dinner:['d_leangolf'],  snack:['s_chobani'] },
};

/* ── helpers ── */
const STORE = 'nt-v2';
const USDA_KEY = import.meta.env.VITE_USDA_KEY;
const todayId = () => ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
const toArr  = v => Array.isArray(v) ? v : (v ? [v] : []);
const one    = v => typeof v === 'string' ? (OPT[v] ? { ...OPT[v] } : null) : v;
const sumSlot = items => toArr(items).reduce((a,v) => {
  const o = one(v); if (o && !o.skip) { a.k+=o.k; a.p+=o.p; a.c+=o.c; a.f+=o.f; } return a;
}, { k:0, p:0, c:0, f:0 });
const isSkipOnly = items => {
  const arr = toArr(items);
  return arr.length === 0 || arr.every(v => one(v)?.skip);
};

/* ── image compression (for camera photos before storing) ── */
async function compressImage(dataUrl, maxWidth = 600, quality = 0.65) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ── generate food photo with DALL-E 3 ── */
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;

async function generateFoodPhoto(foodDesc) {
  const prompt = `Professional food photography of ${foodDesc}, plated on a white dish, restaurant quality, studio lighting, appetizing, shallow depth of field. Photo only, no text.`;
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'dall-e-2', prompt, n: 1, size: '512x512' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('No image URL returned');

  // Fetch the image and convert to compressed base64 so it persists in localStorage
  try {
    const imgRes = await fetch(url);
    const blob = await imgRes.blob();
    const raw = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return await compressImage(raw, 480, 0.72);
  } catch {
    // CORS blocked — store the temporary URL directly (expires ~1hr)
    return url;
  }
}

function freshData() {
  return {
    selections: JSON.parse(JSON.stringify(DEFAULTS)),
    checked: DAYS.reduce((a,d) => (a[d.id]={}, a), {}),
    weights: [],
    photos: DAYS.reduce((a,d) => (a[d.id]={}, a), {}),
  };
}

function normalizeData(raw) {
  const d = freshData();
  if (!raw) return d;
  DAYS.forEach(day => {
    SLOTS.forEach(sl => {
      const v = raw.selections?.[day.id]?.[sl.key] ?? DEFAULTS[day.id][sl.key];
      d.selections[day.id][sl.key] = toArr(v);
    });
  });
  d.checked = { ...d.checked, ...(raw.checked || {}) };
  d.weights = raw.weights || [];
  d.photos = {};
  DAYS.forEach(day => {
    d.photos[day.id] = raw.photos?.[day.id] || {};
  });
  return d;
}

/* ── USDA search ── */
const LIQUID_UNITS = ['ml', 'mls', 'milliliter', 'millilitre', 'milliliters', 'millilitres'];

async function searchUSDA(q) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('USDA error');
  const data = await res.json();
  return (data.foods || []).map(food => {
    const get = num => food.foodNutrients?.find(n => n.nutrientNumber === num)?.value ?? 0;
    const branded = food.dataType === 'Branded';
    const sSize = food.servingSize;
    const sUnit = (food.servingSizeUnit || '').toLowerCase();
    const isLiquid = LIQUID_UNITS.some(u => sUnit.includes(u));
    const isGrams = ['g', 'grm', 'gram', 'grams'].includes(sUnit) || (!isLiquid && branded && sSize);
    const mul = branded && sSize && (isGrams || isLiquid) ? 100 / sSize : 1;
    return {
      fdcId: food.fdcId,
      name: food.description,
      kcal: Math.round(get('208') * mul),
      p: get('203') * mul,
      c: get('205') * mul,
      f: get('204') * mul,
      servingSize: branded && sSize ? Math.round(sSize) : null,
      servingLabel: food.householdServingFullText || null,
      isLiquid,
    };
  }).filter(f => f.kcal > 0);
}

async function fetchUSDAfoodDetail(fdcId) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('USDA detail error');
  const food = await res.json();
  const get = num => food.foodNutrients?.find(n => n.nutrient?.number === num)?.amount ?? 0;
  const portion = food.foodPortions?.[0];
  const sUnit = (food.servingSizeUnit || '').toLowerCase();
  const isLiquid = LIQUID_UNITS.some(u => sUnit.includes(u));
  const servingSize = food.servingSize
    ? Math.round(food.servingSize)
    : portion?.gramWeight ? Math.round(portion.gramWeight) : null;
  const servingLabel = food.householdServingFullText || portion?.modifier || null;
  return {
    name: food.description,
    kcal: Math.round(get('208')),
    p: get('203'),
    c: get('205'),
    f: get('204'),
    servingSize,
    servingLabel,
    isLiquid,
  };
}

/* ── Gemini AI estimate ── */
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const GEMINI_HEADERS = { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY };

const TEXT_NUTRITION_PROMPT = 'You are a precise nutrition expert. Look up or recall accurate nutrition data from USDA, NUTTAB, or standard databases for the described food. Return macros for the realistic serving size described (not per 100g unless specified). Respond ONLY with a JSON object, no markdown: {"name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>}';

const IMAGE_NUTRITION_PROMPT = 'You are a precise nutrition expert. Examine this food image carefully: (1) Identify the SPECIFIC food or dish — be specific like "Big Mac" not just "burger". (2) Estimate the portion size using visual cues like plate size, utensils, or packaging. (3) Recall accurate USDA/database nutrition values for that exact food and portion. Return macros for the ENTIRE visible portion shown. Respond ONLY with a JSON object, no markdown: {"name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>}';

function parseGeminiResponse(data, fallbackName) {
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const m = raw.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  const obj = JSON.parse(m ? m[0] : raw);
  return { custom:true, n:String(obj.name||fallbackName).slice(0,28),
    k:Math.max(0,Math.round(+obj.k||0)), p:Math.max(0,Math.round(+obj.p||0)),
    c:Math.max(0,Math.round(+obj.c||0)), f:Math.max(0,Math.round(+obj.f||0)) };
}

async function aiEstimate(text) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: GEMINI_HEADERS,
    body: JSON.stringify({ contents: [{ parts: [{ text: TEXT_NUTRITION_PROMPT + '\nFood: ' + text }] }] }),
  });
  return parseGeminiResponse(await res.json(), text);
}

async function aiEstimateFromImage(base64, mimeType) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: GEMINI_HEADERS,
    body: JSON.stringify({ contents: [{ parts: [
      { text: IMAGE_NUTRITION_PROMPT },
      { inline_data: { mime_type: mimeType, data: base64 } },
    ]}] }),
  });
  return parseGeminiResponse(await res.json(), 'Photo meal');
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function App() {
  const [data, setData] = useState(() => {
    try {
      const s = localStorage.getItem(STORE);
      if (s) return normalizeData(JSON.parse(s));
    } catch {}
    return freshData();
  });
  const [day,   setDay]  = useState(todayId);
  const [tab,   setTab]  = useState('plan');
  const [open,  setOpen] = useState(null);
  const [wInput, setWInput] = useState('');

  // picker state
  const [query,    setQuery]    = useState('');
  const [hits,     setHits]     = useState([]);
  const [pick,     setPick]     = useState(null);
  const [grams,    setGrams]    = useState('150');
  const [draft,    setDraft]    = useState(null);
  const [busy,     setBusy]     = useState(false);
  const [aiErr,    setAiErr]    = useState(null);
  const [usdaHits, setUsdaHits] = useState([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [isLiquid,       setIsLiquid]       = useState(false);
  const [editIdx,        setEditIdx]        = useState(null);
  const [generatingSlot, setGeneratingSlot] = useState(null);
  const [photoErr,       setPhotoErr]       = useState(null);
  const usdaTimer = useRef(null);
  const camRef    = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
  }, [data]);

  const meta    = DAYS.find(d => d.id === day);
  const sel     = data.selections[day] || DEFAULTS[day];
  const chk     = data.checked[day] || {};
  const photos  = data.photos?.[day] || {};
  const slotMeta = SLOTS.find(s => s.key === open);

  const eaten = useMemo(() => SLOTS.reduce((a,s) => {
    if (chk[s.key]) { const t=sumSlot(sel[s.key]); a.k+=t.k; a.p+=t.p; a.c+=t.c; a.f+=t.f; }
    return a;
  }, { k:0,p:0,c:0,f:0 }), [sel,chk]);

  const planned = useMemo(() => SLOTS.reduce((a,s) => {
    const t=sumSlot(sel[s.key]); a.k+=t.k; return a;
  }, { k:0 }), [sel]);

  const adh = useMemo(() => {
    let done=0, total=0;
    DAYS.forEach(d => {
      const s=data.selections[d.id]||DEFAULTS[d.id], c=data.checked[d.id]||{};
      SLOTS.forEach(sl => {
        if (!isSkipOnly(s[sl.key])) { total++; if (c[sl.key]) done++; }
      });
    });
    return { done, total, pct: total ? Math.round((done/total)*100) : 0 };
  }, [data]);

  const weights = data.weights || [];
  const wStats = useMemo(() => {
    if (weights.length < 1) return null;
    const first=weights[0], last=weights[weights.length-1];
    const change=+(last.kg-first.kg).toFixed(1);
    const days=Math.max(1,(new Date(last.date)-new Date(first.date))/86400000);
    return { current:last.kg, change, perWk: weights.length>1 ? +((change/days)*7).toFixed(2) : null };
  }, [weights]);

  /* ── mutators ── */
  const addItem = (slot, val) => {
    setData(d => {
      const cur = toArr(d.selections[day]?.[slot]);
      const isNewSkip = typeof val==='string' && OPT[val]?.skip;
      const next = isNewSkip ? [val] : [...cur.filter(v=>!(typeof v==='string'&&OPT[v]?.skip)), val];
      return { ...d, selections:{ ...d.selections, [day]:{ ...d.selections[day], [slot]:next } } };
    });
  };
  const replaceItem = (slot, idx, val) => {
    setData(d => {
      const arr = [...toArr(d.selections[day]?.[slot])];
      arr[idx] = val;
      return { ...d, selections:{ ...d.selections, [day]:{ ...d.selections[day], [slot]:arr } } };
    });
  };
  const removeItem = (slot, idx) => {
    setData(d => {
      const arr = [...toArr(d.selections[day]?.[slot])];
      arr.splice(idx, 1);
      return { ...d, selections:{ ...d.selections, [day]:{ ...d.selections[day], [slot]:arr } } };
    });
  };
  const setSlotPhoto = (slotKey, photo) => {
    setData(d => ({
      ...d,
      photos: { ...d.photos, [day]: { ...(d.photos?.[day] || {}), [slotKey]: photo } },
    }));
  };
  const removeSlotPhoto = (slotKey) => {
    setData(d => {
      const dayPhotos = { ...(d.photos?.[day] || {}) };
      delete dayPhotos[slotKey];
      return { ...d, photos: { ...d.photos, [day]: dayPhotos } };
    });
  };
  const toggleCheck = slot =>
    setData(d => ({ ...d, checked:{ ...d.checked, [day]:{ ...d.checked[day], [slot]:!d.checked[day]?.[slot] } } }));
  const resetWeek = () =>
    setData(d => ({ ...d, checked:DAYS.reduce((a,x)=>(a[x.id]={},a),{}) }));
  const logWeight = () => {
    const v = parseFloat(wInput); if (!v||v<=0) return;
    const dt = new Date().toISOString().slice(0,10);
    setData(d => {
      const others=(d.weights||[]).filter(w=>w.date!==dt);
      return { ...d, weights:[...others,{date:dt,kg:v}].sort((a,b)=>a.date.localeCompare(b.date)) };
    });
    setWInput('');
  };

  /* ── sheet ── */
  const resetSheetState = () => {
    setQuery(''); setHits([]); setUsdaHits([]); setUsdaLoading(false);
    setFetchingDetail(false); setImgPreview(null); setPick(null);
    setGrams('150'); setDraft(null); setAiErr(null); setBusy(false);
    setIsLiquid(false); setEditIdx(null);
    if (usdaTimer.current) clearTimeout(usdaTimer.current);
  };

  const openSheet = (slot, editItemIdx = null) => {
    resetSheetState();
    setOpen(slot);
    if (editItemIdx !== null) {
      setEditIdx(editItemIdx);
      const items = toArr(data.selections[day]?.[slot]);
      const v = items[editItemIdx];
      const o = one(v);
      if (o && !o.skip) {
        setDraft({ custom:true, n:o.n, k:o.k, p:o.p, c:o.c, f:o.f });
      }
    }
  };
  const closeSheet = () => { setOpen(null); resetSheetState(); };

  const onQuery = val => {
    setQuery(val); setDraft(null); setAiErr(null); setPick(null);
    setHits(val.trim().length >= 2 ? searchAFCD(val) : []);
    setUsdaHits([]);
    if (usdaTimer.current) clearTimeout(usdaTimer.current);
    if (val.trim().length >= 2) {
      setUsdaLoading(true);
      usdaTimer.current = setTimeout(async () => {
        try { setUsdaHits(await searchUSDA(val)); } catch {}
        setUsdaLoading(false);
      }, 500);
    } else {
      setUsdaLoading(false);
    }
  };

  const unit = isLiquid ? 'ml' : 'g';

  const scaledDraft = pick ? (() => {
    const g = Math.max(1, parseFloat(grams)||150), sc = g/100;
    return { custom:true, n:pick.name.slice(0,28),
      k:Math.round(pick.kcal*sc), p:Math.round(pick.p*sc), c:Math.round(pick.c*sc), f:Math.round(pick.f*sc) };
  })() : null;

  const runAI = async () => {
    if (!query.trim()) return;
    setBusy(true); setAiErr(null);
    try { setDraft(await aiEstimate(query)); }
    catch { setAiErr("Couldn't estimate — edit numbers manually."); setDraft({ custom:true, n:query.slice(0,28)||'Custom', k:0,p:0,c:0,f:0 }); }
    setBusy(false);
  };

  const confirmItem = (slot, val, photo = null) => {
    if (editIdx !== null) {
      replaceItem(slot, editIdx, val);
    } else {
      addItem(slot, val);
    }
    if (photo) setSlotPhoto(slot, photo);
    resetSheetState();
    setOpen(null);
  };

  const handleGeneratePhoto = async (slotKey) => {
    const items = toArr(sel[slotKey]);
    const names = items.filter(v => one(v) && !one(v)?.skip).map(v => one(v).n).join(', ');
    if (!names || generatingSlot) return;
    setGeneratingSlot(slotKey);
    setPhotoErr(null);
    try {
      const dataUrl = await generateFoodPhoto(names);
      setSlotPhoto(slotKey, dataUrl);
    } catch (err) {
      setPhotoErr(err.message);
      console.error('Photo generation failed:', err);
    }
    setGeneratingSlot(null);
  };

  /* ── shared styles ── */
  const inp = { padding:'12px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, fontSize:16, color:T.ink, outline:'none', background:'#fff', width:'100%', ...sf };

  /* ════ RENDER ════ */
  return (
    <div style={{ background:T.bg, minHeight:'100%', color:T.ink, ...sf }}>
      <div style={{ maxWidth:430, margin:'0 auto', paddingBottom:80 }}>

        {/* ── HEADER ── */}
        <div style={{ background:T.accent, padding:'52px 20px 18px', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
            <div>
              <div style={{ ...NF, fontSize:11, letterSpacing:2, color:'rgba(255,255,255,0.55)', fontWeight:600, marginBottom:2 }}>NUTRITION TRACER</div>
              <div style={{ ...NF, fontSize:24, fontWeight:700, color:'#fff', lineHeight:1 }}>{meta.name}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:3 }}>{meta.tag}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ ...NF, fontSize:11, color:'rgba(255,255,255,0.55)', letterSpacing:1 }}>THIS WEEK</div>
              <div style={{ ...NF, fontSize:28, fontWeight:700, color:'#fff' }}>{adh.pct}%</div>
            </div>
          </div>
        </div>

        {/* ── DAY STRIP ── */}
        <div style={{ background:T.accent, paddingBottom:12 }}>
          <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'0 16px', scrollbarWidth:'none' }}>
            {DAYS.map(d => {
              const active = d.id === day;
              const isToday = d.id === todayId();
              return (
                <button key={d.id} onClick={() => { setDay(d.id); closeSheet(); }}
                  style={{ flexShrink:0, minWidth:50, padding:'8px 6px', borderRadius:12, border:'none',
                    cursor:'pointer', background:active ? '#fff' : 'rgba(255,255,255,0.12)',
                    color:active ? T.accent : 'rgba(255,255,255,0.75)', position:'relative', transition:'background 0.15s' }}>
                  {d.star && <div style={{ position:'absolute', top:4, right:5, width:5, height:5, borderRadius:'50%', background:T.gold }} />}
                  <div style={{ ...NF, fontSize:14, fontWeight:700 }}>{d.label}</div>
                  {isToday && <div style={{ fontSize:8, letterSpacing:0.5, marginTop:1, fontWeight:600, opacity:0.8 }}>TODAY</div>}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'plan' ? (
          <div style={{ padding:'16px 16px 8px' }}>

            {/* ── MACRO SUMMARY ── */}
            <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px 14px', marginBottom:14, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
              <MacroGauge
                icon={<Flame size={14} color={eaten.k > meta.gk ? T.over : T.ok} />}
                label="Calories eaten"
                value={eaten.k} goal={meta.gk} unit="kcal"
                color={eaten.k > meta.gk ? T.over : T.ok}
              />
              <div style={{ height:14 }} />
              <MacroGauge
                icon={<Dumbbell size={14} color={T.gold} />}
                label="Protein eaten"
                value={eaten.p} goal={meta.gp} unit="g"
                color={T.gold}
              />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:12, paddingTop:10, borderTop:`1px dashed ${T.border}`, fontSize:12, color:T.muted }}>
                <span>Carbs <b style={{ color:T.ink }}>{eaten.c}g</b> · Fat <b style={{ color:T.ink }}>{eaten.f}g</b></span>
                <span style={{ color:T.faint }}>Plan total: {planned.k} kcal</span>
              </div>
            </div>

            {/* ── MEAL CARDS ── */}
            {SLOTS.map(s => {
              const items   = toArr(sel[s.key]);
              const totals  = sumSlot(items);
              const isChk   = !!chk[s.key];
              const skipOnly = isSkipOnly(items);
              const photo   = photos[s.key] || null;
              const hasFood = !skipOnly && items.filter(v => one(v) && !one(v)?.skip).length > 0;

              return (
                <div key={s.key} style={{ background:T.surface, borderRadius:18, marginBottom:10,
                  boxShadow:'0 1px 6px rgba(0,0,0,0.05)',
                  borderLeft:`4px solid ${isChk ? T.ok : T.border}` }}>

                  {/* meal photo banner — only when photo exists or generating */}
                  {photo ? (
                    <PhotoBanner photo={photo} onRemove={() => removeSlotPhoto(s.key)} />
                  ) : generatingSlot === s.key ? (
                    <div style={{ height:70, background:T.goldLight, borderTopLeftRadius:14, borderTopRightRadius:14,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <Wand2 size={15} color={T.gold} />
                      <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>Generating photo…</span>
                    </div>
                  ) : null}

                  <div style={{ padding:'14px 14px 12px' }}>
                    {/* slot header */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:T.muted, textTransform:'uppercase' }}>{s.label}</span>
                          <span style={{ fontSize:11, color:T.faint }}>· {s.time}</span>
                        </div>

                        {items.length === 0 ? (
                          <p style={{ fontSize:14, color:T.faint, fontStyle:'italic', margin:0 }}>Nothing added yet</p>
                        ) : skipOnly ? (
                          <p style={{ fontSize:14, color:T.muted, fontStyle:'italic', margin:0 }}>{one(items[0])?.n || 'Skip'}</p>
                        ) : (
                          <div>
                            {items.map((v, idx) => {
                              const o = one(v);
                              if (!o || o.skip) return null;
                              return (
                                <div key={idx} style={{ marginBottom:5 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                    <button onClick={() => removeItem(s.key, idx)}
                                      style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', flexShrink:0 }}>
                                      <X size={12} color={T.faint} />
                                    </button>
                                    <button onClick={() => openSheet(s.key, idx)}
                                      style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', flexShrink:0 }}>
                                      <Pencil size={11} color={T.faint} />
                                    </button>
                                    <span style={{ fontSize:14, fontWeight:600, color:T.ink }}>{o.n}</span>
                                    {o.custom && <span style={{ fontSize:10, color:T.accentSoft, fontWeight:600 }}>CUSTOM</span>}
                                  </div>
                                  <div style={{ ...NF, fontSize:12, color:T.muted, paddingLeft:36 }}>
                                    {o.k} kcal · {o.p}P · {o.c}C · {o.f}F
                                  </div>
                                </div>
                              );
                            })}
                            {items.filter(v=>one(v)&&!one(v).skip).length > 1 && (
                              <div style={{ ...NF, fontSize:12, fontWeight:700, color:T.accentSoft,
                                marginTop:6, paddingTop:6, borderTop:`1px dashed ${T.border}`, paddingLeft:36 }}>
                                Total: {totals.k} kcal · {totals.p}P · {totals.c}C · {totals.f}F
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* right-side buttons */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
                        {/* check button */}
                        <button onClick={() => toggleCheck(s.key)}
                          style={{ width:44, height:44, borderRadius:13,
                            border:`2px solid ${isChk ? T.ok : T.border}`,
                            background:isChk ? T.ok : 'transparent',
                            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {isChk && <Check size={20} color="#fff" strokeWidth={2.5} />}
                        </button>
                        {/* generate photo button — only when there's food */}
                        {hasFood && !photo && (
                          <button onClick={() => handleGeneratePhoto(s.key)}
                            disabled={!!generatingSlot}
                            title="Generate meal photo with AI"
                            style={{ width:44, height:32, borderRadius:10,
                              border:`1.5px solid ${T.gold}`,
                              background:T.goldLight,
                              cursor: generatingSlot ? 'default' : 'pointer',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              opacity: generatingSlot ? 0.5 : 1 }}>
                            <Wand2 size={14} color={T.gold} />
                          </button>
                        )}
                        {photoErr && !generatingSlot && (
                          <div style={{ fontSize:9, color:T.over, maxWidth:44, textAlign:'center', lineHeight:1.2,
                            wordBreak:'break-all', cursor:'pointer' }}
                            title={photoErr}
                            onClick={() => setPhotoErr(null)}>
                            error ✕
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* add item bar */}
                  <button onClick={() => openSheet(s.key)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:6, padding:'10px 18px',
                      background:T.accentLight, border:'none', borderBottomLeftRadius:14, borderBottomRightRadius:14,
                      cursor:'pointer', color:T.accentSoft }}>
                    <Plus size={14} />
                    <span style={{ fontSize:13, fontWeight:600 }}>Add item</span>
                  </button>
                </div>
              );
            })}

            <button onClick={resetWeek}
              style={{ width:'100%', padding:'13px', borderRadius:14, border:`1.5px solid ${T.border}`,
                background:'transparent', color:T.muted, fontSize:13, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
              <RotateCcw size={14} /> Clear this week's check-offs
            </button>
          </div>

        ) : (
          /* ── PROGRESS TAB ── */
          <div style={{ padding:'16px 16px 8px' }}>

            <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:12 }}>LOG A WEIGH-IN</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input value={wInput} onChange={e=>setWInput(e.target.value)} inputMode="decimal" placeholder="87.5"
                  style={{ ...inp, flex:1 }} />
                <span style={{ color:T.muted, fontSize:14, flexShrink:0 }}>kg</span>
                <button onClick={logWeight}
                  style={{ flexShrink:0, padding:'12px 18px', borderRadius:12, border:'none',
                    background:T.accent, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5 }}>
                  <Plus size={16} /> Log
                </button>
              </div>
              <p style={{ fontSize:12, color:T.faint, marginTop:8 }}>Same morning, same conditions. The trend is the truth.</p>
            </div>

            {wStats && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                <StatCard label="Current"  value={`${wStats.current}`} unit="kg" />
                <StatCard label="Change"   value={`${wStats.change>0?'+':''}${wStats.change}`} unit="kg"
                  color={wStats.change<0?T.ok:wStats.change>0?T.over:T.ink} />
                <StatCard label="Per week" unit="kg"
                  value={wStats.perWk==null?'—':`${wStats.perWk>0?'+':''}${wStats.perWk}`}
                  color={wStats.perWk==null?T.muted:wStats.perWk<0?T.ok:T.over} />
              </div>
            )}

            <div style={{ background:T.surface, borderRadius:20, padding:'16px 8px 12px 0', marginBottom:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, paddingLeft:18, marginBottom:8 }}>WEIGHT TREND</div>
              {weights.length === 0 ? (
                <p style={{ padding:'24px 18px', textAlign:'center', color:T.faint, fontSize:13 }}>No weigh-ins yet.</p>
              ) : (
                <div style={{ width:'100%', height:200 }}>
                  <ResponsiveContainer>
                    <LineChart data={weights} margin={{ top:4, right:16, bottom:2, left:0 }}>
                      <CartesianGrid stroke={T.border} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize:10, fill:T.muted }} tickFormatter={d=>d.slice(5)} axisLine={{ stroke:T.border }} tickLine={false} />
                      <YAxis domain={['auto','auto']} tick={{ fontSize:10, fill:T.muted }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip contentStyle={{ borderRadius:10, border:`1px solid ${T.border}`, fontSize:12 }} formatter={v=>[`${v} kg`,'Weight']} />
                      <Line type="monotone" dataKey="kg" stroke={T.accent} strokeWidth={2.5} dot={{ r:3,fill:T.accent }} activeDot={{ r:5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={{ background:T.surface, borderRadius:20, padding:'16px 18px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700 }}>MEALS ON PLAN</div>
                <Trophy size={15} color={T.gold} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginTop:8 }}>
                <span style={{ ...NF, fontSize:36, fontWeight:700, color:T.accent }}>{adh.done}</span>
                <span style={{ ...NF, fontSize:16, color:T.muted, marginBottom:4 }}>/ {adh.total} meals</span>
              </div>
              <div style={{ height:8, background:T.border, borderRadius:20, marginTop:10, overflow:'hidden' }}>
                <div style={{ width:`${adh.pct}%`, height:'100%', background:T.ok, borderRadius:20, transition:'width .4s ease' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:20,
        background:T.surface, borderTop:`1px solid ${T.border}`,
        display:'flex', paddingBottom:'env(safe-area-inset-bottom)' }}>
        <NavBtn active={tab==='plan'}     onClick={()=>setTab('plan')}     icon={<Flame size={20}/>}  label="Plan" />
        <NavBtn active={tab==='progress'} onClick={()=>setTab('progress')} icon={<Scale size={20}/>}  label="Progress" />
      </div>

      {/* ── BOTTOM SHEET ── */}
      {open && (
        <>
          <div onClick={closeSheet}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:100 }} />

          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:101,
            background:T.surface, borderRadius:'24px 24px 0 0',
            paddingBottom:'calc(20px + env(safe-area-inset-bottom))',
            maxHeight:'88vh', overflowY:'auto', boxShadow:'0 -6px 40px rgba(0,0,0,0.15)' }}>

            <div style={{ width:40, height:4, background:T.border, borderRadius:2, margin:'12px auto 0' }} />

            <div style={{ padding:'12px 18px 0' }}>
              {/* sheet header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.muted, fontWeight:600 }}>
                    {editIdx !== null ? 'EDITING' : 'ADDING TO'}
                  </div>
                  <div style={{ fontSize:17, fontWeight:700, color:T.ink }}>{slotMeta?.label}</div>
                </div>
                <button onClick={closeSheet}
                  style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${T.border}`,
                    background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={16} color={T.muted} />
                </button>
              </div>

              {/* search input */}
              <div style={{ position:'relative', marginBottom:12 }}>
                <Database size={16} color={T.faint} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }} />
                <input
                  value={query}
                  onChange={e => onQuery(e.target.value)}
                  placeholder="Search foods or describe a meal…"
                  style={{ ...inp, paddingLeft:38, paddingRight:44 }}
                  autoFocus
                />
                <button onClick={() => camRef.current?.click()}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }}>
                  <Camera size={18} color={T.muted} />
                </button>
                <input ref={camRef} type="file" accept="image/*" capture="environment"
                  style={{ display:'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async ev => {
                      const raw = ev.target.result;
                      setImgPreview(raw);
                      setDraft(null); setAiErr(null); setBusy(true);
                      try {
                        const base64 = raw.split(',')[1];
                        setDraft(await aiEstimateFromImage(base64, file.type));
                      } catch {
                        setAiErr("Couldn't estimate — edit numbers manually.");
                        setDraft({ custom:true, n:'Photo meal', k:0, p:0, c:0, f:0 });
                      }
                      setBusy(false);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* image preview */}
              {imgPreview && (
                <div style={{ position:'relative', marginBottom:12 }}>
                  <img src={imgPreview} alt="food" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12 }} />
                  <button onClick={() => { setImgPreview(null); setDraft(null); }}
                    style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.5)', border:'none',
                      borderRadius:'50%', width:24, height:24, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <X size={13} color="#fff" />
                  </button>
                  {busy && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', borderRadius:12,
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:600 }}>
                    Estimating…
                  </div>}
                </div>
              )}

              {/* AFCD results */}
              {hits.length > 0 && !pick && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:6 }}>AFCD DATABASE MATCHES</div>
                  <div style={{ border:`1.5px solid ${T.border}`, borderRadius:14, overflow:'hidden' }}>
                    {hits.map((item, i) => (
                      <button key={i} onClick={() => { setPick(item); setIsLiquid(false); }}
                        style={{ width:'100%', textAlign:'left', padding:'12px 14px',
                          border:'none', borderBottom: i<hits.length-1 ? `1px solid ${T.border}` : 'none',
                          background:'transparent', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:14, color:T.ink }}>{item.name}</span>
                        <span style={{ ...NF, fontSize:12, color:T.muted, flexShrink:0, marginLeft:10 }}>{item.kcal} kcal/100g</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* USDA results */}
              {!pick && query.trim().length >= 2 && (usdaLoading || usdaHits.length > 0) && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:6 }}>
                    USDA DATABASE {usdaLoading ? '· searching…' : 'MATCHES'}
                  </div>
                  {!usdaLoading && (
                    <div style={{ border:`1.5px solid ${T.border}`, borderRadius:14, overflow:'hidden' }}>
                      {usdaHits.map((item, i) => (
                        <button key={i} disabled={fetchingDetail} onClick={async () => {
                          setFetchingDetail(true);
                          try {
                            const detail = await fetchUSDAfoodDetail(item.fdcId);
                            setPick(detail);
                            setIsLiquid(detail.isLiquid || false);
                            if (detail.servingSize) setGrams(String(detail.servingSize));
                          } catch {
                            setPick(item);
                            setIsLiquid(item.isLiquid || false);
                            if (item.servingSize) setGrams(String(item.servingSize));
                          }
                          setFetchingDetail(false);
                        }}
                          style={{ width:'100%', textAlign:'left', padding:'12px 14px',
                            border:'none', borderBottom: i<usdaHits.length-1 ? `1px solid ${T.border}` : 'none',
                            background:'transparent', cursor: fetchingDetail ? 'default' : 'pointer',
                            display:'flex', justifyContent:'space-between', alignItems:'center', opacity: fetchingDetail ? 0.5 : 1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {item.isLiquid && <Droplets size={12} color={T.blue} />}
                            <span style={{ fontSize:13, color:T.ink }}>{item.name}</span>
                          </div>
                          <span style={{ ...NF, fontSize:12, color:T.muted, flexShrink:0, marginLeft:10 }}>{item.kcal} kcal/100{item.isLiquid?'ml':'g'}</span>
                        </button>
                      ))}
                      {fetchingDetail && (
                        <div style={{ padding:'10px 14px', fontSize:12, color:T.muted, textAlign:'center' }}>Loading serving info…</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* gram/ml adjuster */}
              {pick && (
                <div style={{ border:`2px solid ${T.accentLight}`, borderRadius:16, padding:14, marginBottom:12, background:T.accentLight }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.accent, flex:1 }}>{pick.name}</div>
                    {/* liquid toggle */}
                    <button onClick={() => setIsLiquid(v => !v)}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:8,
                        border:`1.5px solid ${isLiquid ? T.blue : T.border}`,
                        background: isLiquid ? '#EBF3FA' : 'transparent',
                        cursor:'pointer', fontSize:11, fontWeight:600,
                        color: isLiquid ? T.blue : T.muted }}>
                      <Droplets size={12} /> {isLiquid ? 'ml' : 'liquid?'}
                    </button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: pick.servingLabel ? 6 : 10 }}>
                    <span style={{ fontSize:13, color:T.muted, flexShrink:0 }}>Serving</span>
                    <input value={grams} onChange={e=>setGrams(e.target.value)} inputMode="decimal"
                      style={{ ...inp, width:80, textAlign:'center', padding:'8px' }} />
                    <span style={{ fontSize:13, color:T.muted }}>{unit}</span>
                    <button onClick={() => { setPick(null); setIsLiquid(false); setHits(searchAFCD(query)); }}
                      style={{ marginLeft:'auto', fontSize:12, color:T.muted, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                      change
                    </button>
                  </div>
                  {pick.servingLabel && pick.servingSize && (
                    <div style={{ fontSize:11, color:T.accentSoft, marginBottom:10 }}>
                      {pick.servingLabel} = {pick.servingSize}{unit}
                      {parseFloat(grams) !== pick.servingSize && (
                        <button onClick={() => setGrams(String(pick.servingSize))}
                          style={{ marginLeft:8, fontSize:11, color:T.accentSoft, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                          reset to 1 unit
                        </button>
                      )}
                    </div>
                  )}
                  {scaledDraft && (
                    <>
                      <div style={{ ...NF, fontSize:13, color:T.accentSoft, marginBottom:10 }}>
                        {scaledDraft.k} kcal · {scaledDraft.p}g P · {scaledDraft.c}g C · {scaledDraft.f}g F
                      </div>
                      <button onClick={() => confirmItem(open, scaledDraft)}
                        style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                          background:T.accent, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <Plus size={16} /> {editIdx !== null ? 'Save changes' : `Add to ${slotMeta?.label.toLowerCase()}`}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* AI estimate button */}
              {!pick && (
                <>
                  <button onClick={runAI} disabled={busy || !query.trim()}
                    style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                      background: busy || !query.trim() ? T.border : T.ink,
                      color: busy || !query.trim() ? T.muted : '#fff',
                      fontSize:14, fontWeight:600, cursor: busy || !query.trim() ? 'default' : 'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:8 }}>
                    <Sparkles size={15} />
                    {busy ? 'Estimating…' : hits.length > 0 ? 'Not a match — estimate with AI' : 'Estimate macros with AI'}
                  </button>
                  {aiErr && <p style={{ fontSize:12, color:T.over, marginBottom:8 }}>{aiErr}</p>}
                </>
              )}

              {/* AI draft editor */}
              {draft && !pick && (
                <div style={{ border:`1.5px solid ${T.border}`, borderRadius:16, padding:14, marginBottom:12 }}>
                  <input value={draft.n} onChange={e=>setDraft(d=>({...d,n:e.target.value}))}
                    style={{ ...inp, fontWeight:700, fontSize:15, marginBottom:10 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                    {[['k','kcal'],['p','Protein'],['c','Carbs'],['f','Fat']].map(([key,lbl])=>(
                      <div key={key}>
                        <div style={{ fontSize:10, color:T.muted, textAlign:'center', marginBottom:4 }}>{lbl}</div>
                        <input value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:Math.max(0,parseInt(e.target.value)||0)}))}
                          inputMode="numeric" style={{ ...inp, textAlign:'center', padding:'8px 4px', fontSize:14 }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={async () => {
                    const photo = imgPreview ? await compressImage(imgPreview) : null;
                    confirmItem(open, { ...draft }, photo);
                  }}
                    style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                      background:T.ok, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Plus size={16} /> {editIdx !== null ? 'Save changes' : `Add to ${slotMeta?.label.toLowerCase()}`}
                  </button>
                </div>
              )}

              {/* catalog — only show when not editing */}
              {editIdx === null && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:8 }}>
                    {query ? 'OR PICK FROM PLAN' : 'PICK FROM PLAN'}
                  </div>
                  {(slotMeta?.opts || []).map(id => {
                    const oo = OPT[id];
                    return (
                      <button key={id} onClick={() => confirmItem(open, id)}
                        style={{ width:'100%', textAlign:'left', padding:'12px 14px', marginBottom:6,
                          borderRadius:12, border:`1.5px solid ${T.border}`, background:T.surface, cursor:'pointer',
                          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:500, color:oo.skip?T.muted:T.ink }}>{oo.n}</div>
                          {!oo.skip && <div style={{ ...NF, fontSize:12, color:T.muted, marginTop:1 }}>{oo.k} kcal · {oo.p}P · {oo.c}C · {oo.f}F</div>}
                        </div>
                        <Plus size={14} color={T.accentSoft} style={{ flexShrink:0, marginLeft:8 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── sub-components ── */
function PhotoBanner({ photo, onRemove }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => { setStatus('loading'); }, [photo]);

  return (
    <div style={{ position:'relative', height:140, background:T.border,
      borderTopLeftRadius:14, borderTopRightRadius:14, overflow:'hidden' }}>
      {status === 'loading' && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:6, background:T.goldLight }}>
          <Wand2 size={18} color={T.gold} />
          <span style={{ fontSize:11, color:T.gold, fontWeight:600 }}>Generating photo…</span>
        </div>
      )}
      {status === 'error' && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:4, background:T.border }}>
          <span style={{ fontSize:12, color:T.muted }}>Photo unavailable</span>
          <button onClick={onRemove}
            style={{ fontSize:11, color:T.accentSoft, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            remove
          </button>
        </div>
      )}
      <img
        src={photo}
        alt="meal"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{ width:'100%', height:'100%', objectFit:'cover',
          display: status === 'loaded' ? 'block' : 'none' }}
      />
      {status === 'loaded' && (
        <button onClick={onRemove}
          style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.5)',
            border:'none', borderRadius:'50%', width:26, height:26, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={13} color="#fff" />
        </button>
      )}
    </div>
  );
}

function MacroGauge({ icon, label, value, goal, unit, color }) {
  const pct = Math.min(100, goal ? (value/goal)*100 : 0);
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:T.muted }}>
          {icon} {label}
        </span>
        <span style={{ ...NF, fontSize:20, fontWeight:700 }}>
          <span style={{ color }}>{value}</span>
          <span style={{ color:T.faint, fontSize:13 }}> / {goal} {unit}</span>
        </span>
      </div>
      <div style={{ height:8, background:T.border, borderRadius:20, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:20, transition:'width .35s ease' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{ background:T.surface, borderRadius:16, padding:'14px 10px', textAlign:'center', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize:11, color:T.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
      <div style={{ ...NF, fontSize:24, fontWeight:700, color:color||T.ink }}>{value}</div>
      <div style={{ fontSize:11, color:T.faint }}>{unit}</div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, padding:'12px 0 10px', border:'none', background:'transparent', cursor:'pointer',
        color:active ? T.accent : T.faint, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      {icon}
      <span style={{ ...NF, fontSize:11, fontWeight:600, letterSpacing:0.5 }}>{label}</span>
    </button>
  );
}
