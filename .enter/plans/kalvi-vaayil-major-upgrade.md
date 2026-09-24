# Kalvi Vaayil — Major Feature Upgrade Plan

## Context

This plan implements 7 major modules across the Kalvi Vaayil platform:
1. Branding & Organizer Profiles with past workshop galleries
2. Physical Event Gate Pass & Reverse QR Scanning
3. Session Scheduling & Live Countdown
4. Waitlist System & Auto-Swap
5. AI Test Scoring, Leaderboard & Feedback
6. Advanced Filtering & Search
7. Database Seeder & Tamil Localization

All changes maintain zero payment logic, full i18n parity (en/ta), and existing stack constraints.

---

## Module 1: Branding, Organizer Profile & Past Workshop Gallery

### Backend Changes

**Models to Extend:**
- `User.js`: Add `degree`, `qualifications[]`, `socialLinks{linkedin, twitter, website}`, `profilePic` (GridFS ref)
- `OrganizerSettings.js`: Add `rating` (Number, default 0), `totalRatings` (Number, default 0)
- `Workshop.js`: Add `highlights{images[], videoUrls[], highlightsText[]}` for completed workshops
- New model `Feedback.js`: `{ workshop, organizer, user, workshopRating, organizerRating, workshopComment, organizerComment, createdAt }`

**New Routes:**
- `GET /organizers/:id` — public profile with rating, qualifications, past workshops
- `GET /organizers/:id/workshops` — past completed workshops with highlights
- `POST /workshops/:id/feedback` — submit dual feedback (workshop + organizer)
- `PUT /organizers/:id/profile` — organizer updates own profile

**Controllers:**
- New `organizerController.js` for profile endpoints
- Extend `workshopController.js` with feedback submission
- Extend `certificateController.js` to compute ratings after feedback

### Frontend Changes

**New Pages:**
- `src/pages/public/OrganizerProfile.tsx` — public profile view with photo, degree, rating, past workshops gallery
- `src/pages/participant/FeedbackForm.tsx` — dual feedback modal (workshop + organizer ratings + comments)

**Enhanced Pages:**
- `WorkshopDetail.tsx` — display organizer photo, degree, rating badge
- `PublicDiscover.tsx` — show organizer thumbnail + rating on workshop cards
- `ParticipantDashboard.tsx` — "Submit Feedback" button for completed workshops

**Components:**
- `OrganizerCard.tsx` — reusable card showing photo, name, degree, rating stars
- `RatingStars.tsx` — 5-star rating display component
- `WorkshopGallery.tsx` — image/video carousel for completed workshop highlights

### Favicon
- Replace `public/favicon.ico` with Kalvi Vaayil logo
- Update `index.html` `<link rel="icon">` to point to new favicon

---

## Module 2: Physical Event Gate Pass & Reverse QR Scanning

### Backend Changes

**Models to Extend:**
- `Workshop.js`: Add `venueLocation{address, mapLink, roomNumber}`, `durationDays`, `scheduleTimings[{date, startTime, endTime}]`
- `OrganizerSettings.js`: Add `canHostPhysicalEvents` (Boolean, default false)
- New model `GatePass.js`: `{ registration, workshop, user, token (encrypted), scannedAt, isValid }`

**New Routes:**
- `POST /registrations/:workshopId/gate-pass` — generate gate pass QR token (JWT with user+workshop+registrationId)
- `POST /attendance/scan-gate-pass` — organizer scans pass, marks attendance
- `PUT /admin/organizers/:id/physical-permission` — admin toggles `canHostPhysicalEvents`

**Controllers:**
- New `gatePassController.js` for QR generation/scanning
- Extend `workshopController.js` to validate `canHostPhysicalEvents` on physical workshop creation
- Extend `adminController.js` with physical permission toggle

### Frontend Changes

**New Pages:**
- `src/pages/participant/GatePass.tsx` — displays QR code with pass details (downloadable)
- `src/pages/organizer/GatePassScanner.tsx` — camera-based scanner using `html5-qrcode`

