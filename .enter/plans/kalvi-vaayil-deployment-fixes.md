# Kalvi Vaayil — Student Portfolio, Resource Locker, Quiz Gating & Auto Certificates

## Context

Four platform expansions: public student portfolios, per-session resource attachments, quiz-gated certificates, and automated certificate release when criteria are met.

---

## 1. Public Student Portfolio (`/p/:username`)

### Backend
**User model** (`server/src/models/User.js`): Add `username` field (String, unique, sparse, lowercase, trimmed). Generate from name on first save if not set.

**New route** in `server/src/routes/auth.js`: `GET /portfolio/:username` (public, no auth).

**New controller function** `getPortfolio(req, res)` in `server/src/controllers/authController.js`:
- Find user by username.
- Aggregate: approved certificates (populate workshop title), completed workshops count, skills (from `interests` + `qualifications`).
- Return `{ user: { name, bio, qualifications, interests }, certificates, completedWorkshops, skills }`.

### Frontend
**New file:** `src/pages/public/StudentPortfolio.tsx`
- Fetch `GET /auth/portfolio/:username`.
- Layout: name, bio, skill badge cloud (from interests/qualifications), certificate list with "Add to LinkedIn" buttons (reuse LinkedIn URL pattern from `Certificates.tsx`), share link button.

**Route:** Add to `src/router.tsx`: `{ path: '/p/:username', element: <StudentPortfolio /> }` under public routes.

### Files
- `server/src/models/User.js` — add `username` field
- `server/src/controllers/authController.js` — add `getPortfolio`
- `server/src/routes/auth.js` — add public GET route
- `src/pages/public/StudentPortfolio.tsx` — **new file**
- `src/router.tsx` — add route

---

## 2. Session Resource Locker

### Model
**File:** `server/src/models/Session.js` — add:
```js
resources: [{
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['slides', 'code', 'recording', 'document'], default: 'document' },
}]
```

### Backend
**File:** `server/src/controllers/sessionController.js` — the existing `updateSession` already accepts arbitrary body fields. Ensure `resources` is passed through.

### Frontend
**Organizer `WorkshopDetail.tsx`**: In each session card, add a collapsible "Resources" section with add/remove resource links (title, URL, type selector).

**Participant `WorkshopDetail.tsx`**: In each session card, show the session's resources as clickable links with type badges.

### Files
- `server/src/models/Session.js` — add `resources` subdocument
- `server/src/controllers/sessionController.js` — pass `resources` through in `updateSession`
- `src/pages/organizer/WorkshopDetail.tsx` — add resource management per session
- `src/pages/participant/WorkshopDetail.tsx` — display session resources

---

## 3. Post-Workshop Quiz Gating

### Model
**File:** `server/src/models/Workshop.js` — add:
```js
quiz: [{
  question: { type: String },
  options: [{ type: String }],
  correctOption: { type: Number },
}],
passingScore: { type: Number, default: 60, min: 0, max: 100 },
```

### Backend
**File:** `server/src/controllers/certificateController.js` — in `checkCertificateEligibility`:
- If workshop has quiz questions, require `quizScore >= workshop.passingScore` before creating certificate.
- Accept `quizScore` in request body.

**File:** `server/src/controllers/workshopController.js` — pass `quiz` and `passingScore` through in `updateWorkshop`.

### Frontend
**File:** `src/pages/participant/WorkshopDetail.tsx` — the existing "Quiz" tab already exists. Enhance it:
- If workshop has quiz questions, render them as a multiple-choice form.
- On submit, calculate score client-side and send to `checkCertificateEligibility` with `quizScore`.
- Only show certificate generation option if score >= passingScore.

### Files
- `server/src/models/Workshop.js` — add `quiz` and `passingScore`
- `server/src/controllers/certificateController.js` — check quiz score
- `server/src/controllers/workshopController.js` — pass quiz fields through
- `src/pages/participant/WorkshopDetail.tsx` — enhance quiz tab with scoring

---

## 4. Automated Certificate Release

**File:** `server/src/controllers/certificateController.js` — in `checkCertificateEligibility`:
- When attendance >= 80% AND (no quiz OR quizScore >= passingScore), create certificate with `status: 'approved'` directly (bypassing `review_ready`).
- Set `issuedAt` to now.
- This auto-issues certificates without manual organizer review.

### Files
- `server/src/controllers/certificateController.js` — auto-approve logic

---

## Files to modify

| File | Change |
|---|---|
| `server/src/models/User.js` | Add `username` field |
| `server/src/controllers/authController.js` | Add `getPortfolio` |
| `server/src/routes/auth.js` | Add public portfolio route |
| `src/pages/public/StudentPortfolio.tsx` | **New** — portfolio page |
| `src/router.tsx` | Add `/p/:username` route |
| `server/src/models/Session.js` | Add `resources` subdocument |
| `server/src/controllers/sessionController.js` | Pass `resources` in update |
| `src/pages/organizer/WorkshopDetail.tsx` | Session resource management UI |
| `src/pages/participant/WorkshopDetail.tsx` | Session resource display + quiz scoring |
| `server/src/models/Workshop.js` | Add `quiz` and `passingScore` |
| `server/src/controllers/certificateController.js` | Quiz gating + auto-approve |
| `server/src/controllers/workshopController.js` | Pass quiz fields through |
| `public/locales/en.json` | New keys |
| `public/locales/ta.json` | Mirror keys |

---

## Implementation checklist

- [ ] Add `username` field to User model with auto-generation from name
- [ ] Add `getPortfolio` controller function in authController.js
- [ ] Add `GET /portfolio/:username` public route in auth.js
- [ ] Create `src/pages/public/StudentPortfolio.tsx` with profile, skills, certificates
- [ ] Add `/p/:username` route to `src/router.tsx`
- [ ] Add `resources` subdocument array to Session model
- [ ] Pass `resources` through in sessionController.updateSession
- [ ] Add session resource management UI to organizer WorkshopDetail
- [ ] Add session resource display to participant WorkshopDetail
- [ ] Add `quiz` and `passingScore` to Workshop model
- [ ] Pass `quiz` and `passingScore` through in workshopController.updateWorkshop
- [ ] Update certificateController.checkCertificateEligibility: accept quizScore, check against passingScore
- [ ] Auto-approve certificates when attendance >= 80% and quiz passes (or no quiz)
- [ ] Enhance participant WorkshopDetail quiz tab with scoring and certificate gating
- [ ] Add locale keys for portfolio, resources, quiz
- [ ] Mirror locale keys in ta.json

## Verification checklist

- [ ] `pnpm exec tsc --noEmit` returns 0 errors
- [ ] `pnpm lint` returns 0 errors
- [ ] `pnpm run build:prod` builds cleanly
- [ ] `node --check server/src/models/User.js` — syntax OK
- [ ] `node --check server/src/models/Session.js` — syntax OK
- [ ] `node --check server/src/models/Workshop.js` — syntax OK
- [ ] `node --check server/src/controllers/authController.js` — syntax OK
- [ ] `node --check server/src/controllers/certificateController.js` — syntax OK
- [ ] `node --check server/src/controllers/sessionController.js` — syntax OK
- [ ] `node --check server/src/controllers/workshopController.js` — syntax OK
- [ ] `node --check server/src/routes/auth.js` — syntax OK
- [ ] `en.json` and `ta.json` have identical key sets
