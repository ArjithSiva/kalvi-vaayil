import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as assignment from '../controllers/assignmentController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

router.get('/workshop/:workshopId', authenticate, assignment.listAssignments);
router.post('/workshop/:workshopId', authenticate, rbac('organizer', 'admin'), assignment.createAssignment);
router.post('/:assignmentId/score', authenticate, rbac('organizer', 'admin'), assignment.scoreAssignment);
router.get('/:assignmentId/scores', authenticate, assignment.getAssignmentScores);
router.get('/workshop/:workshopId/my-scores', authenticate, assignment.getMyScores);
router.post('/:assignmentId/submit', authenticate, rbac('participant'), upload.single('file'), assignment.submitAssignment);
router.get('/:assignmentId/submissions', authenticate, rbac('organizer', 'admin'), assignment.getAssignmentSubmissions);
router.post('/:assignmentId/ai-evaluate', authenticate, rbac('organizer', 'admin'), assignment.aiEvaluateSubmission);

export default router;
