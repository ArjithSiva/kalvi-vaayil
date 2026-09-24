import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ai from '../controllers/aiController.js';

const router = Router();

router.post('/workshop/:workshopId/chat', authenticate, ai.chatWithWorkshop);
router.post('/workshop/:workshopId/quiz', authenticate, ai.generateWorkshopQuiz);
router.get('/recommendations', authenticate, ai.getRecommendations);

export default router;
