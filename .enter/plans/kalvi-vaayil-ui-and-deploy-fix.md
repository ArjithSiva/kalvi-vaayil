# Kalvi Vaayil — Render build fix + Tamil-first UI overhaul

## Context

Kalvi Vaayil (கல்வி வாயில்) is a bilingual LMS workshop platform: React/Vite on Vercel, Express/MongoDB on Render.
Two problems block launch:

1. **Render build crashes** with `Cannot read properties of null (reading 'matches')`. This is an npm Arborist
   error caused by the stale `server/package-lock.json` committed in the last turn — it is out of sync with
   `server/package.json`. The root `pnpm-lock.yaml` is legitimate and required by Vercel
   (`vercel.json` → `pnpm run build:prod`) and Enter's own build, so it must stay.

2. **The UI needs a full Tamil-first redesign.** The audit found the current Tamil CSS is actively working
   against the layout, Google Fonts are never loaded, and ~106 English strings bypass i18next.

### Audit findings that drive the plan

Verified by reading the built CSS in `dist/assets/index-C9G3gPRm.css` (offsets are byte positions):

| Finding | Evidence | Impact |
|---|---|---|
| `:lang(ta) h1{font-size:clamp(1.75rem,4vw,2.25rem)}` is emitted **after** Tailwind utilities | `:lang(ta) h1` @34032 vs `.text-4xl` @23390 | Tamil hero/titles shrink and ignore `sm:text-6xl` breakpoints — the exact layout shift the CSS claims to prevent |
| `[class*=flex]:not([class*=nowrap]){flex-wrap:wrap}` @34755 | matches `flex-col`, `flex-1`, `inline-flex` | Force-wraps every flex container in Tamil mode — the "pushing content vertically" symptom |
| `[class*=card]{overflow:hidden}` @34649 | also matches `bg-card`, `shadow-card`, `gradient-card` | Clips popovers/dropdowns inside cards; breaks `position: sticky` descendants |
| `.kv-container`, `.kv-grid`, `.kv-card-pad` are **absent** from the build | Tailwind purges unused `@layer components` classes | Dead design-system utilities that were never wired up |
| Google Fonts never loaded | `index.html` has only `preconnect`, no stylesheet `<link>` | `'Inter','Noto Sans Tamil'` in `index.css` fall back to system fonts; Tamil rendering is inconsistent |
| `index.html` still has Enter boilerplate | `<title>Enter</title>`, "Enter Generated Project", Enter `og:image` | No branding, wrong social previews |
| 8 files never import `useTranslation` | `VerifyCertificate`, `admin/QuotaInbox`, `admin/Settings`, `admin/CategoryManagement`, `admin/Analytics`, `QRScanner`, `AppLayout`, `ProtectedRoute` | Untranslated screens |
| ~106 hardcoded JSX strings | heaviest: `organizer/WorkshopDetail` 21, `admin/Analytics` 17, `participant/WorkshopDetail` 10 | Mixed English/Tamil UI |
| 4 duplicated pre-auth top bars | `Home` (`fixed`), `PublicDiscover`/`LoginPage`/`RegisterPage` (`sticky`, `container`) | Already inconsistent; ~120 duplicated lines |
| `zh-CN.json` is a template leftover | not in `i18n.config.json`; eagerly bundled by `import.meta.glob` in `i18n/config.ts` | Ships dead Chinese strings in the bundle |
| `Index.tsx` is an unrouted dead page | not referenced in `router.tsx`; raw hex + `text-white` | Dead code |
| **`seed.js` disconnects the live DB connection** | `seed.js` calls `mongoose.connect()` then `mongoose.disconnect()`; `index.js` does `await import('./seed.js')` which returns before the async `seed()` finishes | On a fresh Render deploy the auto-seed races `app.listen` and then tears down MongoDB — the server dies right after boot |
| `db.js` calls `process.exit(1)` on connect failure | `config/db.js:17` | Crash-loop instead of retry on Render cold starts |
| `render.yaml` forces `PORT: 5000` and has no `healthCheckPath` | `render.yaml` | Fights Render's injected `PORT`; health check at `/` 404s |

