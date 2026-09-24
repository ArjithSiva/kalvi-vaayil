import GatePass from '../models/GatePass.js';
import Registration from '../models/Registration.js';
import Workshop from '../models/Workshop.js';
import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';

// Generate gate pass for a registration
export async function generateGatePass(req, res) {
  try {
    const { workshopId } = req.params;

    const registration = await Registration.findOne({
      user: req.user._id,
      workshop: workshopId,
      status: 'confirmed',
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.mode === 'online') {
      return res.status(400).json({ error: 'Gate pass only available for physical/hybrid workshops' });
    }

    // Check if gate pass already exists
    let gatePass = await GatePass.findOne({ registration: registration._id });

    if (!gatePass) {
      gatePass = await GatePass.create({
        registration: registration._id,
        workshop: workshopId,
        user: req.user._id,
        token: '', // Will be set after save
      });

      // Generate JWT token
      gatePass.token = gatePass.generateToken();
      await gatePass.save();
    }

    res.json({
      gatePassId: gatePass._id,
      token: gatePass.token,
      workshop: workshop.title,
      userName: req.user.name,
      valid: gatePass.isValid,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Scan gate pass (organizer only)
export async function scanGatePass(req, res) {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Verify JWT token
    const decoded = GatePass.verifyToken(token);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const gatePass = await GatePass.findById(decoded.passId)
      .populate('user', 'name email')
      .populate('workshop', 'title mode');

    if (!gatePass) return res.status(404).json({ error: 'Gate pass not found' });
    if (!gatePass.isValid) return res.status(400).json({ error: 'Gate pass already used' });

    // Find the session for today (or create attendance record)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const session = await Session.findOne({
      workshop: gatePass.workshop._id,
      startTime: { $gte: today, $lt: tomorrow },
    });

    if (!session) {
      return res.status(400).json({ error: 'No session scheduled for today' });
    }

    // Mark attendance
    const attendance = await Attendance.findOneAndUpdate(
      { session: session._id, user: gatePass.user._id },
      {
        session: session._id,
        user: gatePass.user._id,
        workshop: gatePass.workshop._id,
        status: 'present',
        method: 'qr',
        markedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Mark gate pass as scanned
    gatePass.scannedAt = new Date();
    gatePass.isValid = false;
    await gatePass.save();

    res.json({
      success: true,
      participant: {
        name: gatePass.user.name,
        email: gatePass.user.email,
      },
      workshop: gatePass.workshop.title,
      session: session.title,
      attendance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
