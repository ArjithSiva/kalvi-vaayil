import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';
import OrganizerSettings from '../models/OrganizerSettings.js';
import { createNotification } from '../services/notification.js';

export async function createWorkshop(req, res) {
  try {
    const { title, description, topics, type, schedule, capacity, mode } = req.body;

    // Check if organizer can host physical events
    if (mode === 'physical' || mode === 'hybrid') {
      const settings = req.organizerSettings || await OrganizerSettings.findOne({ user: req.user._id });
      if (!settings || !settings.canHostPhysicalEvents) {
        return res.status(403).json({ error: 'Not authorized to create physical events. Contact admin for permission.' });
      }
    }

    if (!title || !capacity) {
      return res.status(400).json({ error: 'Title and capacity are required' });
    }

    // Enforce organizer limits
    const settings = req.organizerSettings || await OrganizerSettings.findOne({ user: req.user._id });
    if (settings) {
      // Check max participants per workshop
      if (capacity > settings.maxParticipantsPerWorkshop) {
        return res.status(400).json({
          error: 'Capacity exceeds limit',
          message: `Maximum ${settings.maxParticipantsPerWorkshop} participants per workshop.`,
        });
      }

      // Check total workshops limit
      const totalWorkshops = await Workshop.countDocuments({ organizer: req.user._id });
      if (totalWorkshops >= settings.maxWorkshopsLimit) {
        return res.status(403).json({
          error: 'Workshop limit reached',
          message: `You can create at most ${settings.maxWorkshopsLimit} workshops total.`,
        });
      }
    }

    // Enforce max workshops per week
    if (settings) {
      const now = new Date();
      // Week: Monday 00:00 to Sunday 23:59
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekCount = await Workshop.countDocuments({
        organizer: req.user._id,
        createdAt: { $gte: weekStart, $lt: weekEnd },
      });

      if (weekCount >= settings.maxWorkshopsPerWeek) {
        return res.status(429).json({
          error: 'Workshop creation limit reached',
          message: `You can create at most ${settings.maxWorkshopsPerWeek} workshops per week (Monday-Sunday).`,
        });
      }
    }

    const workshop = await Workshop.create({
      title,
      description: description || '',
      topics: topics || [],
      type: type || null,
      organizer: req.user._id,
      schedule: schedule || {},
      capacity,
      status: 'draft',
    });

    res.status(201).json(workshop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listWorkshops(req, res) {
  try {
    const {
      status, organizer, type, search, startDate, endDate,
      mode, totalClassesCount, page = 1, limit = 20,
    } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (organizer) filter.organizer = organizer;
    if (type) filter.type = type;
    if (mode) filter.mode = mode;
    if (totalClassesCount) {
      const [min, max] = totalClassesCount.split('-').map(Number);
      if (max) {
        filter.totalClassesCount = { $gte: min, $lte: max };
      } else {
        filter.totalClassesCount = { $gte: min };
      }
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { topics: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      filter['schedule.startDate'] = {};
      if (startDate) filter['schedule.startDate'].$gte = new Date(startDate);
      if (endDate) filter['schedule.endDate'] = { $lte: new Date(endDate) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [workshops, total] = await Promise.all([
      Workshop.find(filter)
        .populate('organizer', 'name profilePic bio qualifications')
        .populate('type', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Workshop.countDocuments(filter),
    ]);

    res.json({ workshops, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getWorkshop(req, res) {
  try {
    const workshop = await Workshop.findById(req.params.id)
      .populate('organizer', 'name profilePic bio qualifications email')
      .populate('type', 'name');

    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateWorkshop(req, res) {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Only the owning organizer or admin can update
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this workshop' });
    }

    const { title, description, topics, type, schedule, capacity, status, attendanceSettings, quiz, passingScore } = req.body;
    if (title !== undefined) workshop.title = title;
    if (description !== undefined) workshop.description = description;
    if (topics !== undefined) workshop.topics = topics;
    if (type !== undefined) workshop.type = type;
    if (schedule !== undefined) workshop.schedule = schedule;
    if (capacity !== undefined) workshop.capacity = capacity;
    if (status !== undefined) workshop.status = status;
    if (attendanceSettings !== undefined) workshop.attendanceSettings = attendanceSettings;
    if (quiz !== undefined) workshop.quiz = quiz;
    if (passingScore !== undefined) workshop.passingScore = passingScore;

    await workshop.save();
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteWorkshop(req, res) {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Workshop.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workshop deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Broadcast a notification to workshop participants
export async function broadcastToWorkshop(req, res) {
  try {
    const { id: workshopId } = req.params;
    const { message, target } = req.body; // target: 'online' | 'physical' | 'all'

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!['online', 'physical', 'all'].includes(target)) {
      return res.status(400).json({ error: 'Target must be online, physical, or all' });
    }

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Build filter based on target
    const registrationFilter = { workshop: workshopId, status: 'confirmed' };
    if (target !== 'all') {
      registrationFilter.mode = target;
    }

    const registrations = await Registration.find(registrationFilter).select('user');
    const userIds = registrations.map((r) => r.user);

    if (userIds.length === 0) {
      return res.json({ sent: 0, message: 'No participants match the target criteria' });
    }

    const notifications = userIds.map((userId) => ({
      user: userId,
      type: 'broadcast',
      title: `Alert from ${workshop.title}`,
      message,
      relatedEntityType: 'workshop',
      relatedEntityId: workshop._id,
    }));

    await Notification.insertMany(notifications);
    res.json({ sent: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Post an announcement to a workshop
export async function postAnnouncement(req, res) {
  try {
    const { id: workshopId } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Push announcement to workshop subdocument
    workshop.announcements.push({
      title,
      message,
      createdBy: req.user._id,
    });
    await workshop.save();

    const announcement = workshop.announcements[workshop.announcements.length - 1];

    // Notify all registered participants
    const registrations = await Registration.find({
      workshop: workshopId,
      status: 'confirmed',
    }).select('user');

    const notifications = registrations.map((r) => ({
      user: r.user,
      type: 'announcement',
      title: `Announcement from ${workshop.title}: ${title}`,
      message,
      relatedEntityType: 'workshop',
      relatedEntityId: workshop._id,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({ announcement, sent: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get announcements for a workshop
export async function getAnnouncements(req, res) {
  try {
    const workshop = await Workshop.findById(req.params.id).select('announcements');
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Sort newest first
    const announcements = [...(workshop.announcements || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
