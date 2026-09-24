# Kalvi Vaayil (கல்வி வாயில்) — Full Build Plan

## Context

Building a centralized LMS for Aurex'26 hackathon (Team Pixel Forge) to manage workshops, registrations, attendance, online sessions, and certificates. Three roles: Admin, Organizer, Participant. Multilingual (Tamil + English via i18next). AI chatbot + quiz generator via Groq. Free registration only — no paid workshops.

**Stack (fixed)**: React + Vite frontend (Vercel), Node.js + Express backend (Render), MongoDB Atlas, GridFS for files, Groq API for AI, JWT auth, i18next for i18n.

---

## Groq AI Model (verified Sept 23, 2026)

- **Primary**: `qwen/qwen3.8-27b` — Preview, 450 t/s, 131K context
- **Fallback**: `openai/gpt-oss-120b` — Production, 500 t/s
- Model IDs via env vars `AI_MODEL` / `AI_FALLBACK_MODEL` — never hard-coded in controllers

---

## Project Structure

Frontend stays at workspace root (existing Vite template). Backend in `server/` subdirectory.

```
/workspace/thread/
├── src/                          # React frontend
│   ├── components/
│   │   ├── ui/                   # shadcn components (existing)
│   │   ├── layout/               # Navbar, Sidebar, Footer, AuthLayout
│   │   └── shared/               # WorkshopCard, AttendanceBadge, etc.
│   ├── pages/
│   │   ├── auth/                 # Login, Register
│   │   ├── admin/                # Admin dashboard, organizers, categories, settings
│   │   ├── organizer/            # Dashboard, workshops, sessions, attendance, certificates
│   │   ├── participant/          # Discover, workshop detail, schedule, progress, AI
│   │   └── public/               # Certificate verification (/verify/:id)
│   ├── hooks/                    # useAuth, useNotifications, useLanguage
│   ├── lib/                      # api client (axios), utils, auth context
│   ├── types/                    # TypeScript interfaces matching backend models
│   ├── i18n/                     # existing config — change zh-CN → ta
│   └── App.tsx, router.tsx       # Updated with all routes + role guards
├── public/locales/               # en.json, ta.json
├── server/                       # Express backend
│   ├── package.json
│   ├── src/
│   │   ├── index.js              # Express app entry
│   │   ├── config/
│   │   │   ├── db.js             # MongoDB + GridFS connection
│   │   │   └── env.js            # Env var validation
│   │   ├── models/               # Mongoose schemas (see Data Model below)
│   │   ├── routes/               # Express route definitions
│   │   ├── controllers/          # Business logic per domain
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification
│   │   │   ├── rbac.js           # Role-check (admin/organizer/participant)
│   │   │   ├── organizerGate.js  # isActive + accessFrom/accessUntil check
│   │   │   └── rateLimit.js
│   │   ├── services/
│   │   │   ├── ai.js             # Groq SDK wrapper (model-agnostic)
│   │   │   ├── certificate.js    # PDF generation with pdfkit + QR embed
│   │   │   ├── csvParser.js      # Google Meet CSV → attendance
│   │   │   ├── textExtract.js    # PDF/DOC → text for AI grounding
│   │   │   └── notification.js   # Create + dispatch notifications
│   │   └── utils/
│   └── .env.example
└── package.json                  # Root frontend
```

---

## MongoDB Data Model

### users
```
{
  email: String (unique, indexed),
  passwordHash: String (bcrypt — NOT "password"),
  name: String,
  role: enum ['admin', 'organizer', 'participant'],
  phone: String,
  profilePic: String (GridFS file ID),
  bio: String,                              // Organizer
  qualifications: [String],                 // Organizer
  interests: [String],                      // Participant — for AI recommendations
  language: enum ['en', 'ta'] (default 'en'),
  darkMode: Boolean (default false),
  createdAt, updatedAt
}
```

### organizerSettings (separate model — isolated from User)
```
{
  user: ObjectId (ref: users, unique),
  isActive: Boolean (default true),
  accessFrom: Date,
  accessUntil: Date,
  maxWorkshopsPerWeek: Number (default 5)
}
```

