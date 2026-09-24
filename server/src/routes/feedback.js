import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as feedback from '../controllers/feedbackController.js';

const router = Router();

// Submit feedback (participant)
router.post(
  '/workshops/:workshopId/feedback',
  authenticate,
  rbac('participant'),
  feedback.submitFeedback,
);

// Get workshop feedback (organizer)
router.get(
  '/workshops/:workshopId/feedback',
  authenticate,
  rbac('organizer', 'admin'),
  feedback.getWorkshopFeedback,
);

// Get workshop feedback summary (organizer)
router.get(
  '/workshops/:workshopId/feedback/summary',
  authenticate,
  rbac('organizer', 'admin'),
  feedback.getWorkshopFeedbackSummary,
);

// Get my feedback for a workshop
router.get(
  '/workshops/:workshopId/feedback/my',
  authenticate,
  feedback.getMyFeedback,
);

export default router;
