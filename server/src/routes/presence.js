import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as presence from '../controllers/presenceController.js';

const router = Router();

// Participant: open attendance checks across all of their live sessions.
router.get('/active', authenticate, rbac('participant'), presence.getActiveChallenges);

// Read-only view of the current check for one session.
router.get('/session/:sessionId/challenge', authenticate, presence.getSessionChallenge);

// Organizer/admin: send an attendance check to a live session right now.
router.post('/session/:sessionId/challenge', authenticate, rbac('organizer', 'admin'), presence.createPresenceChallenge);

router.post('/session/:sessionId/confirm', authenticate, rbac('participant'), presence.confirmPresence);

export default router;
