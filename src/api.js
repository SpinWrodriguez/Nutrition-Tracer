const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;
const FATSECRET_PROXY_URL = (import.meta.env.VITE_FATSECRET_PROXY_URL || '').replace(/\/$/, '');

const OPENAI_URL     = 'https://api.openai.com/v1/chat/completions';
const OPENAI_HEADERS = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` };
const OPENAI_MODEL   = 'gpt-4o';

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
- For bone-in meats (chicken, ribs, wings, etc.) use EDIBLE portion weight only — no bones (e.g. half a roast chicken edible ≈ 300-380g, not 500g+)
- search_query is the food name only — do NOT include serving weights or amounts (e.g. "salmon fillet" not "200g salmon fillet")
- Preserve any proper noun or specific name from the user's input in description — never genericize them (e.g. "Red Rooster chicken" → description: "Red Rooster chicken"; "Chobani yogurt" → description: "Chobani yogurt")
- In search_query, put the FOOD TYPE first, then the brand name — this improves search ranking (e.g. "Red Rooster chicken" → search_query: "chicken Red Rooster"; "Chobani yogurt" → search_query: "yogurt Chobani")
- Split multi-component meals (e.g. yogurt + granola → 2 components)`;

function parseServingGrams(label) {
  const m = String(label || '').match(/^(\d+(?:\.\d+)?)\s*g$/i);
  return m ? parseFloat(m[1]) : null;
}

function isFsRelevant(hits, searchQuery) {
  if (!hits?.length) return false;
  const firstWord = searchQuery.trim().split(/\s+/)[0].toLowerCase();
  return hits.slice(0, 4).some(h => h.name.toLowerCase().includes(firstWord));
}

async function gptEstimateComponent(description, grams) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: `Estimate nutrition for exactly ${grams}g of "${description}".
Return ONLY valid JSON: {"k":number,"p":number,"c":number,"f":number,"name":"short food name"}
k=kcal, p=protein g, c=carbs g, f=fat g — all values for the full ${grams}g portion.
If this is a specific restaurant or brand (e.g. Red Rooster, McDonald's, Hungry Jack's), use your knowledge of their menu items.`,
      }],
      response_format: { type: 'json_object' },
    }),
  });
  const data = res.ok ? JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}') : {};
  return { k: data.k || 0, p: data.p || 0, c: data.c || 0, f: data.f || 0, name: data.name || description, fromGpt: true };
}

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

  // Strip any gram amounts from search queries before hitting FatSecret
  const fsResults = await Promise.all(
    components.map(c => {
      const q = c.search_query.replace(/\b\d+\s*g\b/gi, '').replace(/\s+/g, ' ').trim();
      return searchFatSecret(q).catch(() => []);
    })
  );

  // Ask AI to pick the best option per component — no math, just a number
  const pickLines = components.map((c, i) => {
    const hits = (fsResults[i] || []).slice(0, 4);
    if (!hits.length) return `${i + 1}. ${c.description} (${c.grams}g): no matches`;
    const opts = hits.map((h, j) => `   ${j + 1}. ${h.name} — per ${h.servingLabel}`).join('\n');
    return `${i + 1}. ${c.description} (${c.grams}g):\n${opts}`;
  }).join('\n\n');

  const pickRes = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: `For each food component, pick the closest FatSecret match by number. Do NOT calculate any macros.\n\n${pickLines}\n\nReturn JSON: {"picks":[<option number 1-4 per component>]}`,
      }],
      response_format: { type: 'json_object' },
    }),
  });
  const { picks = [] } = JSON.parse((await pickRes.json()).choices?.[0]?.message?.content || '{}');

  // JavaScript does the scaling — not the AI
  const scaled = await Promise.all(components.map(async (c, i) => {
    const q = (c.search_query || '').replace(/\b\d+\s*g\b/gi, '').replace(/\s+/g, ' ').trim();
    const hits = (fsResults[i] || []).slice(0, 4);

    // FatSecret free tier lacks brand/restaurant data — fall back to GPT-4o for irrelevant results
    if (!isFsRelevant(hits, q)) {
      return gptEstimateComponent(c.description, c.grams).catch(() => null);
    }

    const rawPick = Number.isInteger(picks[i]) ? picks[i] : 1;
    const pickIdx = Math.max(0, Math.min(rawPick - 1, hits.length - 1));
    const hit = hits[pickIdx];

    const servingGrams = parseServingGrams(hit.servingLabel);
    if (servingGrams > 0) {
      const scale = c.grams / servingGrams;
      return { k: hit.kcal * scale, p: hit.p * scale, c: hit.c * scale, f: hit.f * scale, name: hit.name };
    }
    // Non-gram serving label — fetch detail which is normalised per 100g
    try {
      const detail = await fetchFatSecretFoodDetail(hit.foodId);
      const scale = c.grams / 100;
      return { k: detail.kcal * scale, p: detail.p * scale, c: detail.c * scale, f: detail.f * scale, name: detail.name };
    } catch {
      return null;
    }
  }));

  const totals = scaled.filter(Boolean).reduce(
    (acc, s) => ({ k: acc.k + s.k, p: acc.p + s.p, c: acc.c + s.c, f: acc.f + s.f }),
    { k: 0, p: 0, c: 0, f: 0 }
  );

  const label = meal_name || text || 'the food';
  const reply = `Matched ${components.map((c, i) => {
    const src = scaled[i]?.fromGpt ? '(AI est.)' : '(FatSecret)';
    return `${scaled[i]?.name || c.description} (${c.grams}g) ${src}`;
  }).join(' + ')}.`;

  return {
    custom: true,
    n: String(label).slice(0, 28),
    k: Math.max(0, Math.round(totals.k)),
    p: Math.max(0, Math.round(totals.p)),
    c: Math.max(0, Math.round(totals.c)),
    f: Math.max(0, Math.round(totals.f)),
    reply,
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

/* ── Follow-up intent classifier ── */
export async function classifyFollowUp(followUpText, currentMealDesc) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: OPENAI_HEADERS,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: `Current meal being tracked: "${currentMealDesc}"
User's follow-up: "${followUpText}"

Classify the intent:
- "correction": user identifies a food differently — different brand, restaurant, or product (e.g. "actually it was Red Rooster", "that was sourdough not white bread")
- "addition": user adds a new item to the meal (e.g. "add a Coke", "I also had some chips")
- "advisory": user asks a question or wants nutritional advice (e.g. "how much to skip to reduce 100 kcal?", "is this high protein?")

For correction or addition, also return "updatedDescription": the complete revised meal description as a plain string.
For advisory, set "updatedDescription" to null.

JSON: {"intent":"correction"|"addition"|"advisory","updatedDescription":<string or null>}`,
      }],
      response_format: { type: 'json_object' },
    }),
  });
  return JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}');
}

