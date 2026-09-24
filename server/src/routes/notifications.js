import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notification from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', notification.getNotifications);
router.get('/unread-count', notification.getUnreadCount);
router.put('/:notificationId/read', notification.markAsRead);
router.put('/read-all', notification.markAllAsRead);

export default router;
