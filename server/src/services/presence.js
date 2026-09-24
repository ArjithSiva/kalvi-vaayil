import mongoose from 'mongoose';
import Session from '../models/Session.js';
import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';
import PresenceChallenge from '../models/PresenceChallenge.js';

/** How long a participant has to answer an attendance check. */
export const RESPONSE_WINDOW_MS = 2 * 60 * 1000;

/** How often the background scheduler looks for live sessions. */
const TICK_MS = 30 * 1000;

/** Don't start a new check when the session is about to end anyway. */
const MIN_REMAINING_MS = 30 * 1000;

/**
 * Participants who should be asked to confirm presence for a workshop: confirmed
 * registrations that attend online (online-only, or "both" for hybrid events).
 */
export async function eligibleParticipantIds(workshopId) {
  const regs = await Registration.find({
    workshop: workshopId,
    status: 'confirmed',
    mode: { $in: ['online', 'both'] },
  }).select('user');
  return regs.map((r) => r.user);
}

/**
 * Persist a challenge for a session and drop an in-app notification into every
 * eligible participant's feed. Returns the challenge, or null when the slot was
 * already issued by another caller (duplicate sequence).
 */
export async function issueChallenge(session, { sequence, trigger = 'auto' } = {}) {
  const workshop = await Workshop.findById(session.workshop).select('title');
  const now = new Date();

  let challenge;
  try {
    challenge = await PresenceChallenge.create({
      session: session._id,
      workshop: session.workshop,
      sequence: typeof sequence === 'number' ? sequence : undefined,
      windowStart: now,
      windowEnd: new Date(now.getTime() + RESPONSE_WINDOW_MS),
      trigger,
    });
  } catch (err) {
    if (err && err.code === 11000) return null; // slot already issued elsewhere
    throw err;
  }

  const userIds = await eligibleParticipantIds(session.workshop);
  const minutes = Math.round(RESPONSE_WINDOW_MS / 60000);
  if (userIds.length > 0) {
    await Notification.insertMany(
      userIds.map((user) => ({
        user,
        type: 'attendance_check',
        title: `Attendance check: ${workshop?.title || session.title}`,
        message:
          `Confirm you are present in "${session.title}" within ${minutes} minutes. / ` +
          `"${session.title}" அமர்வில் இருக்கிறீர்கள் என்பதை ${minutes} நிமிடங்களுக்குள் உறுதிப்படுத்தவும்.`,
        relatedEntityType: 'session',
        relatedEntityId: session._id,
      }))
    );
  }
  return challenge;
}

/**
 * Issue the scheduled check for a live session if one is due.
 *
 * Checks fall on a fixed cadence from the session start (every
 * `alertIntervalMinutes`). The slot number doubles as the idempotency key, so
 * calling this from the scheduler and from request handlers at the same time is
 * safe — exactly one caller creates each slot.
 */
export async function ensureDueChallenge(session, workshop, now = new Date()) {
  const intervalMs = (workshop?.attendanceSettings?.alertIntervalMinutes || 5) * 60 * 1000;
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  const t = now.getTime();

  if (t < start || t >= end || end - t < MIN_REMAINING_MS) return null;
  const slot = Math.floor((t - start) / intervalMs);
  if (slot < 1) return null;

  const existing = await PresenceChallenge.exists({ session: session._id, sequence: slot });
  if (existing) return null;
  return issueChallenge(session, { sequence: slot, trigger: 'auto' });
}

/** Live sessions of online/hybrid, published workshops. */
export async function findLiveSessions(now = new Date(), workshopIds = null) {
  const filter = { startTime: { $lte: now }, endTime: { $gt: now } };
  if (workshopIds) filter.workshop = { $in: workshopIds };
  const sessions = await Session.find(filter);
  if (sessions.length === 0) return [];

  const workshops = await Workshop.find({
    _id: { $in: [...new Set(sessions.map((s) => s.workshop.toString()))] },
    status: 'published',
    mode: { $in: ['online', 'hybrid'] },
  }).select('title mode attendanceSettings');
  const byId = new Map(workshops.map((w) => [w._id.toString(), w]));

  return sessions
    .filter((s) => byId.has(s.workshop.toString()))
    .map((s) => ({ session: s, workshop: byId.get(s.workshop.toString()) }));
}

async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  const now = new Date();
  const live = await findLiveSessions(now);
  for (const { session, workshop } of live) {
    try {
      await ensureDueChallenge(session, workshop, now);
    } catch (err) {
      console.error('Presence scheduler error for session', session._id.toString(), err.message);
    }
  }
}

let timer = null;

/**
 * Start the background scheduler. Safe to call more than once.
 *
 * On Render's free tier the process sleeps when idle, so the request path
 * (GET /api/presence/active) also calls ensureDueChallenge — a participant's
 * open tab is enough to wake the service and issue the check.
 */
export function startPresenceScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error('Presence scheduler tick failed:', err.message));
  }, TICK_MS);
  if (typeof timer.unref === 'function') timer.unref();
  console.log('Presence scheduler started (every ' + TICK_MS / 1000 + 's)');
}