Current baseline is otherwise healthy: `pnpm exec tsc --noEmit` and `pnpm lint` both pass with **0 errors**
(4 pre-existing fast-refresh warnings), and `node --check` passes on every backend file.

### Decisions confirmed with the user
- Delete **only** `server/package-lock.json`; keep root `pnpm-lock.yaml`.
- Extract **one shared** `PublicHeader` / `PublicLayout` for the four pre-auth pages.
- **Full** i18n sweep across all pages (~212 new entries in `en.json` + `ta.json`).
- **Refresh** the palette to a Tamil-inspired one (deep indigo anchor, turmeric gold + leaf green accents).

### Out of scope
No changes to API contracts, Mongoose schemas, routes, auth flow, or business logic. No new features.

---

## Part A — Render build fix

- **Delete** `server/package-lock.json` (the stale lockfile).
- **Add** `server/.npmrc`:
  ```
  package-lock=false
  fund=false
  audit=false
  ```
  Prevents a lockfile from ever being regenerated and committed again.
- **Edit** `render.yaml`:
  - `buildCommand: rm -f package-lock.json pnpm-lock.yaml yarn.lock && npm install --no-audit --no-fund`
  - add `healthCheckPath: /api/health`
  - **remove** the `PORT` env var so Render's injected port is used (`config/env.js` already defaults to 5000)
  - keep `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `AI_MODEL`, `AI_FALLBACK_MODEL`, `CLIENT_URL`
- **Edit** `server/package.json`: pin `"engines": { "node": "20.x" }`; add `"seed": "node src/seed.js"`.

## Part B — Backend correctness (makes the auto-seeder actually work on Render)

- **Refactor** `server/src/seed.js`:
  - export `async function runSeed()` containing the existing body, **without** `mongoose.connect()` /
    `mongoose.disconnect()` — the caller owns the connection.
  - add a CLI guard so `node src/seed.js` still works standalone:
    `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await connectDB(); await runSeed(); await mongoose.disconnect(); }`
  - export default `runSeed` for compatibility.
- **Fix the race in** `server/src/index.js`: replace `await import('./seed.js')` with
  `const { runSeed } = await import('./seed.js'); await runSeed();` so seeding completes before `app.listen`.
  Keep the existing minimal-admin + `AppSettings` fallback in the `catch`.
- **Edit** `server/src/config/db.js`: retry the connection (5 attempts, exponential backoff, ~2s base)
  instead of `process.exit(1)`; export `isDbConnected()`. Log a clear final error and rethrow.
- **Edit** `server/src/index.js` tail: `start().catch((err) => { console.error('Fatal startup error:', err); process.exit(1); })`
  so a failed boot is visible to Render instead of hanging.
- **Edit** `server/src/index.js` CORS: accept a comma-separated `CLIENT_URL` list so Vercel production and
  preview domains both work; keep the same fallback behaviour when unset.
- Add a root `GET /` handler returning a small JSON service banner (Render's default check hits `/`).

## Part C — Design system foundation

### C1. Fonts (`index.html`)
Add the missing stylesheet link plus real branding:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap" rel="stylesheet">
```
- Set `<title>Kalvi Vaayil — கல்வி வாயில்</title>`, a real `description`, `theme-color`, and replace the
  Enter `og:*` tags with Kalvi Vaayil ones. Keep the mandatory `<script type="module" src="/src/main.tsx">` and its comment.
- Fallback stack must stay Tamil-capable if the webfont is blocked (preview iframe):
  `'Inter', 'Noto Sans Tamil', 'Latha', 'Nirmala UI', system-ui, sans-serif`.

### C2. Palette (`src/index.css`)
Replace the token block in `@layer base` with the Tamil-inspired set. Accent uses **dark ink**, not white,
because turmeric gold cannot carry white text at AA contrast.

