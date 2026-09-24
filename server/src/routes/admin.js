import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import * as admin from '../controllers/adminController.js';

const router = Router();

// Public: any authenticated user can list categories (organizers need this for
// the "Create Workshop" form). Must be declared BEFORE the admin-only middleware.
router.get('/categories', authenticate, admin.listCategories);

// All admin routes below require authentication + admin role
router.use(authenticate, rbac('admin'));

// Organizer management
router.get('/organizers', admin.listOrganizers);
router.post('/organizers', admin.createOrganizer);
router.put('/organizers/:organizerId/settings', admin.updateOrganizerSettings);
router.put('/organizers/:id/physical-permission', admin.updatePhysicalPermission);

// Categories (admin-only write operations)
router.post('/categories', admin.createCategory);
router.put('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);

// App settings
router.get('/settings', admin.getAppSettings);
router.put('/settings', admin.updateAppSettings);

// Dashboard
router.get('/dashboard', admin.getDashboardStats);

export default router;
