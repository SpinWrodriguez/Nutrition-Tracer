const USDA_KEY   = import.meta.env.VITE_USDA_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;

const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const GEMINI_HEADERS = { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY };

const LIQUID_UNITS = ['ml', 'mls', 'milliliter', 'millilitre', 'milliliters', 'millilitres'];

const TEXT_NUTRITION_PROMPT = 'You are a precise nutrition expert. Look up or recall accurate nutrition data from USDA, NUTTAB, or standard databases for the described food. Return macros for the realistic serving size described (not per 100g unless specified). Respond ONLY with a JSON object, no markdown: {"name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>}';

const IMAGE_NUTRITION_PROMPT = 'You are a precise nutrition expert. Examine this food image carefully: (1) Identify the SPECIFIC food or dish — be specific like "Big Mac" not just "burger". (2) Estimate the portion size using visual cues like plate size, utensils, or packaging. (3) Recall accurate USDA/database nutrition values for that exact food and portion. Return macros for the ENTIRE visible portion shown. Respond ONLY with a JSON object, no markdown: {"name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>}';

function parseGeminiResponse(data, fallbackName) {
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const m = raw.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  const obj = JSON.parse(m ? m[0] : raw);
  return {
    custom: true,
    n: String(obj.name || fallbackName).slice(0, 28),
    k: Math.max(0, Math.round(+obj.k || 0)),
    p: Math.max(0, Math.round(+obj.p || 0)),
    c: Math.max(0, Math.round(+obj.c || 0)),
    f: Math.max(0, Math.round(+obj.f || 0)),
  };
}

/* ── image compression ── */
export async function compressImage(dataUrl, maxWidth = 600, quality = 0.65) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ── OpenAI image generation ── */
export async function generateFoodPhoto(foodDesc) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'gpt-image-2', prompt: `A photo of ${foodDesc}`, n: 1, size: '1024x1024', quality: 'low' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
  return compressImage(`data:image/png;base64,${b64}`, 480, 0.72);
}

/* ── USDA ── */
export async function searchUSDA(q) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('USDA error');
  const data = await res.json();
  return (data.foods || []).map(food => {
    const get = num => food.foodNutrients?.find(n => n.nutrientNumber === num)?.value ?? 0;
    const branded  = food.dataType === 'Branded';
    const sSize    = food.servingSize;
    const sUnit    = (food.servingSizeUnit || '').toLowerCase();
    const isLiquid = LIQUID_UNITS.some(u => sUnit.includes(u));
    const isGrams  = ['g', 'grm', 'gram', 'grams'].includes(sUnit) || (!isLiquid && branded && sSize);
    const mul      = branded && sSize && (isGrams || isLiquid) ? 100 / sSize : 1;
    return {
      fdcId: food.fdcId,
      name: food.description,
      kcal: Math.round(get('208') * mul),
      p: get('203') * mul,
      c: get('205') * mul,
      f: get('204') * mul,
      servingSize:  branded && sSize ? Math.round(sSize) : null,
      servingLabel: food.householdServingFullText || null,
      isLiquid,
    };
  }).filter(f => f.kcal > 0);
}

export async function fetchUSDAfoodDetail(fdcId) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('USDA detail error');
  const food = await res.json();
  const get     = num => food.foodNutrients?.find(n => n.nutrient?.number === num)?.amount ?? 0;
  const portion = food.foodPortions?.[0];
  const sUnit   = (food.servingSizeUnit || '').toLowerCase();
  const isLiquid    = LIQUID_UNITS.some(u => sUnit.includes(u));
  const servingSize = food.servingSize
    ? Math.round(food.servingSize)
    : portion?.gramWeight ? Math.round(portion.gramWeight) : null;
  return {
    name: food.description,
    kcal: Math.round(get('208')),
    p: get('203'),
    c: get('205'),
    f: get('204'),
    servingSize,
    servingLabel: food.householdServingFullText || portion?.modifier || null,
    isLiquid,
  };
}

/* ── Gemini AI ── */
export async function aiEstimate(text) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: GEMINI_HEADERS,
    body: JSON.stringify({ contents: [{ parts: [{ text: TEXT_NUTRITION_PROMPT + '\nFood: ' + text }] }] }),
  });
  return parseGeminiResponse(await res.json(), text);
}

export async function aiEstimateFromImage(base64, mimeType) {
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

/* ── AI weekly summary ── */
export async function aiWeeklySummary({ weekLabel, days, weights, goals }) {
  const dayLines = days.map(({ date, label, slots, checked }) => {
    const lines = slots.map(s => {
      const items = s.items.map(it => `${it.n} (${it.k}kcal ${it.p}P)`).join(' + ') || 'nothing';
      return `  ${s.label}: ${items}${checked[s.key] ? ' ✓' : ''}`;
    }).join('\n');
    const w = weights.find(w => w.date === date);
    return `${label}${w ? ` (${w.kg}kg)` : ''}:\n${lines}`;
  }).join('\n\n');

  const prompt = `You are an encouraging nutrition coach giving a weekly review. Be specific and concise.

Goals: ${goals.kcal} kcal/day, ${goals.protein}g protein, focus on ${goals.focus}.
Week: ${weekLabel}

${dayLines}

Reply ONLY with JSON, no markdown:
{"summary":"2-3 sentence overview","wins":["bullet1","bullet2"],"improvements":["bullet1"],"tip":"one actionable tip for next week"}`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST', headers: GEMINI_HEADERS,
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const m = raw.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : raw);
}

/* ── AI meal plan generation ── */
export async function aiGeneratePlan({ savedMeals, goals, weekLabel }) {
  if (!savedMeals.length) throw new Error('No saved meals');
  const mealList = savedMeals.map((m, i) => `${i+1}. ${m.n} — ${m.k}kcal, ${m.p}P, ${m.c}C, ${m.f}F`).join('\n');
  const focusNote = goals.focus === 'protein'
    ? `Prioritise high-protein meals. Each day should hit ${goals.protein}g protein. Prefer meals with 30g+ protein per serving.`
    : `Prioritise staying within ${goals.kcal} kcal/day. Choose lower-calorie options where possible.`;

  const prompt = `You are a nutrition-focused meal planner. Create a balanced, varied 7-day plan.

RULES (strictly follow all of them):
1. Use ONLY meal names from the list below — exact spelling, no substitutions.
2. No meal may appear in the SAME slot more than twice across the 7 days (e.g. "lunch" can have the same meal at most twice).
3. Aim for variety: rotate meals across different days to avoid repetition.
4. Each day's slots should together stay close to ${goals.kcal} kcal total.
5. ${focusNote}
6. If a meal list has fewer options than slots × 2, reuse as needed but still spread them out.
7. Include morningSnack and afternoonSnack if snack-type meals are available (≤200 kcal), otherwise omit those keys.

Goals: ${goals.kcal} kcal/day, ${goals.protein}g protein, focus: ${goals.focus}.
Week: ${weekLabel}

Available meals:
${mealList}

Reply ONLY with valid JSON — no markdown, no comments. Use this exact shape (include only slots you can fill):
{"mon":{"breakfast":"name","morningSnack":"name","lunch":"name","afternoonSnack":"name","dinner":"name","snack":"name"},"tue":{...},"wed":{...},"thu":{...},"fri":{...},"sat":{...},"sun":{...}}`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST', headers: GEMINI_HEADERS,
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  const m = raw.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : raw);
}
