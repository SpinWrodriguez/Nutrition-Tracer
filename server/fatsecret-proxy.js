import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

for (const envFile of ['.env.local', '.env']) {
  if (!existsSync(envFile)) continue;
  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.PORT || 8787);
const CLIENT_ID = process.env.FATSECRET_CLIENT_ID || process.env.VITE_FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET || process.env.VITE_FATSECRET_CLIENT_SECRET;
const SCOPE = process.env.FATSECRET_SCOPE || 'basic';
const REGION = process.env.FATSECRET_REGION || '';
const LANGUAGE = process.env.FATSECRET_LANGUAGE || '';

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_BASE = 'https://platform.fatsecret.com/rest';
const DIST_DIR = resolve('dist');

let cachedToken = null;
let tokenExpiresAt = 0;

const json = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CORS_ORIGIN || '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
};

const asArray = value => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toNumber = value => {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const parseFoodDescription = description => {
  const text = String(description || '');
  const amount = text.match(/^Per\s+(.+?)\s+-\s+/i)?.[1] || null;
  const calories = text.match(/Calories:\s*([\d.]+)\s*kcal/i)?.[1];
  const fat = text.match(/Fat:\s*([\d.]+)\s*g/i)?.[1];
  const carbs = text.match(/Carbs:\s*([\d.]+)\s*g/i)?.[1];
  const protein = text.match(/Protein:\s*([\d.]+)\s*g/i)?.[1];
  return {
    amount,
    kcal: Math.round(toNumber(calories)),
    f: toNumber(fat),
    c: toNumber(carbs),
    p: toNumber(protein),
  };
};

const displayName = food => {
  const brand = food.brand_name ? `${food.brand_name} ` : '';
  return `${brand}${food.food_name || 'Food'}`.trim();
};

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET');
  }

  const attempts = [
    { name: 'basic-auth with scope', useBasicAuth: true, scope: SCOPE },
    { name: 'basic-auth without scope', useBasicAuth: true, scope: '' },
    { name: 'form credentials with scope', useBasicAuth: false, scope: SCOPE },
    { name: 'form credentials without scope', useBasicAuth: false, scope: '' },
  ];

  let data = null;
  const errors = [];
  for (const attempt of attempts) {
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    if (attempt.scope) body.set('scope', attempt.scope);
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    if (attempt.useBasicAuth) {
      headers.authorization = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
    } else {
      body.set('client_id', CLIENT_ID);
      body.set('client_secret', CLIENT_SECRET);
    }

    const res = await fetch(TOKEN_URL, { method: 'POST', headers, body });
    data = await res.json().catch(() => ({}));
    if (res.ok && data.access_token) break;
    errors.push(`${attempt.name}: ${data.error_description || data.error || `HTTP ${res.status}`}`);
    data = null;
  }

  if (!data?.access_token) {
    throw new Error(`FatSecret auth failed. ${errors.join(' | ')}`);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Number(data.expires_in || 86400) * 1000;
  return cachedToken;
}

async function fatsecretGet(path, params) {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error_description || `FatSecret API ${res.status}`);
  }
  return data;
}

const chooseServing = servings => {
  const list = asArray(servings?.serving);
  return (
    list.find(s => String(s.is_default) === '1') ||
    list.find(s => String(s.serving_description || '').toLowerCase().includes('100 g')) ||
    list.find(s => s.metric_serving_amount && ['g', 'ml'].includes(String(s.metric_serving_unit).toLowerCase())) ||
    list[0]
  );
};

const normalizeSearch = data => asArray(data.foods?.food)
  .map(food => {
    const parsed = parseFoodDescription(food.food_description);
    const unitText = String(parsed.amount || '').toLowerCase();
    const isLiquid = unitText.includes('ml');
    return {
      foodId: food.food_id,
      name: displayName(food),
      foodType: food.food_type || null,
      brandName: food.brand_name || null,
      description: food.food_description || '',
      kcal: parsed.kcal,
      p: parsed.p,
      c: parsed.c,
      f: parsed.f,
      servingLabel: parsed.amount,
      isLiquid,
    };
  })
  .filter(food => food.foodId);

const normalizeDetail = data => {
  const food = data.food;
  const serving = chooseServing(food?.servings);
  if (!food || !serving) throw new Error('No FatSecret serving data found');

  const metricAmount = toNumber(serving.metric_serving_amount);
  const metricUnit = String(serving.metric_serving_unit || 'g').toLowerCase();
  const canScaleTo100 = metricAmount > 0 && ['g', 'ml'].includes(metricUnit);
  const scale = canScaleTo100 ? 100 / metricAmount : 1;

  return {
    foodId: food.food_id,
    servingId: serving.serving_id,
    name: displayName(food),
    kcal: Math.round(toNumber(serving.calories) * scale),
    p: toNumber(serving.protein) * scale,
    c: toNumber(serving.carbohydrate) * scale,
    f: toNumber(serving.fat) * scale,
    servingSize: canScaleTo100 ? Math.round(metricAmount) : null,
    servingLabel: serving.serving_description || null,
    isLiquid: metricUnit === 'ml',
  };
};

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    json(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/fatsecret/search') {
    const query = url.searchParams.get('q')?.trim();
    if (!query || query.length < 2) {
      json(res, 200, []);
      return;
    }
    const data = await fatsecretGet('/foods/search/v1', {
      search_expression: query,
      max_results: '12',
      page_number: '0',
      region: REGION,
      language: LANGUAGE,
    });
    json(res, 200, normalizeSearch(data));
    return;
  }

  if (url.pathname === '/api/fatsecret/food') {
    const foodId = url.searchParams.get('id');
    if (!foodId) {
      json(res, 400, { error: 'Missing food id' });
      return;
    }
    const data = await fatsecretGet('/food/v4', {
      food_id: foodId,
      flag_default_serving: 'true',
      region: REGION,
      language: LANGUAGE,
    });
    json(res, 200, normalizeDetail(data));
    return;
  }

  json(res, 404, { error: 'Not found' });
}

const mime = filePath => ({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}[extname(filePath).toLowerCase()] || 'application/octet-stream');

async function serveStatic(res, url) {
  const pathname = url.pathname.startsWith('/Nutrition-Tracer/')
    ? url.pathname.slice('/Nutrition-Tracer'.length)
    : url.pathname;
  const requested = normalize(pathname === '/' ? '/index.html' : pathname);
  const filePath = resolve(join(DIST_DIR, requested));
  if (!filePath.startsWith(DIST_DIR) || !existsSync(filePath)) {
    const indexPath = join(DIST_DIR, 'index.html');
    if (!existsSync(indexPath)) {
      json(res, 404, { error: 'Build the frontend with npm run build first, or run npm run dev separately.' });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(await readFile(indexPath));
    return;
  }
  res.writeHead(200, { 'content-type': mime(filePath) });
  createReadStream(filePath).pipe(res);
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(res, url);
  } catch (err) {
    console.error(err);
    json(res, 500, { error: err.message || 'Server error' });
  }
}).listen(PORT, () => {
  console.log(`FatSecret proxy listening on http://localhost:${PORT}`);
});