### workshopCategories
```
{
  name: { en: String, ta: String },
  description: { en: String, ta: String },
  createdBy: ObjectId (ref: users)
}
```

### workshops
```
{
  title: String,
  description: String,
  topics: [String],
  type: ObjectId (ref: workshopCategories),
  organizer: ObjectId (ref: users),
  schedule: { startDate: Date, endDate: Date },
  capacity: Number,
  status: enum ['draft', 'published', 'completed', 'cancelled'],
  // NO price field — ever
  createdAt, updatedAt
}
```

### sessions
```
{
  workshop: ObjectId (ref: workshops),
  title: String,
  description: String,
  date: Date,
  startTime: Date,
  endTime: Date,
  googleMeetLink: String,             // Manual URL — no Google API
  attendanceMode: enum ['manual', 'qr', 'csv'],
  qrToken: String,                    // Unique, for QR attendance
  qrExpiresAt: Date,
  createdBy: ObjectId (ref: users)
}
```

### registrations
```
{
  user: ObjectId (ref: users),
  workshop: ObjectId (ref: workshops),
  status: enum ['confirmed', 'cancelled'],
  registeredAt: Date
  // Compound unique index: { user: 1, workshop: 1 }
  // Capacity check uses atomic findOneAndUpdate or transaction
}
```

### attendance
```
{
  session: ObjectId (ref: sessions),
  user: ObjectId (ref: users),
  workshop: ObjectId (ref: workshops),   // Denormalized
  status: enum ['present', 'absent'],
  method: enum ['manual', 'qr', 'csv'],
  markedAt: Date
  // Compound unique: { session: 1, user: 1 }
}
```

### presenceChecks (live-session anti-idle — NOT attendance)
```
{
  session: ObjectId (ref: sessions),
  user: ObjectId (ref: users),
  confirmedAt: Date,
  windowStart: Date,
  windowEnd: Date
}
```

### resources
```
{
  workshop: ObjectId (ref: workshops),
  type: enum ['pdf', 'doc', 'link'],
  title: String,
  description: String,
  fileId: ObjectId,              // GridFS ID (for pdf/doc)
  externalUrl: String,           // For link type
  extractedText: String,         // For AI grounding — text extracted from PDF/DOC
  uploadedBy: ObjectId (ref: users)
}
```

### assignments
```
{
  workshop: ObjectId (ref: workshops),
  title: String,
  description: String,
  dueDate: Date,
  maxScore: Number,
  createdBy: ObjectId (ref: users)
}
```

### assignmentScores
```
{
  assignment: ObjectId (ref: assignments),
  user: ObjectId (ref: users),
  score: Number,
  feedback: String,
  gradedBy: ObjectId (ref: users),
  gradedAt: Date
}
```

### announcements
```
{
  workshop: ObjectId (ref: workshops),
  title: String,
  content: String,
  createdBy: ObjectId (ref: users),
  createdAt, updatedAt
}
```

### communityPosts
```
{
  workshop: ObjectId (ref: workshops),
  author: ObjectId (ref: users),
  content: String,
  isPrivate: Boolean (default false),
  parentPost: ObjectId (ref: communityPosts, default null),
  attachments: [{ fileId: ObjectId, name: String }],  // GridFS files
  createdAt, updatedAt
}
```

### certificates
```
{
  user: ObjectId (ref: users),
  workshop: ObjectId (ref: workshops),
  certificateId: String (unique, unguessable — e.g. crypto.randomUUID()),
  status: enum ['review_ready', 'approved', 'rejected'],
  attendancePercent: Number,
  testScore: Number,
  reviewedBy: ObjectId (ref: users),
  issuedAt: Date,
  pdfFileId: ObjectId,          // GridFS
  createdAt
}
```

### notifications
```
{
  user: ObjectId (ref: users),
  type: enum [
    'registration_confirmed', 'session_reminder', 'certificate_ready',
    'new_workshop', 'workshop_recommendation', 'announcement', 'community_reply'
  ],
  title: String,
  message: String,
  relatedEntityType: String,
  relatedEntityId: ObjectId,
  isRead: Boolean (default false),
  createdAt
}
```

