# Kalvi Vaayil — Missing Features Implementation Plan

## Context

The backend already has complete route/controller/model implementations for resources, assignments, community, certificates, CSV attendance, presence checks, and notifications. What's missing is:
1. Frontend pages for 4 organizer sub-routes (currently 404)
2. Frontend participant views for resources/community/assignments
3. Three new backend endpoints: session join tracking, broadcast notifications, notification enum extensions
4. UI enhancements: live join button, resource upload with target selection, CSV import UI, anti-idle presence pings

## Implementation Plan

### Step 1: Register 4 Missing Routes + Build Organizer Pages

**Files to modify:**
- `src/router.tsx` — add 4 lazy-loaded routes under `/organizer/workshops/:id/*`
- `src/pages/organizer/ResourceManagement.tsx` — NEW
- `src/pages/organizer/TaskManagement.tsx` — NEW
- `src/pages/organizer/CommunityManagement.tsx` — NEW
- `src/pages/organizer/CertificateReview.tsx` — NEW

**ResourceManagement.tsx:**
- Fetch resources via `GET /resources/workshop/:id`
- Upload form: title, description, type (pdf/doc/link), file input (for pdf/doc), external URL (for link)
- Target selection dropdown: online/physical/all (stored in resource metadata, notifications filtered by registration.mode)
- Delete button per resource
- Download link for files

**TaskManagement.tsx:**
- Fetch assignments via `GET /assignments/workshop/:id`
- Create assignment form: title, description, dueDate, maxScore
- Score submissions: list participants, input score + feedback per participant
- Fetch scores via `GET /assignments/:assignmentId/scores`
- Submit scores via `POST /assignments/:assignmentId/score`

**CommunityManagement.tsx:**
- Fetch posts via `GET /community/workshop/:id` (organizer sees all including private)
- Reply to posts (public or private)
- Upload attachments via `POST /community/attachment`
- Delete posts

**CertificateReview.tsx:**
- Fetch review-ready certificates via `GET /certificates/workshop/:id/review`
- Display roster with attendance % and test scores
- Approve/reject buttons calling `POST /certificates/:certificateId/review`
- Approved certs trigger PDF generation + notification automatically

### Step 2: Session Join Tracking + Live Join Button

**Backend:**
- New model `SessionJoin`: `{ session, user, joinedAt }` with index `{ session: 1, user: 1 }`
- Add `POST /sessions/:id/join` endpoint in `sessionController.js`
- Endpoint creates SessionJoin document (idempotent per user per session)
- Add `GET /sessions/:id/joins` endpoint for organizer to see join count + participant list

**Frontend:**
- Add "Join Live Session" button to:
  - `src/pages/participant/Schedule.tsx` — when session is live or within 15-min window
  - `src/pages/participant/WorkshopDetail.tsx` — sessions tab
- Button calls `POST /sessions/:id/join` then opens `googleMeetLink` in new tab
- Live detection: `new Date(session.startTime) - 15*60*1000 <= now <= new Date(session.endTime)`
- Organizer WorkshopDetail.tsx sessions tab: show join count badge per session

### Step 3: Broadcast Notifications

**Backend:**
- Add `POST /workshops/:id/broadcast` endpoint in `workshopController.js` or new `broadcastController.js`
- Body: `{ message, target: 'online'|'physical'|'all' }`
- Fetch registrations filtered by `mode` (or all if target='all')
- Create `Notification` documents with type `'broadcast'`
- Add `'broadcast'` to Notification model enum

**Frontend:**
- Add "Broadcast Alert" button/modal to organizer session control panel (WorkshopDetail.tsx sessions tab)
- Modal: textarea for message, dropdown for target (online/physical/all), send button
- Calls `POST /workshops/:id/broadcast`

### Step 4: Resource Upload UI with Target Selection

**Backend:**
- Extend Resource model with `targetAudience: { type: String, enum: ['online', 'physical', 'all'], default: 'all' }`
- Modify `notifyResourceUpload` in `resourceController.js` to filter registrations by `mode` matching `targetAudience`
- Add `target` field to upload request body

