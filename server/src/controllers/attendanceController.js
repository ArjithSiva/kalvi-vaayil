import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import Workshop from '../models/Workshop.js';
import { parseMeetCSV, matchEmails } from '../services/csvParser.js';

// --- Manual Attendance ---

export async function markAttendance(req, res) {
  try {
    const { sessionId } = req.params;
    const { marks } = req.body; // [{ userId, status: 'present'|'absent' }]

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const results = [];
    for (const mark of marks) {
      const attendance = await Attendance.findOneAndUpdate(
        { session: sessionId, user: mark.userId },
        {
          session: sessionId,
          user: mark.userId,
          workshop: session.workshop,
          status: mark.status || 'present',
          method: 'manual',
          markedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(attendance);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- QR Attendance ---

export async function markQRAttendance(req, res) {
  try {
    const { qrToken } = req.body;

    if (!qrToken) return res.status(400).json({ error: 'QR token is required' });

    const session = await Session.findOne({ qrToken });
    if (!session) return res.status(404).json({ error: 'Invalid QR code' });

    // Check expiry
    if (session.qrExpiresAt && new Date() > session.qrExpiresAt) {
      return res.status(410).json({ error: 'QR code has expired' });
    }

    // Check registration
    const registration = await Registration.findOne({
      user: req.user._id,
      workshop: session.workshop,
      status: 'confirmed',
    });

    if (!registration) {
      return res.status(403).json({ error: 'You are not registered for this workshop' });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { session: session._id, user: req.user._id },
      {
        session: session._id,
        user: req.user._id,
        workshop: session.workshop,
        status: 'present',
        method: 'qr',
        markedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- CSV Attendance ---

export async function importCSVAttendance(req, res) {
  try {
    const { sessionId } = req.params;

    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Parse CSV
    const csvEmails = await parseMeetCSV(req.file.buffer);

    // Get registered participants for this workshop
    const registrations = await Registration.find({
      workshop: session.workshop,
      status: 'confirmed',
    }).populate('user', 'email name');

    const registeredParticipants = registrations.map((r) => ({
      _id: r.user._id,
      email: r.user.email,
      name: r.user.name,
    }));

    const { matched, unmatched } = matchEmails(csvEmails, registeredParticipants);

    // Mark attendance for matched participants
    const results = [];
    for (const user of matched) {
      const attendance = await Attendance.findOneAndUpdate(
        { session: sessionId, user: user._id },
        {
          session: sessionId,
          user: user._id,
          workshop: session.workshop,
          status: 'present',
          method: 'csv',
          markedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(attendance);
    }

    res.json({
      totalEmails: csvEmails.length,
      matched: matched.length,
      unmatched,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- Get Attendance ---

export async function getSessionAttendance(req, res) {
  try {
    const { sessionId } = req.params;
    const attendance = await Attendance.find({ session: sessionId })
      .populate('user', 'name email profilePic');
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getWorkshopAttendance(req, res) {
  try {
    const { workshopId } = req.params;
    const { userId } = req.query;

    const filter = { workshop: workshopId };
    if (userId) filter.user = userId;

    const attendance = await Attendance.find(filter)
      .populate('session', 'title date')
      .populate('user', 'name email');

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- Attendance Percentage ---

export async function getAttendancePercentage(req, res) {
  try {
    const { workshopId, userId } = req.params;
    const targetUser = userId || req.user._id;

    const [totalSessions, presentCount] = await Promise.all([
      Session.countDocuments({ workshop: workshopId }),
      Attendance.countDocuments({
        workshop: workshopId,
        user: targetUser,
        status: 'present',
      }),
    ]);

    const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    res.json({
      totalSessions,
      presentSessions: presentCount,
      percentage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
