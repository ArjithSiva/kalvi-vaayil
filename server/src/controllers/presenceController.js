import mongoose from 'mongoose';
import PresenceCheck from '../models/PresenceCheck.js';
import PresenceChallenge from '../models/PresenceChallenge.js';
import { issueChallenge, ensureDueChallenge, findLiveSessions } from '../services/presence.js';
import Session from '../models/Session.js';
import Registration from '../models/Registration.js';
import Workshop from '../models/Workshop.js';
import Attendance from '../models/Attendance.js';

// Recalculate a participant's attendance percentage for a workshop.
async function attendancePercentFor(workshopId, userId) {
  const totalSessions = await Session.countDocuments({ workshop: workshopId });
  const presentCount = await Attendance.countDocuments({
    workshop: workshopId,
    user: userId,
    status: 'present',
  });
  return totalSessions > 0 ? Math.min(100, Math.round((presentCount / totalSessions) * 100)) : 0;
}

function serializeChallenge(challenge, extra = {}) {
  return {
    challengeId: challenge._id,
    sessionId: challenge.session,
    windowStart: challenge.windowStart,
    windowEnd: challenge.windowEnd,
    ...extra,
  };
}

// Manually trigger an attendance check for a session (organizer/admin) and
// notify every eligible participant. Also used directly by the workflow tests.
export async function createPresenceChallenge(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (req.user?.role === 'organizer') {
      const workshop = await Workshop.findById(session.workshop).select('organizer');
      if (!workshop || workshop.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your workshop' });
      }
    }

    const challenge = await issueChallenge(session, { trigger: 'manual' });
    res.json(serializeChallenge(challenge));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Unconfirmed, still-open challenges for the requesting participant across all
// of their live online sessions. The client polls this; it is also where a
// scheduled check is issued if the background scheduler has not done so yet.
export async function getActiveChallenges(req, res) {
  try {
    const now = new Date();
    const regs = await Registration.find({
      user: req.user._id,
      status: 'confirmed',
      mode: { $in: ['online', 'both'] },
    }).select('workshop');
    const workshopIds = regs.map((r) => r.workshop);
    if (workshopIds.length === 0) return res.json({ challenges: [], liveSessions: 0, serverTime: now });

    const live = await findLiveSessions(now, workshopIds);
    for (const { session, workshop } of live) {
      try {
        await ensureDueChallenge(session, workshop, now);
      } catch (err) {
        console.error('ensureDueChallenge failed:', err.message);
      }
    }
    if (live.length === 0) return res.json({ challenges: [], liveSessions: 0, serverTime: now });

    const sessionIds = live.map((l) => l.session._id);
    const open = await PresenceChallenge.find({
      session: { $in: sessionIds },
      windowStart: { $lte: now },
      windowEnd: { $gt: now },
    });
    const confirmed = await PresenceCheck.find({
      user: req.user._id,
      challenge: { $in: open.map((c) => c._id) },
    }).select('challenge');
    const confirmedIds = new Set(confirmed.map((c) => c.challenge.toString()));

    const titles = new Map(
      live.map((l) => [l.session._id.toString(), { session: l.session.title, workshop: l.workshop.title }])
    );
    const challenges = open
      .filter((c) => !confirmedIds.has(c._id.toString()))
      .map((c) =>
        serializeChallenge(c, {
          sessionTitle: titles.get(c.session.toString())?.session || '',
          workshopTitle: titles.get(c.session.toString())?.workshop || '',
        })
      );

    res.json({ challenges, liveSessions: live.length, serverTime: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Current open challenge for one session (read-only — never creates one).
export async function getSessionChallenge(req, res) {
  try {
    const now = new Date();
    const challenge = await PresenceChallenge.findOne({
      session: req.params.sessionId,
      windowStart: { $lte: now },
      windowEnd: { $gt: now },
    }).sort({ windowStart: -1 });
    if (!challenge) return res.json({ active: false, serverTime: now });
    res.json(serializeChallenge(challenge, { active: true, serverTime: now }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Confirm presence (participant) — updates Attendance to 'present' on success
export async function confirmPresence(req, res) {
  try {
    const { sessionId } = req.params;
    const { challengeId, windowStart, windowEnd } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Check registration
    const reg = await Registration.findOne({
      user: req.user._id,
      workshop: session.workshop,
      status: 'confirmed',
    });
    if (!reg) return res.status(403).json({ error: 'Not registered for this workshop' });

    // The window must be one the server actually issued — never trust a
    // client-supplied window on its own.
    let challenge = null;
    if (challengeId && mongoose.isValidObjectId(challengeId)) {
      challenge = await PresenceChallenge.findOne({ _id: challengeId, session: sessionId });
    } else if (windowStart && windowEnd) {
      challenge = await PresenceChallenge.findOne({
        session: sessionId,
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowEnd),
      });
    }
    if (!challenge) return res.status(400).json({ error: 'Unknown attendance check' });

    const now = new Date();
    if (now < challenge.windowStart || now > challenge.windowEnd) {
      return res.status(400).json({ error: 'Presence confirmation window has expired' });
    }

    let check = await PresenceCheck.findOne({ challenge: challenge._id, user: req.user._id });
    const alreadyConfirmed = Boolean(check);
    if (!check) {
      check = await PresenceCheck.create({
        session: sessionId,
        user: req.user._id,
        challenge: challenge._id,
        confirmedAt: now,
        windowStart: challenge.windowStart,
        windowEnd: challenge.windowEnd,
      });
    }

    // Mark attendance as 'present' for this session
    await Attendance.findOneAndUpdate(
      { session: sessionId, user: req.user._id },
      {
        session: sessionId,
        user: req.user._id,
        workshop: session.workshop,
        status: 'present',
        method: 'manual',
        markedAt: now,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const attendancePercent = await attendancePercentFor(session.workshop, req.user._id);

    res.json({ confirmed: true, alreadyConfirmed, check, attendancePercent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Check missed alerts and auto-mark absent if threshold exceeded
// This should be called periodically or after a challenge window expires
export async function checkMissedAlerts(sessionId, userId) {
  try {
    const session = await Session.findById(sessionId);
    if (!session) return;

    const workshop = await Workshop.findById(session.workshop);
    if (!workshop) return;

    const maxMissed = workshop.attendanceSettings?.maxAllowedMissedAlerts ?? 3;

    // Count total challenges for this session
    const totalChallenges = await PresenceCheck.countDocuments({ session: sessionId });

    // Count confirmed by this user
    const confirmedByUser = await PresenceCheck.countDocuments({
      session: sessionId,
      user: userId,
    });

    const missed = totalChallenges - confirmedByUser;

    // If missed more than allowed, mark absent
    if (missed > maxMissed) {
      await Attendance.findOneAndUpdate(
        { session: sessionId, user: userId },
        {
          session: sessionId,
          user: userId,
          workshop: session.workshop,
          status: 'absent',
          method: 'manual',
          markedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  } catch (err) {
    console.error('Error checking missed alerts:', err);
  }
}
