import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { organizerGate } from '../middleware/organizerGate.js';
import * as workshop from '../controllers/workshopController.js';

const router = Router();

// Public: list published workshops (for discovery)
router.get('/', workshop.listWorkshops);
router.get('/:id', workshop.getWorkshop);

// Protected: organizer creates/manages own workshops
router.post('/', authenticate, rbac('organizer'), organizerGate, workshop.createWorkshop);
router.put('/:id', authenticate, rbac('organizer', 'admin'), workshop.updateWorkshop);
router.delete('/:id', authenticate, rbac('organizer', 'admin'), workshop.deleteWorkshop);
router.post('/:id/broadcast', authenticate, rbac('organizer', 'admin'), workshop.broadcastToWorkshop);
router.post('/:id/announcements', authenticate, rbac('organizer', 'admin'), workshop.postAnnouncement);
router.get('/:id/announcements', authenticate, workshop.getAnnouncements);

export default router;