### appSettings (singleton)
```
{
  minAttendancePercent: Number (default 90)
}
```

---

## Implementation Checklist

### Phase 1: Project Setup
- [ ] Create `server/` directory with Express + Mongoose + all backend deps
- [ ] Create `server/src/config/db.js` — MongoDB connection + GridFS bucket init
- [ ] Create `server/src/config/env.js` — validate required env vars
- [ ] Create `server/.env.example` with all required vars
- [ ] Remove `@supabase/supabase-js` from frontend package.json
- [ ] Add `axios` to frontend deps
- [ ] Change i18n config: replace `zh-CN` with `ta` (Tamil) in `i18n.config.json`
- [ ] Create `public/locales/ta.json` with Tamil translations scaffold
- [ ] Create `src/lib/api.js` — axios instance with base URL + JWT interceptor
- [ ] Create `src/types/index.ts` — TypeScript interfaces for all models

### Phase 2: Backend Auth + Middleware
- [ ] `server/src/models/User.js` — Mongoose schema with `passwordHash` field
- [ ] `server/src/models/OrganizerSettings.js` — separate model
- [ ] `server/src/controllers/authController.js` — register, login (bcrypt + JWT)
- [ ] `server/src/routes/authRoutes.js` — POST /api/auth/register, /api/auth/login
- [ ] `server/src/middleware/auth.js` — JWT verify, attach user to req
- [ ] `server/src/middleware/rbac.js` — role-check middleware factory
- [ ] `server/src/middleware/organizerGate.js` — isActive + accessFrom/accessUntil enforcement
- [ ] `server/src/index.js` — Express app with CORS, JSON parsing, routes

### Phase 3: Frontend Auth
- [ ] `src/lib/authContext.tsx` — React context with user, login, logout, role
- [ ] `src/pages/auth/LoginPage.tsx` — shared login with role tabs (cosmetic)
- [ ] Role mismatch error: if selected tab ≠ actual role → show error, don't authenticate
- [ ] Redirect by actual stored role after login
- [ ] Language switcher + dark mode toggle on login page (pre-auth)
- [ ] `src/components/layout/ProtectedRoute.tsx` — role-based route guard
- [ ] Update `src/router.tsx` with all role-based routes

### Phase 4: Admin Panel
- [ ] `server/src/models/AppSettings.js` — singleton with minAttendancePercent
- [ ] Admin controllers: manage organizers, categories, app settings
- [ ] Admin routes with `rbac('admin')` middleware
- [ ] `src/pages/admin/Dashboard.tsx` — stats overview
- [ ] `src/pages/admin/OrganizerManagement.tsx` — CRUD organizers, set active/dates/limits
- [ ] `src/pages/admin/CategoryManagement.tsx` — CRUD workshop categories (bilingual names)
- [ ] `src/pages/admin/Settings.tsx` — global min attendance %

### Phase 5: Organizer — Workshop & Session Management
- [ ] `server/src/models/Workshop.js` — no price field
- [ ] `server/src/models/Session.js`
- [ ] Workshop CRUD controllers with organizerGate middleware
- [ ] Enforce maxWorkshopsPerWeek (Mon 00:00 → Sun 23:59 window) server-side
- [ ] Session CRUD with Google Meet URL field
- [ ] `src/pages/organizer/Dashboard.tsx` — stats, roster view
- [ ] `src/pages/organizer/WorkshopForm.tsx` — create/edit workshop
- [ ] `src/pages/organizer/SessionManager.tsx` — add sessions to workshop
- [ ] `src/pages/organizer/Profile.tsx` — bio, qualifications, pic upload (GridFS)

### Phase 6: Participant — Discovery & Registration
- [ ] `server/src/models/Registration.js` — unique compound index
- [ ] Registration controller with atomic capacity check (prevent race conditions)
- [ ] Workshop discovery: filter by type, date range, search text, organizer
- [ ] `src/pages/participant/Discover.tsx` — browse/filter workshops
- [ ] Workshop card component showing organizer pic + name
- [ ] `src/pages/participant/WorkshopDetail.tsx` — detail + register button
- [ ] Free confirm-only registration (no payment UI/API anywhere)