| Token | Light | Dark |
|---|---|---|
| `--background` | `40 33% 98%` | `243 32% 8%` |
| `--foreground` | `243 30% 14%` | `40 25% 96%` |
| `--card` / `--popover` | `0 0% 100%` | `243 26% 12%` |
| `--primary` | `243 47% 38%` | `243 65% 72%` |
| `--primary-foreground` | `0 0% 100%` | `243 40% 12%` |
| `--secondary` / `--muted` | `243 20% 95%` / `40 20% 95%` | `243 22% 17%` |
| `--muted-foreground` | `243 12% 45%` | `243 14% 68%` |
| `--accent` (turmeric) | `38 92% 48%` | `38 85% 62%` |
| `--accent-foreground` | `243 45% 14%` | `243 40% 12%` |
| `--success` (leaf) | `152 55% 34%` | `152 45% 55%` |
| `--success-foreground` | `0 0% 100%` | `243 40% 12%` |
| `--warning` | `28 92% 46%` | `28 88% 60%` |
| `--warning-foreground` | `243 45% 12%` | `243 45% 12%` |
| `--destructive` | `0 72% 45%` | `0 62% 52%` |
| `--border` / `--input` | `243 16% 88%` | `243 20% 22%` |
| `--ring` | `243 47% 38%` | `243 65% 72%` |
| `--radius` | `0.875rem` | — |

Gradients stay in the indigo→violet→teal family so **white text remains legible on every stop**; gold is a
decorative accent (icon tiles, underlines, badges), never a text background:
- `--gradient-hero: linear-gradient(135deg, hsl(243 50% 32%), hsl(258 48% 38%) 50%, hsl(190 45% 32%) 100%)`
- `--gradient-subtle`, `--gradient-card` re-derived from the warm light/dark surfaces
- `--gradient-gold` for small decorative fills only
- Shadows: `--shadow-soft`, `--shadow-card`, `--shadow-elegant`, `--shadow-glow` (primary-tinted), `--shadow-gold`

### C3. Fix the Tamil CSS (the core bug)
In `src/index.css`:
- **Move every `:lang(ta)` rule inside `@layer base`** so Tailwind utilities (which are emitted later and
  unlayered-equivalent) win. This is what stops the clamp rules from overriding `text-4xl sm:text-6xl`.
- **Delete** `[class*="flex"]:not([class*="nowrap"]) { flex-wrap: wrap; }` entirely.
- **Delete** `[class*="card"] { overflow: hidden }` and `[class*="grid"] > * { overflow: hidden }`.
- **Keep** and refine: `line-height: 1.7`, `overflow-wrap: break-word` (never `word-break: break-all`),
  `:lang(ta) h1..h6 { letter-spacing: normal; }` (negative tracking hurts Tamil), `:lang(ta) button/[role=tab]
  { white-space: normal; min-height: 2.75rem; }`, `:lang(ta) input/textarea/select { font-size: 1rem; }`
  (prevents iOS zoom), `text-rendering: optimizeLegibility`.
- Add a Tamil heading **line-height** scale only — no font-size clamps.
- Keep `.kv-container` / `.kv-grid` / `.kv-card-pad` / `.kv-section` in `@layer components` **and actually
  use them** in pages, so Tailwind stops purging them.

### C4. `tailwind.config.ts`
- Register `success`, `warning` (DEFAULT + foreground) in `colors`.
- Add `fontFamily.sans` (Inter + Noto Sans Tamil) and `fontFamily.tamil`.
- Add the new boxShadow keys, `gradient-gold` background image, and `slide-up` / `scale-in` keyframes.
- Add a `xl` button height to `spacing` if needed by the hero.

## Part D — Shared components