/* ── AI photo + chat analyzer (gpt-4o for accuracy) ── */
export async function aiAnalyzeFood(messages) {
  const system = `You are a precise nutrition expert helping a user track their meal macros.

PRIORITY ORDER — use whichever source is available, in this order:
1. NUTRITION LABELS IN PHOTOS — If any photo shows a nutrition panel, ingredients table, or any printed nutritional info, read those numbers exactly. This is ground truth. Do not override label values with database estimates.
2. USER-STATED VALUES — If the user says "the label says X kcal" or provides specific numbers, use exactly those.
3. DATABASE RECALL — Only if no label and no user values are available, recall from USDA or standard nutritional databases.

For the INITIAL estimate (first message):
- SCAN every photo provided. Some may be the meal; others may be nutrition labels or packaging.
- READ any nutrition panel carefully: note the per-serving values (kcal, protein, carbs, fat) and the serving size (g or ml).
- ESTIMATE portion from the meal photo: how many servings did the user eat? Use visual cues — plate size (~26 cm), utensils, packaging remaining, or any stated grams.
- CALCULATE: label values × portions eaten. If multiple items each have labels, sum them.
- If NO label is visible: identify the food precisely (brand/restaurant if known), estimate portion weight, then recall macros from USDA or known menu data.
- BEST PHOTO: set photo_index to the index of the clearest food photo (prefer the meal photo over label photos). Use 0 if only one photo.
- In your reply, briefly state what source you used (e.g. "Read from nutrition label", "Estimated from photo — no label visible").

For CORRECTIONS or ADDITIONS (e.g. "add cheese", "actually it was Red Rooster", "label says 320 kcal", "I had 2 servings not 1"):
- Update macros to reflect the change.
- Return a brief reply (1-2 sentences) confirming what changed and the new total.

For ADVISORY QUESTIONS (e.g. "how much to skip to save 100 kcal?", "is this high protein?"):
- Answer specifically with numbers.
- Return the CURRENT macro values UNCHANGED — do not modify k, p, c, f.
- Reply can be 2-4 sentences.

ALWAYS respond with valid JSON only — no other text:
{"reply":"what you found and how you calculated it","name":"specific food name max 26 chars","k":<kcal int>,"p":<protein g int>,"c":<carbs g int>,"f":<fat g int>,"photo_index":<int>}`;

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
