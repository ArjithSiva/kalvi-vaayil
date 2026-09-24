import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as waitlist from '../controllers/waitlistController.js';

const router = Router();

// Join waitlist
router.post('/registrations/:workshopId/waitlist', authenticate, rbac('participant'), waitlist.joinWaitlist);

// Unenroll (triggers auto-swap)
router.delete('/registrations/:workshopId', authenticate, rbac('participant'), waitlist.unenroll);

// Cancel workshop (organizer)
router.post('/workshops/:id/cancel', authenticate, rbac('organizer', 'admin'), waitlist.cancelWorkshop);

// Get my waitlist positions
router.get('/waitlist/my', authenticate, rbac('participant'), waitlist.getMyWaitlist);

export default router;
