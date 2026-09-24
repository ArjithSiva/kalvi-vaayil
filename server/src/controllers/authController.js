import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import OrganizerSettings from '../models/OrganizerSettings.js';
import Certificate from '../models/Certificate.js';
import Registration from '../models/Registration.js';
import { generateToken } from '../middleware/auth.js';

export async function register(req, res) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const validRoles = ['participant', 'organizer'];
    const userRole = validRoles.includes(role) ? role : 'participant';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: userRole,
    });

    // Create organizer settings if role is organizer
    if (userRole === 'organizer') {
      await OrganizerSettings.create({ user: user._id });
    }

    const token = generateToken(user._id);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password, selectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check role mismatch
    if (selectedRole && selectedRole !== user.role) {
      return res.status(403).json({
        error: 'Role mismatch',
        message: `This account is registered as "${user.role}", not "${selectedRole}". Please select the correct role tab.`,
        actualRole: user.role,
      });
    }

    // Check organizer gate
    if (user.role === 'organizer') {
      const settings = await OrganizerSettings.findOne({ user: user._id });
      if (settings && !settings.isActive) {
        return res.status(403).json({ error: 'Your account is currently inactive. Contact an administrator.' });
      }
      const now = new Date();
      if (settings?.accessFrom && now < settings.accessFrom) {
        return res.status(403).json({ error: 'Your access period has not started yet.' });
      }
      if (settings?.accessUntil && now > settings.accessUntil) {
        return res.status(403).json({ error: 'Your access period has expired.' });
      }
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let organizerSettings = null;
    if (user.role === 'organizer') {
      organizerSettings = await OrganizerSettings.findOne({ user: user._id });
    }

    res.json({ user: user.toJSON(), organizerSettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, phone, bio, qualifications, interests, language, darkMode } = req.body;
    const update = {};

    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (bio !== undefined) update.bio = bio;
    if (qualifications !== undefined) update.qualifications = qualifications;
    if (interests !== undefined) update.interests = interests;
    if (language !== undefined) update.language = language;
    if (darkMode !== undefined) update.darkMode = darkMode;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-passwordHash');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Public portfolio — NO AUTH REQUIRED
export async function getPortfolio(req, res) {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [certificates, completedCount] = await Promise.all([
      Certificate.find({ user: user._id, status: 'approved' })
        .populate('workshop', 'title topics')
        .sort({ issuedAt: -1 }),
      Registration.countDocuments({ user: user._id, status: 'confirmed' }),
    ]);

    const skills = [
      ...(user.interests || []),
      ...(user.qualifications || []),
    ].filter(Boolean);

    res.json({
      user: {
        name: user.name,
        username: user.username,
        bio: user.bio,
        qualifications: user.qualifications,
        interests: user.interests,
      },
      certificates: certificates.map((c) => ({
        certificateId: c.certificateId,
        workshop: c.workshop,
        issuedAt: c.issuedAt,
        attendancePercent: c.attendancePercent,
        testScore: c.testScore,
      })),
      completedWorkshops: completedCount,
      skills: [...new Set(skills)],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
