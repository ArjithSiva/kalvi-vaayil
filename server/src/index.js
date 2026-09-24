import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import workshopRoutes from './routes/workshops.js';
import sessionRoutes from './routes/sessions.js';
import registrationRoutes from './routes/registrations.js';
import attendanceRoutes from './routes/attendance.js';
import resourceRoutes from './routes/resources.js';
import assignmentRoutes from './routes/assignments.js';
import communityRoutes from './routes/community.js';
import announcementRoutes from './routes/announcements.js';
import certificateRoutes from './routes/certificates.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';
import presenceRoutes from './routes/presence.js';
import { startPresenceScheduler } from './services/presence.js';
import quotaRoutes from './routes/quota.js';
import analyticsRoutes from './routes/analytics.js';
import organizerRoutes from './routes/organizers.js';
import gatePassRoutes from './routes/gatePass.js';
import waitlistRoutes from './routes/waitlist.js';
import leaderboardRoutes from './routes/leaderboard.js';
import feedbackRoutes from './routes/feedback.js';

const app = express();

// Middleware
// CLIENT_URL may hold several origins (Vercel production + preview deployments),
// so split on commas instead of treating the whole string as one origin.
const allowedOrigins = config.clientUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, health checks) are allowed.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/quota-requests', quotaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api', gatePassRoutes);
app.use('/api', waitlistRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', feedbackRoutes);

// Root banner so a bare hit on the service URL (and any default health check)
// gets a real response instead of a 404.
app.get('/', (_req, res) => {
  res.json({ service: 'Kalvi Vaayil API', status: 'ok' });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Run workflow tests — visit this URL in your browser to verify all features.
// Works on Render free tier (no shell needed) and Vercel.
app.get('/api/run-tests', async (_req, res) => {
  try {
    const { runTests } = await import('./scripts/testWorkflowsHttp.js');
    const results = await runTests();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  await connectDB();

  // Auto-seed database if empty (for Render free tier — no shell access)
  const User = (await import('./models/User.js')).default;
  const Workshop = (await import('./models/Workshop.js')).default;
  const userCount = await User.countDocuments();
  const workshopCount = await Workshop.countDocuments();

  if (userCount === 0 && workshopCount === 0) {
    console.log('Database is empty — running automatic seeder...');
    try {
      // seed.js exposes runSeed() and does not connect, seed, or disconnect on
      // import — the server's live mongoose connection is reused and kept, and
      // the await below means seeding finishes before app.listen().
      const { runSeed } = await import('./seed.js');
      await runSeed();
      console.log('Auto-seed complete.');
    } catch (seedErr) {
      console.error('Auto-seed failed:', seedErr.message);
      // Fallback: create minimal admin + settings so server is usable
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash('admin123', 12);
      const existingAdmin = await User.findOne({ email: 'admin@kalvivaayil.edu' });
      if (!existingAdmin) {
        await User.create({
          email: 'admin@kalvivaayil.edu',
          passwordHash,
          name: 'System Admin',
          role: 'admin',
        });
        console.log('Minimal seed created: admin@kalvivaayil.edu / admin123');
      } else {
        console.log('Admin already exists, skipping creation');
      }
      const AppSettings = (await import('./models/AppSettings.js')).default;
      const settingsExist = await AppSettings.findOne();
      if (!settingsExist) {
        await AppSettings.create({ minAttendancePercent: 90 });
      }
    }
  } else {
    // Ensure admin exists even if DB has data
    const adminExists = await User.findOne({ email: 'admin@kalvivaayil.edu' });
    if (!adminExists) {
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash('admin123', 12);
      await User.create({
        email: 'admin@kalvivaayil.edu',
        passwordHash,
        name: 'System Admin',
        role: 'admin',
      });
      console.log('Default admin created: admin@kalvivaayil.edu / admin123');
    }

    // Ensure app settings exist
    const AppSettings = (await import('./models/AppSettings.js')).default;
    const settingsExist = await AppSettings.findOne();
    if (!settingsExist) {
      await AppSettings.create({ minAttendancePercent: 90 });
      console.log('Default app settings created (minAttendance: 90%)');
    }
  }

  startPresenceScheduler();

  app.listen(config.port, () => {
    console.log('Kalvi Vaayil server running on port ' + config.port);
  });
}

start().catch((err) => {
  // Exit non-zero so Render surfaces a failed boot instead of leaving a process
  // alive with no listener attached.
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
