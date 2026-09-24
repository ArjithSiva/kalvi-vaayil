import Announcement from '../models/Announcement.js';
import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import { createNotification } from '../services/notification.js';

export async function createAnnouncement(req, res) {
  try {
    const { workshopId } = req.params;
    const { title, content } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const announcement = await Announcement.create({
      workshop: workshopId,
      title,
      content,
      createdBy: req.user._id,
    });

    // Notify all registered participants
    const registrations = await Registration.find({ workshop: workshopId, status: 'confirmed' });
    const notifications = registrations.map((r) => ({
      user: r.user,
      type: 'announcement',
      title: `New Announcement: ${title}`,
      message: content.slice(0, 200),
      relatedEntityType: 'announcement',
      relatedEntityId: announcement._id,
    }));

    if (notifications.length > 0) {
      const Notification = (await import('../models/Notification.js')).default;
      await Notification.insertMany(notifications);
    }

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listAnnouncements(req, res) {
  try {
    const { workshopId } = req.params;
    const announcements = await Announcement.find({ workshop: workshopId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateAnnouncement(req, res) {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    const workshop = await Workshop.findById(announcement.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, content } = req.body;
    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;

    await announcement.save();
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteAnnouncement(req, res) {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    const workshop = await Workshop.findById(announcement.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
