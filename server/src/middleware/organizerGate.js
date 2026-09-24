import OrganizerSettings from '../models/OrganizerSettings.js';

/**
 * Middleware that checks if the authenticated organizer is allowed to perform actions.
 * Checks: isActive, accessFrom, accessUntil.
 * Must be used after authenticate middleware.
 */
export async function organizerGate(req, res, next) {
  try {
    if (req.user.role === 'admin') return next(); // Admins bypass
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Organizer access only' });
    }

    const settings = await OrganizerSettings.findOne({ user: req.user._id });
    if (!settings) {
      return res.status(403).json({ error: 'Organizer settings not configured' });
    }

    if (!settings.isActive) {
      return res.status(403).json({ error: 'Your account is currently inactive' });
    }

    const now = new Date();
    if (settings.accessFrom && now < settings.accessFrom) {
      return res.status(403).json({ error: 'Your access period has not started yet' });
    }
    if (settings.accessUntil && now > settings.accessUntil) {
      return res.status(403).json({ error: 'Your access period has expired' });
    }

    req.organizerSettings = settings;
    next();
  } catch (err) {
    next(err);
  }
}
