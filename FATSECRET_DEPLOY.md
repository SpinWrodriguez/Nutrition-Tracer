# FatSecret Proxy Deployment

FatSecret must be called from a server with a stable outbound IP. This app now calls
`/api/fatsecret/search` and `/api/fatsecret/food`; those routes are served by
`server/fatsecret-proxy.js`.

## Local Development

In one terminal:

```powershell
$env:FATSECRET_CLIENT_ID="your-client-id"
$env:FATSECRET_CLIENT_SECRET="your-client-secret"
$env:FATSECRET_SCOPE="basic"
$env:FATSECRET_REGION="AU"
npm run api
```

In another terminal:

```powershell
npm run dev
```

Vite proxies `/api` to `http://localhost:8787`.

## Production With GitHub Pages

If the React app stays on GitHub Pages, deploy only the proxy/server to a VPS
or app host with a static outbound IP.

1. Deploy the proxy from this repo to the VPS.
2. Set these environment variables on the VPS:

```text
FATSECRET_CLIENT_ID=...
FATSECRET_CLIENT_SECRET=...
FATSECRET_SCOPE=basic
FATSECRET_REGION=AU
FATSECRET_LANGUAGE=en
```

3. Run the proxy:

```bash
npm ci
PORT=8787 npm start
```

4. In the FatSecret developer console, whitelist the VPS static outbound IP.
5. Build the GitHub Pages frontend with:

```text
VITE_FATSECRET_PROXY_URL=https://your-proxy-domain.example
```

For local development, omit `VITE_FATSECRET_PROXY_URL` and use `npm run dev` plus
`npm run api`; Vite will proxy `/api` to `http://localhost:8787`.

Do not put the FatSecret client secret in any `VITE_*` variable for production.

## Docker Deployment

Create a `.env` file on the server:

```text
FATSECRET_CLIENT_ID=...
FATSECRET_CLIENT_SECRET=...
FATSECRET_SCOPE=
FATSECRET_REGION=AU
FATSECRET_LANGUAGE=en
VITE_OPENAI_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Then run:

```bash
docker compose up -d --build
```

The proxy will listen on `http://SERVER_IP:8787`.
