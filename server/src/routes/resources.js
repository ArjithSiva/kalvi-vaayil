import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as resource from '../controllers/resourceController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

router.get('/workshop/:workshopId', authenticate, resource.listResources);
router.post('/workshop/:workshopId', authenticate, rbac('organizer', 'admin'), upload.single('file'), resource.uploadResource);
router.get('/:id/download', authenticate, resource.downloadResource);
router.delete('/:id', authenticate, rbac('organizer', 'admin'), resource.deleteResource);

export default router;