### Phase 7: Attendance System (3 methods)
- [ ] `server/src/models/Attendance.js`
- [ ] Manual: Organizer marks present/absent per participant
- [ ] QR: Generate unique token per session + expiry; participant scans → backend validates token/expiry/registration
- [ ] CSV: Upload Google Meet CSV → `csv-parser` → match email to registered participants → report unmatched rows
- [ ] Attendance % calculation per participant per workshop
- [ ] `src/pages/organizer/AttendanceMarking.tsx` — manual roll-call UI
- [ ] `src/pages/organizer/QRDisplay.tsx` — show QR code for session
- [ ] `src/pages/participant/QRScanner.tsx` — camera-based scan (html5-qrcode)
- [ ] `src/pages/organizer/CSVImport.tsx` — upload + preview + confirm

### Phase 8: Resources, Assignments & Community
- [ ] `server/src/models/Resource.js` — GridFS fileId + extractedText
- [ ] `server/src/services/textExtract.js` — PDF/DOC → text (pdf-parse, mammoth)
- [ ] Resource upload → GridFS + text extraction pipeline
- [ ] Resource access: auth check (registered participant / organizer / admin)
- [ ] `server/src/models/Assignment.js` + `AssignmentScore.js`
- [ ] Assignment CRUD + scoring controllers
- [ ] `server/src/models/CommunityPost.js`
- [ ] Community board: public/private visibility enforced at backend
- [ ] Organizer can attach PDFs to community threads (GridFS)
- [ ] `server/src/models/Announcement.js`
- [ ] Frontend pages for resources, assignments, community, announcements

### Phase 9: Certificates
- [ ] `server/src/models/Certificate.js` — status: review_ready | approved | rejected
- [ ] Auto-create `review_ready` certificate record when attendance >= minAttendancePercent
- [ ] NO auto-approval — Organizer manually reviews (attendance% + test score) → approve/reject
- [ ] `server/src/services/certificate.js` — PDF generation with pdfkit + embedded QR
- [ ] QR code contains `/verify/{certificateId}` URL
- [ ] `certificateId` uses `crypto.randomUUID()` — unguessable
- [ ] `GET /api/verify/:certificateId` — public, no auth, returns only: valid/invalid, name, workshop, date
- [ ] `src/pages/organizer/CertificateReview.tsx` — review list, approve/reject
- [ ] `src/pages/participant/MyCertificates.tsx` — view/download
- [ ] `src/pages/public/VerifyCertificate.tsx` — public verification page

### Phase 10: AI Features (Groq)
- [ ] `server/src/services/ai.js` — model-agnostic Groq wrapper using env vars
- [ ] System prompt: "multilingual workshop education chatbot and test generator"
- [ ] AI chatbot: grounded in workshop topics + extracted resource text
- [ ] Content retrieval: simple MongoDB text search on resource.extractedText (no vector DB)
- [ ] AI authorization: backend verifies requester is registered participant / organizer / admin
- [ ] AI quiz: on-demand generation from topics + content — NO persistence
- [ ] AI recommendations: based on participant registrations, attendance, interests
- [ ] Add `interests: [String]` to participant profile
- [ ] Frontend: chatbot UI, quiz UI, recommendations section

### Phase 11: Live Presence Check
- [ ] `server/src/models/PresenceCheck.js`
- [ ] Backend: create presence challenge, validate confirmation within window
- [ ] Frontend: Web Notifications API — request permission, show periodic notification
- [ ] Participant must interact within time window → backend records confirmation
- [ ] This supplements (not replaces) attendance — does not alter attendance record

### Phase 12: Notifications
- [ ] `server/src/services/notification.js` — create notification helper
- [ ] Trigger notifications: registration confirmed, session reminder, certificate ready, new workshop, announcement, community reply
- [ ] Organizer publishing new workshop → notify participants already enrolled with them
- [ ] `src/hooks/useNotifications.ts` — poll or websocket for new notifications
- [ ] `src/components/layout/NotificationBell.tsx` — in-app notification dropdown

