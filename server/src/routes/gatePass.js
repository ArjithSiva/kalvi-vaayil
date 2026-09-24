import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as gatePass from '../controllers/gatePassController.js';

const router = Router();

// Participant generates gate pass
router.post('/registrations/:workshopId/gate-pass', authenticate, rbac('participant'), gatePass.generateGatePass);

// Organizer scans gate pass
router.post('/attendance/scan-gate-pass', authenticate, rbac('organizer', 'admin'), gatePass.scanGatePass);

export default router;
