import Waitlist from '../models/Waitlist.js';
import Registration from '../models/Registration.js';
import Workshop from '../models/Workshop.js';
import Notification from '../models/Notification.js';
import GatePass from '../models/GatePass.js';

// Join waitlist for a full workshop
export async function joinWaitlist(req, res) {
  try {
    const { workshopId } = req.params;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.status !== 'published') {
      return res.status(400).json({ error: 'Workshop is not open for registration' });
    }

    // Check if already registered
    const existingReg = await Registration.findOne({
      user: req.user._id,
      workshop: workshopId,
      status: 'confirmed',
    });
    if (existingReg) return res.status(409).json({ error: 'Already registered' });

    // Check if already on waitlist
    const existingWait = await Waitlist.findOne({
      user: req.user._id,
      workshop: workshopId,
    });
    if (existingWait) return res.status(409).json({ error: 'Already on waitlist' });

    // Get current waitlist count
    const waitlistCount = await Waitlist.countDocuments({ workshop: workshopId });

    const waitlist = await Waitlist.create({
      workshop: workshopId,
      user: req.user._id,
      position: waitlistCount + 1,
    });

    res.status(201).json({
      waitlistId: waitlist._id,
      position: waitlist.position,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Auto-swap from waitlist when someone unenrolls
async function promoteFromWaitlist(workshopId) {
  try {
    // Find next person on waitlist
    const nextInLine = await Waitlist.findOne({ workshop: workshopId })
      .sort({ position: 1 });

    if (!nextInLine) return;

    // Create (or revive) the registration. A person who unenrolled earlier still
    // has a cancelled Registration row, and (user, workshop) is unique — a plain
    // create() would fail and silently leave the freed seat unfilled.
    const registration = await Registration.findOneAndUpdate(
      { user: nextInLine.user, workshop: workshopId },
      {
        user: nextInLine.user,
        workshop: workshopId,
        status: 'confirmed',
        mode: 'online', // Default, can be updated
        registeredAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Remove from waitlist
    await Waitlist.findByIdAndDelete(nextInLine._id);

    // Update positions for remaining waitlist
    await Waitlist.updateMany(
      { workshop: workshopId, position: { $gt: nextInLine.position } },
      { $inc: { position: -1 } },
    );

    // Send notification
    const workshop = await Workshop.findById(workshopId).select('title mode');
    const workshopTitle = workshop?.title || 'the workshop';
    await Notification.create({
      user: nextInLine.user,
      type: 'waitlist_promoted',
      title: 'Waitlist Promotion',
      message: `A seat opened up in "${workshopTitle}" and you have been promoted from the waitlist. Your seat is confirmed.`,
      relatedEntityType: 'workshop',
      relatedEntityId: workshopId,
    });

    // Physical/hybrid workshops: promoted participants need a Gate Pass just
    // like anyone who registered directly.
    if (workshop && (workshop.mode === 'physical' || workshop.mode === 'hybrid')) {
      let gatePass = await GatePass.findOne({ registration: registration._id });
      if (!gatePass) {
        gatePass = await GatePass.create({
          registration: registration._id,
          workshop: workshopId,
          user: nextInLine.user,
          token: 'placeholder',
        });
        gatePass.token = gatePass.generateToken();
        await gatePass.save();
      }
      await Notification.create({
        user: nextInLine.user,
        type: 'gate_pass',
        title: `Gate Pass Ready: ${workshopTitle}`,
        message: `Your Gate Pass for "${workshopTitle}" is ready! Click to view your QR code.`,
        relatedEntityType: 'workshop',
        relatedEntityId: workshopId,
      });
    }
  } catch (err) {
    console.error('Waitlist promotion error:', err.message);
  }
}

// Unenroll from workshop
export async function unenroll(req, res) {
  try {
    const { workshopId } = req.params;

    const registration = await Registration.findOneAndUpdate(
      { user: req.user._id, workshop: workshopId, status: 'confirmed' },
      { status: 'cancelled' },
      { new: true },
    );

    if (!registration) return res.status(404).json({ error: 'Registration not found' });

    // Try to promote from waitlist
    await promoteFromWaitlist(workshopId);

    res.json({ message: 'Unenrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cancel workshop (organizer only)
export async function cancelWorkshop(req, res) {
  try {
    const { id: workshopId } = req.params;
    const { reason } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    workshop.status = 'cancelled';
    await workshop.save();

    // Notify all registered participants
    const registrations = await Registration.find({
      workshop: workshopId,
      status: 'confirmed',
    }).select('user');

    const waitlist = await Waitlist.find({ workshop: workshopId }).select('user');

    const allUsers = [...registrations.map((r) => r.user), ...waitlist.map((w) => w.user)];
    const uniqueUsers = [...new Set(allUsers.map((id) => id.toString()))];

    const notifications = uniqueUsers.map((userId) => ({
      user: userId,
      type: 'announcement',
      title: 'Workshop Cancelled',
      message: `"${workshop.title}" has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      relatedEntityType: 'workshop',
      relatedEntityId: workshopId,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ message: 'Workshop cancelled', notified: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get my waitlist positions
export async function getMyWaitlist(req, res) {
  try {
    const waitlist = await Waitlist.find({ user: req.user._id })
      .populate('workshop', 'title mode schedule')
      .sort({ joinedAt: -1 });

    res.json(waitlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export { promoteFromWaitlist };