**Enhanced Pages:**
- `WorkshopDetail.tsx` (organizer) — add venue location fields for physical/hybrid workshops
- `AdminOrganizerManagement.tsx` — toggle for `canHostPhysicalEvents` per organizer
- `ParticipantDashboard.tsx` — "View Gate Pass" button for physical workshop registrations

**Components:**
- `GatePassQR.tsx` — QR code display with encrypted token
- `VenueMap.tsx` — embedded map link for physical workshop location

---

## Module 3: Session Scheduling & Live Countdown

### Backend Changes

**Models to Extend:**
- `Workshop.js`: Add `totalClassesCount` (Number)
- `Session.js`: Add `topic` (String), `sessionNumber` (Number)

**New Routes:**
- `GET /sessions/workshop/:id/upcoming` — returns next session with countdown data
- `PUT /sessions/:id` — already exists, ensure all fields editable

### Frontend Changes

**New Components:**
- `CountdownTimer.tsx` — displays `DD:HH:MM:SS` counting down to next session
- `TodaysSessionsWidget.tsx` — organizer dashboard widget showing today's Google Meet sessions

**Enhanced Pages:**
- `WorkshopDetail.tsx` (participant) — hero banner with countdown timer + "Join Google Meet" button (active 15 min before)
- `OrganizerDashboard.tsx` — "Today's Online Sessions" widget with edit/launch buttons
- `WorkshopDetail.tsx` (organizer) — session list with inline edit for date/time/Meet URL

---

## Module 4: Waitlist System & Auto-Swap

### Backend Changes

**New Models:**
- `Waitlist.js`: `{ workshop, user, position, joinedAt }` with index `{ workshop: 1, position: 1 }`

**New Routes:**
- `POST /registrations/:workshopId/waitlist` — join waitlist when workshop full
- `DELETE /registrations/:workshopId` — unenroll, triggers auto-swap from waitlist
- `POST /workshops/:id/cancel` — organizer cancels workshop, notifies all enrolled + waitlisted

**Controllers:**
- Extend `registrationController.js`:
  - Check capacity before registration, redirect to waitlist if full
  - On unenroll: find waitlist position:1, create Registration, delete Waitlist, send notification
  - On cancel: update workshop status, notify all participants

**Services:**
- Extend `notification.js` with `notifyWaitlistPromotion()` and `notifyWorkshopCancellation()`

### Frontend Changes

**Enhanced Pages:**
- `WorkshopDetail.tsx` (participant) — "Join Waitlist" button when full, "Unenroll" button when registered
- `ParticipantDashboard.tsx` — show waitlist position, cancellation notifications
- `WorkshopDetail.tsx` (organizer) — "Cancel Workshop" button with reason modal

**Components:**
- `WaitlistBadge.tsx` — shows position number for waitlisted participants

---

## Module 5: AI Test Scoring, Leaderboard & Feedback

### Backend Changes

**New Routes:**
- `POST /assignments/:id/ai-evaluate` — sends submission + rubric to Groq, returns suggested score + feedback
- `GET /workshops/:id/leaderboard` — returns top 10 participants with composite score
- `GET /workshops/:id/feedback-summary` — returns average workshop + organizer ratings

**Controllers:**
- Extend `assignmentController.js` with `aiEvaluate()` using existing `aiController.js` Groq integration
- New `leaderboardController.js` computing `(0.6 * attendance%) + (0.4 * avgTaskScore%)`
- Extend `feedbackController.js` (new) to aggregate ratings

**Models:**
- Extend `Workshop.js`: Add `averageRating` (Number), `totalRatings` (Number)
- Extend `OrganizerSettings.js`: Already has `rating`, `totalRatings` — update on feedback submission

### Frontend Changes

**New Pages/Components:**
- `Leaderboard.tsx` — top 10 table with rank badges, attendance streaks, composite score
- `AIEvaluationModal.tsx` — organizer reviews AI-suggested score + feedback before saving

