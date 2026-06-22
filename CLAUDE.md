# Nutrition Tracer — Claude Context

## What this app is
A personal nutrition tracking PWA (React + Vite) deployed to GitHub Pages. It is a **single-user app** built for one person (Will Rodriguez, wrodriguez@spinifexit.com) who lives in Australia (UTC+10/11). The app is pinned to a phone home screen and used daily to track meals, macros, weight, and progress.

Live URL: `https://spinwrodriguez.github.io/Nutrition-Tracer/`
Repo: GitHub Pages deployment via `.github/workflows/deploy.yml`

---

## Tech stack
- **React + Vite** — SPA, no router, single `App.jsx` entry
- **Lucide React** — all icons
- **Supabase** — auth (email OTP, 6-digit code) + database (JSONB) + photo storage
- **IndexedDB** — local photo cache (`nt-media` DB, `photos` store)
- **localStorage** — text data cache (key: `nt-v2`)
- **GitHub Actions** — builds and deploys on push to `main`

---

## Architecture

### Data storage (two-layer)
Text data (meals, checks, weights, goals, savedMeals):
- Written to `localStorage` key `nt-v2` on every change
- Debounced 2s upsert to Supabase `nutrition_data` table (JSONB column `data`, keyed by `userId`)

Photos (meal slot photos + saved meal photos):
- Stored in IndexedDB (`nt-media` / `photos` store) as base64
- Synced to Supabase Storage bucket `photos` — path: `{userId}/{urlSafeBase64(idbKey)}`
- IDB keys: `slot:{date}:{slotKey}` and `meal:{mealId}`
- Downloaded from Supabase Storage to IndexedDB on login (only missing ones)

### Auth
- Supabase email OTP (6-digit code, NOT magic link — magic links broke PWA home screen flow)
- Session lasts 60 days, auto-refreshes — user logs in once per device
- `useAuth.js` hook — `signIn(email)` sends code, `verifyOtp(email, token)` confirms
- DEV bypass: in `npm run dev`, login screen is skipped (`import.meta.env.DEV` check in `App.jsx`)

### State
- `useAppData(userId)` — the single source of truth, lives in `App.jsx`
- Selections keyed by ISO date string (e.g. `2026-06-22`) not day-id — **critical** after old format migration
- `localDateISO()` used everywhere for current date — **never** `new Date().toISOString()` (would give UTC date, wrong for Australian users early morning)

---

## File map

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component, auth gate, tab routing, passes props down |
| `src/constants.js` | Design tokens `T`, `NF`, `SLOTS`, `DAYS`, `DEFAULTS`, `OPT` catalog, helpers |
| `src/data.js` | `freshData()`, `normalizeData()`, `extractOldPhotos()` (migration) |
| `src/hooks/useAppData.js` | All app state + mutations, Supabase sync, photo management |
| `src/hooks/useAuth.js` | Supabase auth — `signIn`, `verifyOtp`, `signOut`, session state |
| `src/hooks/useItemSheet.js` | Add/edit item bottom sheet logic |
| `src/components/App.jsx` | — |
| `src/components/LoginScreen.jsx` | Two-step login: email → 6-digit code |
| `src/components/MealCard.jsx` | Day plan meal slot card with photo, items, check |
| `src/components/AddItemSheet.jsx` | Bottom sheet to add/edit a meal item |
| `src/components/SettingsTab.jsx` | Weight log, goals, backup/restore, account |
| `src/components/ProgressTab.jsx` | Weekly progress charts |
| `src/components/SavedMealsTab.jsx` | Saved meals library (star favourites) |
| `src/components/AiChat.jsx` | AI assistant tab |
| `src/components/AnalyzeSheet.jsx` | Photo nutrition analysis sheet |
| `src/components/ui.jsx` | Shared components: `StatCard`, `MacroGauge`, `NavBtn` |
| `src/api.js` | OpenAI (GPT-4o-mini) for nutrition lookup + photo analysis + AI chat; USDA fallback |
| `src/db.js` | IndexedDB wrapper — `photoSet`, `photoDel`, `photoClear`, `photoGetAll` |
| `src/storage.js` | Supabase Storage wrapper — `storageUpload`, `storageDelete`, `storageSync`, `storageUploadAll` |
| `src/supabase.js` | Supabase client init |