**Frontend:**
- ResourceManagement.tsx already planned above includes target dropdown
- Participant WorkshopDetail.tsx resources tab: fetch and display resources filtered by user's registration mode
  - If user registered as 'online', show resources with target 'online' or 'all'
  - If user registered as 'physical', show resources with target 'physical' or 'all'

### Step 5: Community Board UI

**Backend:**
- Already complete. CommunityPost model has `isPrivate`, `parentPost`, `attachments`.
- Controller filters private posts correctly for participants.

**Frontend:**
- Participant WorkshopDetail.tsx community tab:
  - Post form: textarea, isPrivate checkbox, attachment upload
  - Display posts with replies (threaded)
  - Private posts show lock icon
- CommunityManagement.tsx (organizer) already planned above

### Step 6: Assignment Submission + Grading UI

**Backend:**
- New model `AssignmentSubmission`: `{ assignment, user, content, fileId?, submittedAt }` with index `{ assignment: 1, user: 1 }` (unique)
- Add `POST /assignments/:assignmentId/submit` endpoint in `assignmentController.js`
  - Body: `{ content, fileId? }` — text response + optional file upload via multer
- Add `GET /assignments/:assignmentId/submissions` endpoint (organizer only) — returns submissions with user info
- Add `PUT /assignments/:assignmentId/submissions/:submissionId` endpoint (organizer only) — update score/feedback on the related AssignmentScore

**Frontend:**
- Participant WorkshopDetail.tsx tasks tab:
  - List assignments with due dates and submission status
  - Submit form: textarea for text response, optional file upload (PDF/DOC)
  - View scores/feedback via `GET /assignments/workshop/:id/my-scores`
- TaskManagement.tsx (organizer) already planned above includes grading UI with submission list

### Step 7: CSV Import UI + Hybrid Anti-Idle Presence

**CSV Import:**
- Backend already complete (`POST /attendance/session/:id/csv`)
- Frontend: Add drag-and-drop zone to WorkshopDetail.tsx sessions tab (organizer)
- Use native HTML5 drag-drop events (no extra library needed)
- Display results: matched count, unmatched emails list in a collapsible panel

**Hybrid Anti-Idle Presence:**
- Backend already complete (`POST /presence/session/:id/challenge`, `POST /presence/session/:id/confirm`)
- Frontend: New component `src/components/shared/AntiIdlePresence.tsx`
  - Activates when participant is on a live session page
  - Requests Notification permission on mount
  - Polls `GET /presence/session/:id/challenge` every 5 minutes during live session
  - When challenge received:
    - If `document.visibilityState === 'visible'`: show in-page modal with 60-second countdown + audio cue (Web Audio API beep)
    - If tab is backgrounded: trigger OS-level Web Notification with title "Kalvi Vaayil — Confirm Attendance"
    - If Notification permission denied: fall back to modal + flashing document.title ("️ Confirm attendance!")
  - Clicking notification or modal "I'm here" button calls `POST /presence/session/:id/confirm` with window timestamps
  - Backend validates timestamps (already implemented in presenceController)
- Integrate into participant WorkshopDetail.tsx sessions tab and Schedule.tsx

## Implementation checklist

### Backend
- [ ] New model `SessionJoin` with `{ session, user, joinedAt }` and unique index `{ session: 1, user: 1 }`
- [ ] New model `AssignmentSubmission` with `{ assignment, user, content, fileId?, submittedAt }` and unique index `{ assignment: 1, user: 1 }`
- [ ] Extend `Resource` model with `targetAudience: { type: String, enum: ['online', 'physical', 'all'], default: 'all' }`
- [ ] Add `'broadcast'` to Notification model type enum
- [ ] Add `POST /sessions/:id/join` endpoint creating SessionJoin (idempotent)
- [ ] Add `GET /sessions/:id/joins` endpoint returning join count + participant list
- [ ] Add `POST /workshops/:id/broadcast` endpoint creating filtered notifications
- [ ] Add `POST /assignments/:assignmentId/submit` endpoint with multer file upload
- [ ] Add `GET /assignments/:assignmentId/submissions` endpoint (organizer only)
- [ ] Modify `notifyResourceUpload` to filter by `targetAudience` vs registration `mode`
- [ ] All new models use `mongoose.models.X || mongoose.model(...)` pattern

