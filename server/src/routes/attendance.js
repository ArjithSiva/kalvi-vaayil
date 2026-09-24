import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as attendance from '../controllers/attendanceController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// Manual attendance
router.post('/session/:sessionId/manual', authenticate, rbac('organizer', 'admin'), attendance.markAttendance);

// QR attendance (participant scans)
router.post('/qr', authenticate, rbac('participant'), attendance.markQRAttendance);

// CSV import
router.post('/session/:sessionId/csv', authenticate, rbac('organizer', 'admin'), upload.single('file'), attendance.importCSVAttendance);

// Get attendance
router.get('/session/:sessionId', authenticate, attendance.getSessionAttendance);
router.get('/workshop/:workshopId', authenticate, attendance.getWorkshopAttendance);
router.get('/workshop/:workshopId/user/:userId', authenticate, attendance.getAttendancePercentage);

export default router;