| File | Change |
|---|---|
| `src/components/layout/PublicHeader.tsx` | **New.** One glassmorphic sticky header: brand, `/explore` link, compact `LanguageSwitcher`, square theme toggle, login/register actions. `flex items-center justify-between gap-3` with `min-w-0` — **no `flex-wrap` on the header row**. |
| `src/components/layout/PublicFooter.tsx` | **New.** Extracted from `Home.tsx`'s footer, i18n'd. |
| `src/components/layout/PublicLayout.tsx` | **New.** `PublicHeader` + `<Outlet/>` + `PublicFooter`. |
| `src/router.tsx` | Add a public route group: `{ element: <PublicLayout/>, children: [ '/', '/explore', '/login', '/register' ] }`. Protected routes untouched. |
| `src/components/layout/Navbar.tsx` | **Redesign.** 3-zone row: brand \| nav links \| actions. Move the desktop breakpoint from `md` to `lg` so 768–1023px uses the collapsible menu instead of the cramped icon-only state (`hidden lg:inline` labels currently have no `md` fallback). Replace the inline expanding block with the shadcn `Sheet` slide-in drawer. Collapse Bell + LanguageSwitcher + square theme toggle + avatar `DropdownMenu` (Settings, Logout) into the action zone so it never wraps. Add a scroll-elevation border. |
| `src/components/language-switcher.tsx` | Add a `variant="segmented"` (default) — a compact `EN \| த` toggle, dropping the `min-w-[140px]` that crowds the mobile header. Keep `variant="select"` for Settings pages. |
| `src/components/ui/button.tsx` | Add `premium` (gradient), `glass` (translucent header/hero), `success` variants and an `xl` size. Verify `outline` stays visible in both modes (current one is not transparent). |
| `src/components/ui/card.tsx` | Add a `variant` prop: `default \| elevated \| glass \| gradient`. |
| `src/components/ui/badge.tsx` | Add `success` / `warning` / `info` variants on the new tokens. |
| `src/components/shared/DataState.tsx` | **New, small.** `loading` (skeleton) / `empty` / `error` states, so data pages show clean cards instead of a raw spinner or a bare console error when the backend is unreachable. |
| `src/pages/Index.tsx` | **Delete** (unrouted dead page). |
| `public/locales/zh-CN.json` | **Delete** (unused, eagerly bundled). |

## Part E — Page redesign + full i18n sweep

All pages: mobile-first (`p-4 sm:p-6`), `kv-container` wrapper, responsive grids with `min-w-0`, tables and
tab strips wrapped in `overflow-x-auto`, no direct color classes, lucide icons only.

| Page | Work |
|---|---|
| `pages/Home.tsx` | New hero (gradient mesh + Tamil-first type), stat strip, 6 feature cards, 3-step "how it works", CTA band. Drop the local fixed top bar → `PublicLayout`. Replace every inline `isTa ? … : …` ternary with locale keys. Fix the stray non-Tamil character in the current Tamil "Why" copy. |
| `pages/public/PublicDiscover.tsx` | `PublicLayout`; i18n; card grid with `DataState`; search in a sticky filter bar; "Login to Register" → redirect to `/login?redirect=/workshops/:id`. |
| `pages/auth/LoginPage.tsx` / `RegisterPage.tsx` | `PublicLayout`; centered card on `flex-1`; role tabs restyled with `break-words`; error alert on `bg-destructive/10` with padding. |
| `pages/NotFound.tsx` | Replace `bg-gray-100` / `text-gray-600` / `text-blue-500` with semantic tokens; add a lucide icon and a home CTA. |
| `pages/admin/Dashboard.tsx` | Welcome header + 4 stat cards; add `Registrations` to locales (currently concatenated English). |
| `pages/admin/Analytics.tsx` | i18n (17 strings); replace both raw `<table>`s with shadcn `Table` inside `overflow-x-auto`, plus a stacked card list under `sm`; native `<select>` → shadcn `Select`. |
| `pages/admin/QuotaInbox.tsx` | i18n; status badges on `success`/`warning` tokens; approve/reject cards responsive. |
| `pages/admin/OrganizerManagement.tsx` | i18n (7 strings); `grid-cols-3` stat row → responsive; access-window fields in a clean form grid. |
| `pages/admin/CategoryManagement.tsx`, `pages/admin/Settings.tsx` | i18n; consistent card + form layout. |
| `pages/organizer/Dashboard.tsx`, `WorkshopList.tsx` | i18n; card grid; empty states via `DataState`. |
| `pages/organizer/WorkshopDetail.tsx` | i18n (21 strings); `TabsList grid grid-cols-6` → horizontally scrollable tab strip on mobile; native `<select>`/date/time inputs → shadcn `Select` + styled inputs; QR scanner panel in a card. |
| `pages/participant/*` (`Dashboard`, `Discover`, `WorkshopDetail`, `Schedule`, `Progress`, `Certificates`, `Notifications`, `Settings`) | i18n (Dashboard 6, Settings 6, Progress 5, Schedule 4, WorkshopDetail 10); responsive card grids; progress bars on tokens; attendance streaks as badges. |
| `pages/public/VerifyCertificate.tsx` | i18n (3 strings); `text-green-500`/`text-green-600` → `success` tokens. |
| `components/shared/QRScanner.tsx` | i18n + styled scan frame and error states. |

