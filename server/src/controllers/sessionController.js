import Session from '../models/Session.js';
import SessionJoin from '../models/SessionJoin.js';
import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import crypto from 'crypto';

export async function createSession(req, res) {
  try {
    const { workshopId } = req.params;
    const { title, description, date, startTime, endTime, googleMeetLink, attendanceMode } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const session = new Session({
      workshop: workshopId,
      title,
      description: description || '',
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      googleMeetLink: googleMeetLink || '',
      attendanceMode: attendanceMode || 'manual',
      createdBy: req.user._id,
    });

    // Generate QR token if mode is QR
    if (session.attendanceMode === 'qr') {
      session.qrToken = crypto.randomUUID();
      session.qrExpiresAt = new Date(session.startTime.getTime() + 2 * 60 * 60 * 1000);
    }

    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listSessions(req, res) {
  try {
    const { workshopId } = req.params;
    const sessions = await Session.find({ workshop: workshopId })
      .populate('createdBy', 'name')
      .sort({ date: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSession(req, res) {
  try {
    const session = await Session.findById(req.params.id)
      .populate('createdBy', 'name');
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateSession(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const workshop = await Workshop.findById(session.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, date, startTime, endTime, googleMeetLink, attendanceMode, resources } = req.body;
    if (title !== undefined) session.title = title;
    if (description !== undefined) session.description = description;
    if (date !== undefined) session.date = new Date(date);
    if (startTime !== undefined) session.startTime = new Date(startTime);
    if (endTime !== undefined) session.endTime = new Date(endTime);
    if (googleMeetLink !== undefined) session.googleMeetLink = googleMeetLink;
    if (attendanceMode !== undefined) {
      session.attendanceMode = attendanceMode;
      if (attendanceMode === 'qr' && !session.qrToken) {
        session.qrToken = crypto.randomUUID();
        session.qrExpiresAt = new Date(session.startTime.getTime() + 2 * 60 * 60 * 1000);
      }
    }
    if (resources !== undefined) session.resources = resources;

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteSession(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const workshop = await Workshop.findById(session.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function regenerateQR(req, res) {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.qrToken = crypto.randomUUID();
    session.qrExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
    await session.save();

    res.json({ qrToken: session.qrToken, qrExpiresAt: session.qrExpiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Record a participant joining a live session
export async function joinSession(req, res) {
  try {
    const { id: sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Check registration
    const Registration = (await import('../models/Registration.js')).default;
    const registration = await Registration.findOne({
      user: req.user._id,
      workshop: session.workshop,
      status: 'confirmed',
    });

    if (!registration) {
      return res.status(403).json({ error: 'Not registered for this workshop' });
    }

    // Idempotent: upsert SessionJoin
    const join = await SessionJoin.findOneAndUpdate(
      { session: sessionId, user: req.user._id },
      { session: sessionId, user: req.user._id, joinedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ joined: true, join });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get join list for a session (organizer only)
export async function getSessionJoins(req, res) {
  try {
    const { id: sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const workshop = await Workshop.findById(session.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const joins = await SessionJoin.find({ session: sessionId })
      .populate('user', 'name email')
      .sort({ joinedAt: 1 });

    res.json({ count: joins.length, joins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get today's sessions for the logged-in user (participant or organizer)
export async function getTodaysSessions(req, res) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let filter = {
      date: { $gte: todayStart, $lt: todayEnd },
    };

    // If participant: only show sessions for registered workshops
    if (req.user.role === 'participant') {
      const registrations = await Registration.find({
        user: req.user._id,
        status: 'confirmed',
      }).select('workshop');
      const workshopIds = registrations.map((r) => r.workshop);
      filter.workshop = { $in: workshopIds };
    }

    const sessions = await Session.find(filter)
      .populate('workshop', 'title mode')
      .sort({ startTime: 1 })
      .limit(10);

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