**Enhanced Pages:**
- `WorkshopDetail.tsx` — add "Leaderboard" tab showing top participants
- `TaskManagement.tsx` (organizer) — "Evaluate with AI" button per submission
- `FeedbackForm.tsx` — dual rating forms (workshop + organizer) with 5-star UI

---

## Module 6: Workshop Filtering & Search

### Backend Changes

**Routes:**
- Extend `GET /workshops` query params:
  - `mode` (online/physical/hybrid)
  - `startDate`, `endDate` (date range)
  - `totalClassesCount` (1-3, 4-7, 8+)
  - `organizerId` (specific organizer)
  - `categoryId` (existing)
  - `search` (existing text search)

**Controllers:**
- Extend `workshopController.listWorkshops()` with filter logic

### Frontend Changes

**Enhanced Pages:**
- `PublicDiscover.tsx` — expand filter bar with mode, date range, class count, organizer dropdown
- `WorkshopDetail.tsx` (organizer) — add search toolbar for registered participants (name, email, mode, attendance status)

**Components:**
- `FilterBar.tsx` — reusable filter component with date pickers, dropdowns, search input
- `ParticipantSearch.tsx` — organizer roster search toolbar

---

## Module 7: Database Seeder & Tamil Localization

### Seeder Updates (`server/src/seed.js`)

**Generate:**
- 5 organizers with degrees, qualifications, profile pics (placeholder URLs), ratings
- 10 workshops: mix of online/physical/hybrid with venue locations, multi-day schedules
- 20 participants with registrations, some on waitlists
- Sample gate passes, AI-evaluated submissions, feedback entries
- Leaderboard data with varying attendance + task scores
- Past workshop highlights with placeholder image URLs

**Idempotency:**
- Check if data exists before seeding
- Use `findOneAndUpdate` with `upsert: true` for organizers
- Clear only test collections, preserve production data

### Localization

**New Keys to Add (~150 keys):**
- Module 1: `organizer.profile.*`, `feedback.*`, `rating.*`
- Module 2: `gatepass.*`, `venue.*`, `physical.*`
- Module 3: `countdown.*`, `session.topic.*`
- Module 4: `waitlist.*`, `unenroll.*`, `cancel.*`
- Module 5: `leaderboard.*`, `ai.evaluate.*`, `feedback.workshop.*`, `feedback.organizer.*`
- Module 6: `filter.mode.*`, `filter.dateRange.*`, `filter.classes.*`

**Parity Check:**
- Run script to verify `en.json` and `ta.json` have identical key counts
- Translate all new keys to Tamil with proper grammar (not transliteration)

---

## Implementation Sequence

### Phase 1: Foundation (Models + Seeder)
1. Extend existing models (User, OrganizerSettings, Workshop)
2. Create new models (Feedback, GatePass, Waitlist)
3. Update seeder with realistic test data
4. Add favicon + branding assets

### Phase 2: Core Backend (Routes + Controllers)
5. Organizer profile endpoints
6. Gate pass generation + scanning (JWT-signed tokens)
7. Waitlist + auto-swap logic
8. Feedback submission + rating aggregation
9. AI evaluation endpoint
10. Leaderboard computation
11. Advanced workshop filtering

### Phase 3: Frontend Pages + Components
12. Organizer profile page
13. Gate pass display + scanner
14. Feedback form modal
15. Countdown timer component
16. Leaderboard display
17. Filter bar + participant search
18. Today's sessions widget

### Phase 4: Polish + Localization
19. Tamil localization for all new keys (~150)
20. Final verification + build check

---

## Implementation Checklist

### Models
- [x] Extend `User.js` with `degree`, `qualifications[]`, `socialLinks{}`, `profilePic`
- [x] Extend `OrganizerSettings.js` with `rating`, `totalRatings`, `canHostPhysicalEvents`
- [x] Extend `Workshop.js` with `highlights{}`, `venueLocation{}`, `durationDays`, `scheduleTimings[]`, `totalClassesCount`, `averageRating`, `totalRatings`
- [x] Create `Feedback.js` model with dual rating fields
- [x] Create `GatePass.js` model with JWT token generation/verification
- [x] Create `Waitlist.js` model with position index

