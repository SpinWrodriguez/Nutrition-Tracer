const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;
const FATSECRET_PROXY_URL = (import.meta.env.VITE_FATSECRET_PROXY_URL || '').replace(/\/$/, '');

const OPENAI_URL     = 'https://api.openai.com/v1/chat/completions';
const OPENAI_HEADERS = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` };
const OPENAI_MODEL   = 'gpt-4o-mini';

const LIQUID_UNITS = ['ml', 'mls', 'milliliter', 'millilitre', 'milliliters', 'millilitres'];

const TEXT_NUTRITION_PROMPT = 'You are a precise nutrition expert. Look up or recall accurate nutrition data from USDA, NUTTAB, or standard databases for the described food. Return macros for the realistic serving size described (not per 100g unless specified). Respond ONLY with a JSON object, no markdown: {"name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>}';

const IMAGE_NUTRITION_PROMPT = 'You are a precise nutrition expert. Examine this food image carefully: (1) Identify the SPECIFIC food or dish — be specific like "Big Mac" not just "burger". (2) Estimate the portion size using visual cues like plate size, utensils, or packaging. (3) Recall accurate USDA/database nutrition values for that exact food and portion. Return macros for the ENTIRE visible portion shown. Respond ONLY with a JSON object, no markdown: {"name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>}';

function parseOpenAIResponse(data, fallbackName) {
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
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

/* ── FatSecret (proxied server-side) ── */
export async function searchFatSecret(q) {
  const res = await fetch(`${FATSECRET_PROXY_URL}/api/fatsecret/search?q=${encodeURIComponent(q)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'FatSecret search error');
  return data || [];
}

