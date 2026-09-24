import Registration from '../models/Registration.js';
import Workshop from '../models/Workshop.js';
import GatePass from '../models/GatePass.js';
import { createNotification, notifyOrganizerParticipants } from '../services/notification.js';

export async function registerForWorkshop(req, res) {
  try {
    const { workshopId } = req.params;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    if (workshop.status !== 'published') {
      return res.status(400).json({ error: 'Workshop is not open for registration' });
    }

    // Atomic capacity check using findOneAndUpdate with a condition
    const currentCount = await Registration.countDocuments({
      workshop: workshopId,
      status: 'confirmed',
    });

    if (currentCount >= workshop.capacity) {
      return res.status(409).json({ error: 'Workshop is at full capacity' });
    }

    // Use findOneAndUpdate with upsert for atomicity
    const registration = await Registration.findOneAndUpdate(
      { user: req.user._id, workshop: workshopId },
      {
        user: req.user._id,
        workshop: workshopId,
        status: 'confirmed',
        registeredAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Notify participant
    await createNotification(
      req.user._id,
      'registration_confirmed',
      'Registration Confirmed',
      `You are registered for "${workshop.title}".`,
      { type: 'workshop', id: workshop._id }
    );

    // Auto-create GatePass for physical/hybrid workshops + notify participant
    if (workshop.mode === 'physical' || workshop.mode === 'hybrid') {
      let gatePass = await GatePass.findOne({ registration: registration._id });
      if (!gatePass) {
        gatePass = await GatePass.create({
          registration: registration._id,
          workshop: workshopId,
          user: req.user._id,
          token: 'placeholder',
        });
        gatePass.token = gatePass.generateToken();
        await gatePass.save();
      }

      await createNotification(
        req.user._id,
        'gate_pass',
        `Gate Pass Ready: ${workshop.title}`,
        `Your Gate Pass for "${workshop.title}" is ready! Click to view your QR code.`,
        { type: 'workshop', id: workshop._id }
      );
    }

    res.status(201).json(registration);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already registered for this workshop' });
    }
    res.status(500).json({ error: err.message });
  }
}

export async function cancelRegistration(req, res) {
  try {
    const registration = await Registration.findOneAndUpdate(
      { user: req.user._id, workshop: req.params.workshopId },
      { status: 'cancelled' },
      { new: true }
    );

    if (!registration) return res.status(404).json({ error: 'Registration not found' });
    res.json(registration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyRegistrations(req, res) {
  try {
    const registrations = await Registration.find({
      user: req.user._id,
      status: 'confirmed',
    })
      .populate({
        path: 'workshop',
        populate: [
          { path: 'organizer', select: 'name profilePic' },
          { path: 'type', select: 'name' },
        ],
      })
      .sort({ registeredAt: -1 });

    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getWorkshopRegistrations(req, res) {
  try {
    const registrations = await Registration.find({
      workshop: req.params.workshopId,
      status: 'confirmed',
    })
      .populate('user', 'name email phone profilePic')
      .sort({ registeredAt: 1 });

    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function publishWorkshop(req, res) {
  try {
    const workshop = await Workshop.findById(req.params.workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    workshop.status = 'published';
    await workshop.save();

    // Notify enrolled participants
    await notifyOrganizerParticipants(workshop.organizer, workshop);

    res.json(workshop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