### Frontend — Router + Organizer Pages
- [ ] Register 4 lazy-loaded routes in `router.tsx`: `/organizer/workshops/:id/resources`, `/tasks`, `/community`, `/certificates`
- [ ] Create `src/pages/organizer/ResourceManagement.tsx` with upload form (title, description, type, file/URL, target dropdown), list, delete
- [ ] Create `src/pages/organizer/TaskManagement.tsx` with assignment CRUD, submission list, grading UI
- [ ] Create `src/pages/organizer/CommunityManagement.tsx` with post list, reply form, attachment upload, delete
- [ ] Create `src/pages/organizer/CertificateReview.tsx` with roster table, attendance %, approve/reject buttons

### Frontend — Participant Views
- [ ] Enhance `WorkshopDetail.tsx` resources tab: filter by user's registration mode vs resource targetAudience
- [ ] Enhance `WorkshopDetail.tsx` community tab: post form with isPrivate checkbox, attachment upload, threaded replies
- [ ] Enhance `WorkshopDetail.tsx` tasks tab: assignment list, submit form (text + file), view scores/feedback
- [ ] Add "Join Live Session" button to Schedule.tsx and WorkshopDetail.tsx sessions tab (live or 15-min window)
- [ ] Add broadcast alert modal to organizer WorkshopDetail.tsx sessions tab
- [ ] Add CSV drag-drop zone to organizer WorkshopDetail.tsx sessions tab with results panel
- [ ] Create `src/components/shared/AntiIdlePresence.tsx` with hybrid modal + Web Notifications + title flash
- [ ] Integrate AntiIdlePresence into participant WorkshopDetail.tsx and Schedule.tsx for live sessions

### Localization
- [ ] Add ~40 new keys to `en.json` and `ta.json` for all new UI strings (broadcast, join, submit, grade, presence, etc.)
- [ ] Verify key parity between en and ta locales

## Verification checklist

### Build
- [ ] `pnpm exec tsc --noEmit` → 0 errors
- [ ] `pnpm lint` → 0 errors
- [ ] `pnpm run build:prod` succeeds

### Backend
- [ ] `node --check` passes on all new/modified files
- [ ] All new models import cleanly without duplicate registration errors
- [ ] `POST /sessions/:id/join` creates SessionJoin, idempotent on repeat calls
- [ ] `POST /workshops/:id/broadcast` creates notifications only for targeted participants
- [ ] `POST /assignments/:assignmentId/submit` accepts text + optional file, creates Submission
- [ ] Resource upload with `targetAudience='online'` only notifies online-registered participants

### Frontend
- [ ] All 4 organizer sub-routes render without 404
- [ ] Resource upload form submits with target selection, file appears in list, download works
- [ ] Assignment submission creates document, organizer can grade it
- [ ] Certificate approval generates PDF and sends notification to participant
- [ ] "Join Live Session" button appears only when session is live or within 15-min window
- [ ] Join button increments counter visible to organizer
- [ ] Broadcast modal sends notification to targeted participants
- [ ] Community posts respect isPrivate visibility (participant sees only own private posts)
- [ ] CSV import matches emails and displays unmatched list
- [ ] AntiIdlePresence modal appears during live sessions with 60-second countdown
- [ ] Web Notification fires when tab is backgrounded (if permission granted)
- [ ] Document.title flashes when notification permission denied
- [ ] Locale parity: en and ta key counts equal, no empty values

### Known limits
- No MongoDB reachable from sandbox — backend endpoints verified structurally, not end-to-end
- Web Notifications require user interaction to request permission — tested via permission prompt flow
- Anti-idle polling uses 5-minute interval — configurable but not user-exposed