export async function fetchFatSecretFoodDetail(foodId) {
  const res = await fetch(`${FATSECRET_PROXY_URL}/api/fatsecret/food?id=${encodeURIComponent(foodId)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'FatSecret detail error');
  return data;
}

/* ── Grounded estimation (FatSecret + AI) ── */
const PARSE_PROMPT = `Parse this meal into food components with weights.
Return ONLY valid JSON:
{"meal_name":"short name max 26 chars","components":[{"description":"specific food","grams":number,"search_query":"2-4 word search term"}]}
Rules:
- Use exact grams if stated (e.g. "150g yogurt" → grams:150)
- Estimate realistic portion if not stated
- search_query should be specific enough to find the food in a database (include brand if mentioned)
- Split multi-component meals (e.g. yogurt + granola → 2 components)`;

// imageDataUrls: array of data: URL strings (from FileReader or compressed photo)
export async function groundedEstimate(text, imageDataUrls = null) {
  const images = imageDataUrls?.length
    ? imageDataUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    : [];

  const userContent = images.length
    ? [
        { type: 'text', text: PARSE_PROMPT + '\nFood: ' + (text || 'the food shown in this photo') },
        ...images,
      ]
    : PARSE_PROMPT + '\nFood: ' + text;

  const identifyRes = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: images.length ? 'gpt-4o' : OPENAI_MODEL,
      messages: [{ role: 'user', content: userContent }],
      response_format: { type: 'json_object' },
    }),
  });
  const { meal_name, components } = JSON.parse(
    identifyRes.ok ? (await identifyRes.json()).choices?.[0]?.message?.content || '{}' : '{}'
  );
  if (!components?.length) throw new Error('Could not identify food');

  const fsResults = await Promise.all(
    components.map(c => searchFatSecret(c.search_query).catch(() => []))
  );

  const enriched = components.map((c, i) => {
    const hits = (fsResults[i] || []).slice(0, 4);
    if (!hits.length) return `• ${c.description} (${c.grams}g): no database match — estimate`;
    const options = hits.map((h, j) =>
      `  ${j + 1}. ${h.name}: ${h.kcal} kcal, ${h.p}g P, ${h.c}g C, ${h.f}g F per ${h.servingLabel}`
    ).join('\n');
    return `• ${c.description} (${c.grams}g) — pick the closest FatSecret match:\n${options}`;
  }).join('\n\n');

  const label = meal_name || text || 'the food';
  const calcRes = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: `For each component below, choose the FatSecret option that best matches the description, then scale to the stated grams and sum the totals.\n\n${enriched}\n\nReturn ONLY valid JSON: {"reply":"1 sentence: what was matched from FatSecret for each component","name":"${label.slice(0, 26)}","k":<total kcal int>,"p":<total protein int>,"c":<total carbs int>,"f":<total fat int>}`,
      }],
      response_format: { type: 'json_object' },
    }),
  });
  const parsed = JSON.parse((await calcRes.json()).choices?.[0]?.message?.content || '{}');
  return {
    custom: true,
    n: String(parsed.name || label).slice(0, 28),
    k: Math.max(0, Math.round(+parsed.k || 0)),
    p: Math.max(0, Math.round(+parsed.p || 0)),
    c: Math.max(0, Math.round(+parsed.c || 0)),
    f: Math.max(0, Math.round(+parsed.f || 0)),
    reply: parsed.reply || null,
  };
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

/* ── OpenAI AI ── */
export async function aiEstimate(text) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: TEXT_NUTRITION_PROMPT + '\nFood: ' + text }],
      response_format: { type: 'json_object' },
    }),
  });
  return parseOpenAIResponse(await res.json(), text);
}

export async function aiEstimateFromImage(base64, mimeType) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: IMAGE_NUTRITION_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }],
      response_format: { type: 'json_object' },
    }),
  });
  return parseOpenAIResponse(await res.json(), 'Photo meal');
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

  const prompt = `You are an encouraging nutrition coach giving a weekly review. Only the days provided below were logged — ignore any missing days entirely and base your summary solely on the data given.

Goals: ${goals.kcal} kcal/day, ${goals.protein}g protein, focus on ${goals.focus}.
Week: ${weekLabel} (${days.length} day${days.length !== 1 ? 's' : ''} logged)

${dayLines}

Reply ONLY with JSON, no markdown:
{"summary":"2-3 sentence overview of the logged days only","wins":["bullet1","bullet2"],"improvements":["bullet1"],"tip":"one actionable tip for next week"}`;

  const res = await fetch(OPENAI_URL, {
    method: 'POST', headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  const m = raw.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : raw);
}

/* ── AI day chat ── */
export async function aiDayChat(messages, ctx) {
  const slotLines = ctx.slots.map(s => {
    const items = s.items.filter(i => !i.skip);
    if (!items.length) return `${s.label}: empty`;
    const sum = items.map(i => `${i.n} (${i.k}kcal ${i.p}P ${i.c}C ${i.f}F)`).join(' + ');
    return `${s.label}${s.checked ? ' ✓' : ''}: ${sum}`;
  }).join('\n');

  const system = `You are a friendly nutrition assistant in a meal-tracking app. Answer anything related to food, nutrition, ingredients, cooking, diets, calories, macros, health, or the user's logged meals. Be conversational and helpful.

Only deflect with a short witty joke if the message is clearly nothing to do with food or nutrition (e.g. asking about sports scores, coding, or the weather). When in doubt, answer — it's better to be helpful than overly restrictive.

Answer in 2-4 sentences max. Be specific with numbers when relevant.

Day: ${ctx.dayName}
Goals: ${ctx.goals.kcal} kcal, ${ctx.goals.protein}g protein, ${ctx.goals.carbs}g carbs, ${ctx.goals.fat}g fat. Focus: ${ctx.goals.focus}.
Meals:\n${slotLines}
Eaten so far: ${ctx.eaten.k} kcal · ${ctx.eaten.p}g P · ${ctx.eaten.c}g C · ${ctx.eaten.f}g F

Confirm you have context.`;

  const oaMessages = [
    { role: 'system', content: system },
    ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
  ];

  const res = await fetch(OPENAI_URL, {
    method: 'POST', headers: OPENAI_HEADERS,
    body: JSON.stringify({ model: OPENAI_MODEL, messages: oaMessages }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response';
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

  const res = await fetch(OPENAI_URL, {
    method: 'POST', headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  const m = raw.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : raw);
}

/* ── AI photo + chat analyzer (gpt-4o for accuracy) ── */
export async function aiAnalyzeFood(messages) {
  const system = `You are a precise nutrition expert. When given a food photo or description, reason through these steps before answering:

1. IDENTIFY — What is the specific food/dish? Be exact (e.g. "Chicken Tikka Masala" not "curry", "Caffe Latte 12oz" not "coffee").
2. PORTION — Estimate the weight/volume using reference objects (plate diameter ~26cm, fork ~19cm, hand size, packaging labels). State your estimate in grams or ml.
3. LOOK UP — Recall the per-100g macros from USDA or a standard nutrition database for this exact food.
4. CALCULATE — Multiply per-100g values by your portion estimate to get final macros.
5. ADJUST — If the user provides corrections (label data, portion clarification, extra ingredients), redo steps 3-4 with the new information.
6. BEST PHOTO — If multiple photos were provided, identify which one shows the food most clearly and completely. Set photo_index to its 0-based position in the order they were sent. If only one photo, use 0. If no photos, use -1.

ALWAYS respond with valid JSON only — no other text:
{"reply":"1-2 sentences summarising what you identified and your portion estimate","name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>,"photo_index":<int>}`;

  const res = await fetch(OPENAI_URL, {
    method: 'POST', headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...messages],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content?.trim() || '{}');
}

/* ── AI single-day plan (fills only empty slots) ── */
export async function aiGenerateDayPlan({ savedMeals, goals, dayLabel, emptySlots, filledSummary }) {
  if (!savedMeals.length) throw new Error('No saved meals');
  if (!emptySlots.length) throw new Error('All slots are already filled for today');
  const mealList = savedMeals.map((m, i) => `${i+1}. ${m.n} — ${m.k}kcal, ${m.p}P, ${m.c}C, ${m.f}F`).join('\n');
  const focusNote = goals.focus === 'protein'
    ? `Prioritise high-protein meals. Target: ${goals.protein}g protein for the day.`
    : `Aim to stay close to ${goals.kcal} kcal total for the day.`;

  const prompt = `You are a nutrition-focused meal planner. Fill ONLY the empty slots listed below for today.

RULES:
1. Use ONLY meal names from the available list — exact spelling, no substitutions.
2. Only return keys for the empty slots: ${emptySlots.join(', ')}.
3. Do NOT include already-filled slots in your response.
4. ${focusNote}
5. Keep it varied — avoid repeating the same meal across slots.

Day: ${dayLabel}
Already filled: ${filledSummary || 'nothing yet'}
Empty slots to fill: ${emptySlots.join(', ')}
Goals: ${goals.kcal} kcal/day, ${goals.protein}g protein, focus: ${goals.focus}.

Available meals:
${mealList}

Reply ONLY with valid JSON — no markdown. Only include the empty slot keys:
{"slotKey":"meal name"}`;

  const res2 = await fetch(OPENAI_URL, {
    method: 'POST', headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  const data2 = await res2.json();
  const raw2 = data2.choices?.[0]?.message?.content?.trim() || '';
  const m2 = raw2.replace(/```[\s\S]*?```/g, '').match(/\{[\s\S]*\}/);
  return JSON.parse(m2 ? m2[0] : raw2);
}
