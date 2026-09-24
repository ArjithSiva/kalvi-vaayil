/**
 * Role-based access control middleware factory.
 * Usage: router.get('/admin-only', authenticate, rbac('admin'), handler)
 *        router.post('/organizer-action', authenticate, rbac('organizer', 'admin'), handler)
 */
export function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
