import User from '../models/User.js';
import OrganizerSettings from '../models/OrganizerSettings.js';
import bcrypt from 'bcryptjs';
import AppSettings from '../models/AppSettings.js';
import Workshop from '../models/Workshop.js';
import WorkshopCategory from '../models/WorkshopCategory.js';
import Registration from '../models/Registration.js';

// --- Organizer Management ---

export async function createOrganizer(req, res) {
  try {
    const { email, password, name, phone, isActive, accessFrom, accessUntil, maxWorkshopsPerWeek } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'organizer',
      phone: phone || '',
    });

    await OrganizerSettings.create({
      user: user._id,
      isActive: isActive !== undefined ? isActive : true,
      accessFrom: accessFrom || null,
      accessUntil: accessUntil || null,
      maxWorkshopsPerWeek: maxWorkshopsPerWeek || 5,
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listOrganizers(req, res) {
  try {
    const organizers = await User.find({ role: 'organizer' }).select('-passwordHash');
    const settings = await OrganizerSettings.find({
      user: { $in: organizers.map((o) => o._id) },
    });

    const settingsMap = new Map(settings.map((s) => [s.user.toString(), s]));
    const result = organizers.map((o) => ({
      ...o.toJSON(),
      organizerSettings: settingsMap.get(o._id.toString()) || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateOrganizerSettings(req, res) {
  try {
    const { organizerId } = req.params;
    const { isActive, accessFrom, accessUntil, maxWorkshopsPerWeek } = req.body;

    const update = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (accessFrom !== undefined) update.accessFrom = accessFrom;
    if (accessUntil !== undefined) update.accessUntil = accessUntil;
    if (maxWorkshopsPerWeek !== undefined) update.maxWorkshopsPerWeek = maxWorkshopsPerWeek;

    const settings = await OrganizerSettings.findOneAndUpdate(
      { user: organizerId },
      update,
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updatePhysicalPermission(req, res) {
  try {
    const { id } = req.params;
    const { canHostPhysicalEvents } = req.body;

    const settings = await OrganizerSettings.findOneAndUpdate(
      { user: id },
      { canHostPhysicalEvents },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- Workshop Categories ---

export async function createCategory(req, res) {
  try {
    const { name, description } = req.body;
    const category = await WorkshopCategory.create({
      name: name || { en: '', ta: '' },
      description: description || { en: '', ta: '' },
      createdBy: req.user._id,
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listCategories(req, res) {
  try {
    const categories = await WorkshopCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { name, description } = req.body;
    const update = {};
    if (name) update.name = name;
    if (description) update.description = description;

    const category = await WorkshopCategory.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const inUse = await Workshop.findOne({ type: req.params.id });
    if (inUse) return res.status(400).json({ error: 'Category is in use by workshops' });

    await WorkshopCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- App Settings ---

export async function getAppSettings(req, res) {
  try {
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({ minAttendancePercent: 90 });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateAppSettings(req, res) {
  try {
    const { minAttendancePercent } = req.body;
    const update = {};
    if (minAttendancePercent !== undefined) update.minAttendancePercent = minAttendancePercent;

    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create(update);
    } else {
      settings = await AppSettings.findByIdAndUpdate(settings._id, update, { new: true });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- Admin Dashboard Stats ---

export async function getDashboardStats(req, res) {
  try {
    const [totalUsers, totalOrganizers, totalWorkshops, totalRegistrations] = await Promise.all([
      User.countDocuments({ role: 'participant' }),
      User.countDocuments({ role: 'organizer' }),
      Workshop.countDocuments(),
      Registration.countDocuments({ status: 'confirmed' }),
    ]);

    res.json({ totalUsers, totalOrganizers, totalWorkshops, totalRegistrations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
