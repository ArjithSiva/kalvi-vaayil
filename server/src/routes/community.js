import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import * as community from '../controllers/communityController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

router.get('/workshop/:workshopId', authenticate, community.listPosts);
router.post('/workshop/:workshopId', authenticate, community.createPost);
router.post('/attachment', authenticate, upload.single('file'), community.uploadPostAttachment);

export default router;
