import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as reg from '../controllers/registrationController.js';

const router = Router();

router.get('/my', authenticate, reg.getMyRegistrations);
router.post('/workshop/:workshopId', authenticate, rbac('participant'), reg.registerForWorkshop);
router.delete('/workshop/:workshopId', authenticate, rbac('participant'), reg.cancelRegistration);
router.get('/workshop/:workshopId', authenticate, rbac('organizer', 'admin'), reg.getWorkshopRegistrations);
router.post('/workshop/:workshopId/publish', authenticate, rbac('organizer', 'admin'), reg.publishWorkshop);

export default router;
