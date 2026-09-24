import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as cert from '../controllers/certificateController.js';

const router = Router();

// Public verification — NO auth
router.get('/verify/:certificateId', cert.verifyCertificate);

// Protected routes
router.get('/workshop/:workshopId/eligibility', authenticate, cert.checkCertificateEligibility);
router.get('/workshop/:workshopId/review', authenticate, rbac('organizer', 'admin'), cert.listReviewReady);
router.post('/:certificateId/review', authenticate, rbac('organizer', 'admin'), cert.reviewCertificate);
router.get('/my', authenticate, cert.getMyCertificates);
router.get('/:id/download', authenticate, cert.downloadCertificate);

export default router;
