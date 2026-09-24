import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { organizerGate } from '../middleware/organizerGate.js';
import * as quota from '../controllers/quotaController.js';

const router = Router();

// Organizer: submit and view own requests
router.post('/', authenticate, rbac('organizer'), organizerGate, quota.createQuotaRequest);
router.get('/my', authenticate, rbac('organizer'), quota.getMyRequests);

// Admin: inbox and review
router.get('/pending', authenticate, rbac('admin'), quota.listPendingRequests);
router.get('/all', authenticate, rbac('admin'), quota.listAllRequests);
router.post('/:requestId/review', authenticate, rbac('admin'), quota.reviewQuotaRequest);

export default router;