### Phase 13: Participant Dashboard
- [ ] Calendar view: today's sessions + tomorrow preview (react-big-calendar)
- [ ] Progress: attendance %, streak (consecutive sessions attended), assignment status
- [ ] Meeting link visibility: time-windowed (visible close to session start only)
- [ ] `src/pages/participant/Dashboard.tsx`
- [ ] `src/pages/participant/Schedule.tsx`
- [ ] `src/pages/participant/Progress.tsx`

### Phase 14: i18n Completion & Polish
- [ ] Complete Tamil translations for all UI strings in `ta.json`
- [ ] Dark mode throughout (next-themes already installed)
- [ ] Responsive design — mobile-first for participant views
- [ ] Design system: update `index.css` + `tailwind.config.ts` for Kalvi Vaayil branding

### Phase 15: Deployment Config
- [ ] `server/vercel.json` or `render.yaml` for Render backend deployment
- [ ] Frontend `vite.config.ts` — API proxy for dev, env-based API URL for prod
- [ ] CORS config on backend for Vercel frontend domain
- [ ] `.env.example` files for both frontend and backend

---

## Verification Checklist

### Auth & RBAC
- [ ] Register creates user with `passwordHash` (bcrypt), correct role
- [ ] Login returns JWT; role tabs are cosmetic — actual role from DB drives redirect
- [ ] Role mismatch (tab ≠ actual role) shows clear error, does NOT authenticate
- [ ] Protected routes reject unauthenticated and wrong-role requests server-side
- [ ] Organizer gate: inactive / before accessFrom / after accessUntil → 403

### Admin
- [ ] Admin can create organizer accounts and toggle isActive
- [ ] Admin can set accessFrom/accessUntil dates per organizer
- [ ] Admin can set maxWorkshopsPerWeek per organizer
- [ ] Admin can set global minAttendancePercent (persisted in MongoDB, default 90)

### Workshops (no payment)
- [ ] Workshop model has NO price field
- [ ] No payment UI, API, checkout, or gateway code exists anywhere
- [ ] Organizer cannot create more than maxWorkshopsPerWeek (Mon-Sun window, server-enforced)
- [ ] Workshop cards show organizer name + profile picture

### Registration
- [ ] Registration is free confirm-only
- [ ] Unique compound index prevents duplicate registration
- [ ] Capacity enforced atomically (no race condition)

### Attendance
- [ ] Manual: Organizer marks present/absent per participant per session
- [ ] QR: Server validates token + expiry + registration before recording
- [ ] CSV: Backend parses, matches by email, reports unmatched rows
- [ ] Attendance % calculated from session data, compared to minAttendancePercent from DB

### Certificates
- [ ] Crossing threshold → status = `review_ready` (NOT auto-approved)
- [ ] Organizer manually approves/rejects after reviewing attendance% + test score
- [ ] PDF generated with embedded QR code pointing to `/verify/{certificateId}`
- [ ] Public verify page shows only: valid/invalid, name, workshop, date
- [ ] No email, phone, attendance%, score, or other data exposed on verify page

### AI
- [ ] Chatbot grounded in workshop topics + extracted resource text (not just title)
- [ ] AI authorization: backend checks registration before serving content
- [ ] Quiz is ephemeral — no Quiz or QuizAttempt model exists
- [ ] Recommendations use participant history + interests, don't expose other users' data
- [ ] Model IDs from env vars, not hard-coded

### i18n & UX
- [ ] Tamil/English switch works on login page (pre-auth) and throughout app
- [ ] Dark mode toggle works on login page and throughout app
- [ ] No Bhashini or third-party translation API used

### Live Presence
- [ ] Presence check uses Web Notifications API
- [ ] Missed notification does NOT alter attendance record
- [ ] Server validates confirmation within time window

### Build
- [ ] `pnpm run build` succeeds for frontend
- [ ] `node server/src/index.js` starts backend without errors
- [ ] Backend connects to MongoDB Atlas
- [ ] CORS allows Vercel frontend origin
