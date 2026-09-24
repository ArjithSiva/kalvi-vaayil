import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as organizer from '../controllers/organizerController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

// Public profile
router.get('/:id', organizer.getOrganizerProfile);
router.get('/:id/workshops', organizer.getOrganizerPastWorkshops);

// Organizer updates own profile
router.put('/profile', authenticate, rbac('organizer'), organizer.updateOrganizerProfile);
router.post('/profile/picture', authenticate, rbac('organizer'), upload.single('file'), organizer.uploadProfilePic);

// Feedback
router.post('/workshops/:workshopId/feedback', authenticate, organizer.submitFeedback);
router.get('/workshops/:workshopId/feedback', organizer.getFeedbackSummary);

export default router;
