import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as session from '../controllers/sessionController.js';

const router = Router();

router.get('/today', authenticate, session.getTodaysSessions);
router.get('/workshop/:workshopId', authenticate, session.listSessions);
router.get('/:id', authenticate, session.getSession);
router.post('/workshop/:workshopId', authenticate, rbac('organizer', 'admin'), session.createSession);
router.put('/:id', authenticate, rbac('organizer', 'admin'), session.updateSession);
router.delete('/:id', authenticate, rbac('organizer', 'admin'), session.deleteSession);
router.post('/:id/regenerate-qr', authenticate, rbac('organizer', 'admin'), session.regenerateQR);
router.post('/:id/join', authenticate, session.joinSession);
router.get('/:id/joins', authenticate, session.getSessionJoins);

export default router;