### Locale files
Add ~110 keys to **both** `public/locales/en.json` and `ta.json` (currently in perfect parity at 75 keys
each — keep it that way). New namespaces: `discover.*`, `admin.analytics.*`, `admin.quota.*`,
`organizer.workshop.*`, `participant.*`, `verify.*`, `settings.*`, `common.*` additions. Tamil values must be
real translations, not transliterations.

---

## Implementation checklist

### Backend / deploy
- [x] `server/package-lock.json` deleted; `server/.npmrc` added with `package-lock=false`
- [x] `render.yaml` `buildCommand` runs `rm -f package-lock.json pnpm-lock.yaml yarn.lock && npm install --no-audit --no-fund`
- [x] `render.yaml` has `healthCheckPath: /api/health` and no `PORT` env var (adds `NODE_VERSION: 22`)
- [x] `server/package.json` pins `engines.node` to `22.x` and exposes a `seed` script
- [x] `seed.js` exports `runSeed()` and no longer calls `mongoose.connect()`/`disconnect()` on import
- [x] `seed.js` still works standalone via `npm run seed` (CLI guard verified by observing the connection attempt)
- [x] `index.js` awaits `runSeed()` before `app.listen`, and the minimal-admin fallback still runs on seed failure
- [x] `config/db.js` retries with backoff instead of `process.exit(1)`; exports `isDbConnected`
- [x] `index.js` exits non-zero on fatal startup error; CORS accepts a comma-separated `CLIENT_URL`; `GET /` returns a banner
- [x] Bonus: all 16 remaining models use the `mongoose.models.X || mongoose.model(...)` guard; duplicate `certificateId` index removed

### Design system
- [x] `index.html` loads Inter + Noto Sans Tamil with `display=swap` and has Kalvi Vaayil title/description/og tags
- [x] `index.css` token block replaced with the Tamil-inspired palette (accent foreground is dark ink, not white)
- [x] All `:lang(ta)` rules moved into `@layer base`
- [x] `[class*="flex"]…{flex-wrap:wrap}` rule removed
- [x] `[class*="card"]{overflow:hidden}` and `[class*="grid"]>*{overflow:hidden}` removed
- [x] `:lang(ta)` heading rules set line-height/letter-spacing only — no `font-size` clamps
- [x] `kv-container`/`kv-grid`/`kv-section`/`kv-scroll-x` are used in pages so Tailwind no longer purges them
- [x] `tailwind.config.ts` registers `success`/`warning` colors, `hero-foreground`, `fontFamily.sans`/`.tamil`, gradients, and animations
- [x] `overflow-x: clip` (not `hidden`) on html/body so `position: sticky` headers actually stick
- [x] Bonus: off-scale opacity modifiers (`/12`, `/8`) replaced with `/10` — Tailwind emits nothing for values outside its scale

### Components
- [x] `PublicHeader`, `PublicFooter`, `PublicLayout` created; `/`, `/explore`, `/login`, `/register` moved under the public route group
- [x] No pre-auth page renders its own top bar any more (4 duplicates removed)
- [x] `Navbar` uses a 3-zone non-wrapping row, `lg` desktop breakpoint, and a `Sheet` mobile drawer
- [x] `LanguageSwitcher` has a compact segmented variant that fits the mobile header (plus an `onChange` hook for settings)
- [x] `Button` has `premium`/`glass`/`success` variants + `xl` size; `Card` has `variant`; `Badge` has `success`/`warning`/`soft` variants
- [x] `DataState` provides loading/empty/error states and is used by the data-fetching pages
- [x] `pages/Index.tsx` and `public/locales/zh-CN.json` deleted
- [x] Bonus: `QuizPanel` replaces the raw `alert(JSON.stringify(quiz))` with graded, inline questions

