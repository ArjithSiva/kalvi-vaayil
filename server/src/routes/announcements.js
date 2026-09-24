import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as announcement from '../controllers/announcementController.js';

const router = Router();

router.get('/workshop/:workshopId', authenticate, announcement.listAnnouncements);
router.post('/workshop/:workshopId', authenticate, rbac('organizer', 'admin'), announcement.createAnnouncement);
router.put('/:id', authenticate, rbac('organizer', 'admin'), announcement.updateAnnouncement);
router.delete('/:id', authenticate, rbac('organizer', 'admin'), announcement.deleteAnnouncement);

export default router;
