import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/workshops/:workshopId/leaderboard', authenticate, getLeaderboard);

export default router;