---

## Design system
All colors via CSS custom properties, themed per `data-theme` on `<html>`:
- `green` (default) — dark green accent
- `blue` — muted gray-blue accent (`#4A6880`)

Tokens accessed via `T.bg`, `T.surface`, `T.accent`, `T.gold`, `T.ok`, `T.over`, etc.
Fonts: `NF` = Oswald (narrow numbers), `sf` = system sans-serif.
Themes defined in `index.html` as CSS custom properties.

---

## Meal structure
6 slots per day: `breakfast`, `morningSnack`, `lunch`, `afternoonSnack`, `dinner`, `snack`
Morning/afternoon/evening snacks are optional slots.

Each slot holds an array of items. Items can be:
- A string key into `OPT` catalog (e.g. `"b_eggs"`)
- A custom object `{ custom:true, n, k, p, c, f }`

`one(v)` resolves either form to `{ n, k, p, c, f }`.
`sumSlot(items)` returns totals `{ k, p, c, f }`.

---

## Key mutations in useAppData
- `addItem(slotKey, item)` — adds item to current day slot
- `removeItem(slotKey, idx)` — removes item by index
- `replaceItem(slotKey, idx, item)` — replaces item (edit)
- `toggleCheck(slotKey)` — marks slot eaten/uneaten
- `logWeight(kg)` — adds weight entry for current day
- `saveMeal(item, photo?)` — saves to savedMeals library
- `removeSavedMeal(id)` — removes from library
- `setSlotPhoto(slotKey, base64)` — sets photo for current day slot
- `removeSlotPhoto(slotKey)` — removes slot photo
- `clearLocalData()` — sign-out cleanup (clears localStorage + IndexedDB)
- `getFullBackup()` async — returns `{ ...data, _photos: { slots, meals } }` for download
- `importData(raw)` async — restores from backup JSON including photos

---

## Environment variables
Set in `.env.local` (gitignored) locally and as GitHub Secrets for CI:
```
VITE_SUPABASE_URL       = https://zjmymkptouwyuntqcage.supabase.co
VITE_SUPABASE_ANON_KEY  = sb_publishable_...
VITE_OPENAI_KEY         = sk-...
VITE_USDA_KEY           = ...
VITE_GEMINI_KEY         = ...
```

---

## Supabase setup
- **Table**: `nutrition_data` — columns `id` (uuid, PK = user id), `data` (jsonb)
- **Bucket**: `photos` — private, RLS: users can only access their own folder (`{userId}/...`)
- **Auth**: Email OTP enabled, Site URL = `https://spinwrodriguez.github.io/Nutrition-Tracer/`
- **RLS policies**: users read/write only their own row in `nutrition_data` and their own folder in `storage.objects`

---

## Deployment
Push to `main` → GitHub Actions builds (`npm run build`) → deploys to GitHub Pages.
Workflow: `.github/workflows/deploy.yml` — injects all `VITE_*` secrets at build time.

---

## Known decisions & gotchas
- **UTC date bug**: `new Date().toISOString()` returns UTC — wrong date for Australian users before 10am. Always use `localDateISO()`.
- **Magic links don't work with PWA home screen** (iOS): opening a link in email opens Safari, not the home screen app — separate localStorage contexts. Switched to 6-digit OTP code to keep the user in-app.
- **Photos not in localStorage**: moved to IndexedDB to avoid QuotaExceededError. Old format had photos in `data.photos` and `savedMeals[].photo` — `extractOldPhotos()` handles migration.
- **Selections keyed by ISO date, not day-id**: old format used `mon/tue/etc`. `normalizeData()` detects and migrates.
- **DEV login bypass**: `if (!session && !import.meta.env.DEV)` in App.jsx — production always requires login, local dev skips it.
- **Star toggle**: filled star means meal is already in savedMeals — tapping removes it (`removeSavedMeal`). Outline star adds it (`saveMeal`).
- **`savedMealNames`**: computed as `new Set(app.savedMeals.map(m => m.n.toLowerCase()))` in App.jsx and passed to MealCard for O(1) lookup.
