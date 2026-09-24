import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { getAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.get('/', authenticate, rbac('admin'), getAnalytics);

export default router;
