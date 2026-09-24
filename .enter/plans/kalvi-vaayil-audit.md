# Kalvi Vaayil — Full Codebase Verification Audit Plan

## Context

The Kalvi Vaayil LMS is a bilingual (EN/TA) workshop management platform with React frontend + Node.js/Express backend + MongoDB. A recent series of commits added 11 feature suites (auth, governance, workshops, sessions, attendance/QR, waitlist, quiz/AI, certificates, feedback, notifications, i18n). This audit verifies that every route, import, model schema, and UI component is correctly wired and free of bugs.

## Bugs Found During Exploration

### Bug 1: Presence challenge route method mismatch (CRITICAL)
- **File**: `src/components/shared/AntiIdlePresence.tsx` line 88
- **Issue**: Frontend calls `api.get('/presence/session/${sessionId}/challenge')` (GET), but backend `server/src/routes/presence.js` line 8 defines `router.post('/session/:sessionId/challenge', ...)` (POST).
- **Fix**: Add a GET route for polling in `routes/presence.js`, since the frontend polls for challenges. The POST route can remain for creating challenges.

### Bug 2: Feedback summary route path error (CRITICAL)
- **File**: `src/pages/organizer/WorkshopDetail.tsx` line 87
- **Issue**: Calls `api.get('/feedback/workshops/${id}/feedback/summary')` which resolves to `/api/feedback/workshops/${id}/feedback/summary`. But the backend mounts feedback routes at `/api` with path `/workshops/:workshopId/feedback/summary`, making the correct URL `/api/workshops/${id}/feedback/summary`. The extra `/feedback` prefix causes a 404.
- **Fix**: Change to `api.get('/workshops/${id}/feedback/summary')`.

### Bug 3: Seed GatePass schema mismatch (CRITICAL)
- **File**: `server/src/seed.js` lines 458-463
- **Issue**: Creates GatePass with `{ qrToken, expiresAt }` but the GatePass model uses `token` (not `qrToken`) and has no `expiresAt` field. The `token` field is required and `qrToken` would be silently ignored.
- **Fix**: Use `token` field and remove `expiresAt`. Generate a proper JWT token using `generateToken()`.

### Bug 4: OrganizerSettings TypeScript type incomplete (TYPE ERROR)
- **File**: `src/types/index.ts` lines 17-24
- **Issue**: Missing `maxWorkshopsLimit`, `maxParticipantsPerWorkshop`, `canHostPhysicalEvents`, `rating`, `totalRatings` fields. `OrganizerManagement.tsx` references `settings?.maxWorkshopsLimit` and `settings?.maxParticipantsPerWorkshop` which are not in the type.
- **Fix**: Add the missing fields to the `OrganizerSettings` interface.

### Bug 5: GatePassScanner `result` state untyped (TYPE ERROR)
- **File**: `src/pages/organizer/GatePassScanner.tsx` line 13
- **Issue**: `useState(null)` infers type `null`, causing TS errors when accessing `result.success`, `result.data`, etc.
- **Fix**: Add a proper type annotation for the result state.

## Implementation Checklist

### Static Checks
- [ ] Run `pnpm exec tsc --noEmit` — confirm 0 errors after fixes
- [ ] Run `pnpm lint` — confirm 0 errors
- [ ] Run `pnpm run build:prod` — confirm clean production bundle
- [ ] Run `node --check` on all backend JS files

### Bug Fixes
- [ ] **Fix Bug 1**: Add GET route for presence challenge polling in `server/src/routes/presence.js`
- [ ] **Fix Bug 2**: Correct feedback summary API path in `src/pages/organizer/WorkshopDetail.tsx`
- [ ] **Fix Bug 3**: Fix GatePass seed data to use correct schema fields in `server/src/seed.js`
- [ ] **Fix Bug 4**: Add missing fields to `OrganizerSettings` TypeScript interface in `src/types/index.ts`
- [ ] **Fix Bug 5**: Add type annotation for `result` state in `src/pages/organizer/GatePassScanner.tsx`

### Route & Endpoint Parity Verification
- [ ] Confirm `GET /admin/categories` is accessible to authenticated non-admin users (organizers) — verified: declared BEFORE `router.use(authenticate, rbac('admin'))`
- [ ] Confirm `GET /sessions/today` is declared BEFORE `GET /sessions/:id` — verified: line 8 vs line 10
- [ ] Confirm `GET /auth/portfolio/:username` is public (no auth) — verified: line 9, no middleware
- [ ] Confirm `/verify/:certificateId` returns `certificateId` and workshop metadata — verified: certificateController.js lines 199-205
- [ ] Confirm all frontend API calls match backend routes (after bug fixes)

### Schema Verification
- [ ] GatePass: only inline `unique: true` on `token`, no duplicate index — verified
- [ ] User: `username` field with `unique: true, sparse: true` — verified
- [ ] Workshop: `attendanceSettings`, `quiz`, `passingScore` — verified
- [ ] Session: `resources` subdocument array — verified
- [ ] OrganizerSettings: `maxWorkshopsLimit`, `maxParticipantsPerWorkshop` — verified

### Feature Suite Verification (11 suites)
- [ ] **1. Auth & Portfolios**: JWT flow, public portfolio route, skill badges, LinkedIn links — all wired
- [ ] **2. Organizer Governance**: Physical permission toggle, governance limits enforced in `createWorkshop`, editable in `OrganizerManagement.tsx` — all wired
- [ ] **3. Workshop Management**: Category selector from public `/categories`, online/physical/hybrid modes, gallery, cancellation modal — all wired
- [ ] **4. Session Management**: CRUD with delete confirmation, TodaysSessionsWidget, resource locker, calendar integration — all wired
- [ ] **5. Attendance/QR/Anti-Idle**: GatePass QR generation, Web Audio beep, CSV import gated to online/hybrid, anti-idle presence tracking — all wired (after Bug 1 fix)
- [ ] **6. Waitlist & Registration**: Capacity checks, registration flow, waitlist auto-promotion — all wired
- [ ] **7. Quiz & AI Evaluation**: MCQ quiz form, AI Evaluation modal via Groq API — all wired
- [ ] **8. Certificates**: Auto-approval engine, public verification, LinkedIn integration, print/PDF — all wired
- [ ] **9. Feedback & Leaderboard**: Star rating, feedback analytics with distribution chart, leaderboard tab — all wired (after Bug 2 fix)
- [ ] **10. Browser Notifications**: Notification utility, settings toggle, automated alerts — all wired
- [ ] **11. Bilingual i18n & Seeder**: 575 keys parity confirmed, seeder populates all demo data — all wired (after Bug 3 fix)

## Verification Checklist

### Positive checks
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm run build:prod` exits 0
- [ ] All 5 bug fixes applied and verified in code

### Negative/default checks
- [ ] No broken imports across all React components
- [ ] No TDZ violations in useEffect hooks
- [ ] No route path mismatches between frontend and backend

### Boundary checks
- [ ] Seed script runs without schema errors
- [ ] All i18n keys resolve (575/575 parity)
- [ ] Public routes work without authentication

## Critical Files to Modify

1. `server/src/routes/presence.js` — add GET challenge route
2. `src/pages/organizer/WorkshopDetail.tsx` — fix feedback summary API path
3. `server/src/seed.js` — fix GatePass seed schema
4. `src/types/index.ts` — add missing OrganizerSettings fields
5. `src/pages/organizer/GatePassScanner.tsx` — add result state type
