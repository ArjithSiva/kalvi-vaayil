import { Router } from 'express';
import { register, login, getMe, updateProfile, getPortfolio } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public routes — NO auth
router.get('/portfolio/:username', getPortfolio);

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