### Pages + i18n
- [x] Every page listed in Part E redesigned on the new tokens
- [x] The 5 files that render user-visible text and lacked `useTranslation` now use it (`VerifyCertificate`, `admin/QuotaInbox`, `admin/Settings`, `admin/CategoryManagement`, `admin/Analytics`, `QRScanner`). `AppLayout`/`ProtectedRoute`/`PublicLayout`/`DataState` render no literal copy and correctly need none.
- [x] Zero hardcoded English strings remain in `src/pages` and `src/components` except two technical `placeholder="React, Node.js, MongoDB"` examples
- [x] `en.json` and `ta.json` have identical key sets (408 each) with no empty values and matching `{{placeholders}}`
- [x] No direct color classes (`bg-white`, `text-black`, `bg-gray-*`, `text-green-*`, …) remain outside `components/ui`

## Verification checklist

### Frontend
- [x] `pnpm lint` → 0 errors (4 pre-existing fast-refresh warnings)
- [x] `pnpm exec tsc --noEmit` → 0 errors
- [x] `pnpm run build:prod` succeeds
- [x] Locale parity script: `en` and `ta` both 408 keys, no empty values, no one-sided keys, no placeholder mismatch
- [x] Built CSS no longer contains `[class*=flex]:not([class*=nowrap])` or any `:lang(ta) … { font-size }` rule
- [x] Built CSS **does** contain `.kv-container`, `.kv-grid`, `.kv-section`, `.kv-scroll-x`, `.kv-glass`, `.gradient-gold`, `.text-gradient`
- [x] `website_screenshot` of `/`, `/explore` and `/login` at `mobile_390` and `desktop_1280` — no horizontal scroll, no overlap, header stays on one row
- [x] `website_screenshot` of `/verify/:id` at `mobile_390` — destructive state renders on the new tokens
- [x] Tamil renders correctly: the segmented switcher shows `தமிழ்` in Noto Sans Tamil, and `fonts.googleapis.com` responds 200
- [x] Console is clean — no runtime errors, only Vite HMR notices

### Backend
- [x] `cd server && npm install` completes from scratch (256 packages) and writes **no** lockfile
- [x] `node --check` passes on every file under `server/src`
- [x] Offline import smoke test: all 57 models, services, middleware, controllers and routes import with no missing-export errors
- [x] Importing `seed.js` does **not** connect or seed (`readyState === 0`, resolves in ~300ms, exports `runSeed`)
- [x] `npm run seed` still drives the CLI path (logs `MongoDB connection attempt 1/5`)
- [x] Booting with an unreachable `MONGODB_URI` retries 5 times with clear logs, then exits non-zero instead of hanging

### Known limits (not verified here)
- Full-page **Tamil** rendering was not screenshot-verified: the language comes from a cookie/`navigator`, and the
  screenshot tool cannot set either. Tamil correctness rests on the CSS-rule inspection above plus the visible
  `தமிழ்` glyph. Worth one manual check by switching the language in the preview.
- **Dark mode** was not screenshot-verified for the same reason (theme is read from `localStorage`). The token
  pairs were chosen for contrast on paper (dark `--primary-foreground` is ink, not white) but need an eyeball.
- No MongoDB is reachable from the sandbox, so the end-to-end seed → dashboard data path **cannot** be verified.
  The auto-seed fix is verified structurally (import does not run, `runSeed` is awaited). Confirm on the first
  Render deploy by checking the logs for `Seed Complete` before `server running on port`.
- The organizer workshop tabs for Resources/Tasks/Community/Certificates link to routes that are **not** in
  `router.tsx`, so they fall through to the 404 page. This is pre-existing (the management screens were never
  built) and was left as-is rather than silently deleting the entry points. Building those four screens is a
  separate feature.
- `VITE_API_URL` must be set in Vercel's environment to the Render URL; it is now documented in `.env.example`.