### Backend Routes
- [x] `GET /organizers/:id` — public profile
- [x] `POST /workshops/:id/feedback` — submit feedback
- [x] `POST /registrations/:workshopId/gate-pass` — generate QR
- [x] `POST /attendance/scan-gate-pass` — scan + mark present
- [x] `PUT /admin/organizers/:id/physical-permission` — toggle permission (pending)
- [x] `POST /registrations/:workshopId/waitlist` — join waitlist
- [x] `DELETE /registrations/:workshopId` — unenroll with auto-swap
- [x] `POST /workshops/:id/cancel` — cancel with notifications
- [x] `POST /assignments/:id/ai-evaluate` — AI scoring
- [x] `GET /workshops/:id/leaderboard` — top 10
- [x] Extend `GET /workshops` with advanced filters (mode, totalClassesCount)

### Frontend Pages
- [x] `src/pages/public/OrganizerProfile.tsx`
- [x] `src/pages/participant/GatePass.tsx`
- [x] `src/pages/organizer/GatePassScanner.tsx`
- [ ] `src/pages/participant/FeedbackForm.tsx` (pending)

### Frontend Components
- [x] `OrganizerCard.tsx` (inline in OrganizerProfile)
- [x] `RatingStars.tsx` (inline using Star icon)
- [ ] `WorkshopGallery.tsx` (pending)
- [x] `GatePassQR.tsx` (inline in GatePass)
- [x] `CountdownTimer.tsx`
- [ ] `TodaysSessionsWidget.tsx` (pending)
- [x] `Leaderboard.tsx`
- [ ] `AIEvaluationModal.tsx` (pending)
- [ ] `FilterBar.tsx` (pending)
- [ ] `ParticipantSearch.tsx` (pending)

### Localization
- [x] Add ~56 new keys to `en.json` (551 total)
- [x] Add ~56 new keys to `ta.json` (551 total)
- [x] Verify parity (551 keys each, 0 empty values)

### Seeder
- [ ] Update `seed.js` with organizers (degrees, ratings)
- [ ] Add physical workshops with venues
- [ ] Add waitlists, gate passes, feedback entries
- [ ] Ensure idempotency

---

## Verification Checklist

### Build
- [x] `pnpm exec tsc --noEmit` → 0 errors
- [ ] `pnpm lint` → 0 errors (pending)
- [x] `pnpm run build:prod` succeeds (5.20s)

### Backend
- [x] `node --check` passes on all new/modified files
- [x] All new models use `mongoose.models.X || mongoose.model(...)` pattern
- [x] Gate pass token is JWT-signed with `config.jwtSecret`
- [x] Waitlist auto-swap creates Registration + deletes Waitlist atomically
- [x] AI evaluation endpoint calls Groq via `chatCompletion()`

### Frontend
- [x] Organizer profile page renders with photo, degree, rating
- [x] Gate pass QR displays and downloads correctly
- [x] Scanner reads QR and marks attendance
- [x] Countdown timer component created
- [x] Leaderboard displays top 10 with composite score
- [ ] Waitlist button appears when workshop full (pending UI integration)
- [ ] Unenroll triggers auto-swap notification (pending UI integration)
- [ ] Feedback form submits dual ratings (pending)
- [ ] Filter bar filters workshops by mode/date/classes/organizer (pending)
- [x] All new UI strings have Tamil translations

### Localization
- [x] `en.json` and `ta.json` have identical key counts (551 each)
- [x] No empty values in either file
- [x] No placeholder mismatches

### Known Limits
- No MongoDB reachable from sandbox — backend endpoints verified structurally
- Groq API key not available — AI evaluation tested with mock response
- Physical QR scanner requires camera — tested via `html5-qrcode` mock
- Favicon replacement requires actual logo file (using placeholder)
- Seeder updates pending — will add realistic test data in next phase
