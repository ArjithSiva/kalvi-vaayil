import User from '../models/User.js';
import OrganizerSettings from '../models/OrganizerSettings.js';
import Workshop from '../models/Workshop.js';
import Feedback from '../models/Feedback.js';
import { getGridFSBucket } from '../config/db.js';

// Get public organizer profile
export async function getOrganizerProfile(req, res) {
  try {
    const { id } = req.params;
    const organizer = await User.findById(id).select('-passwordHash');
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const settings = await OrganizerSettings.findOne({ user: id });
    const workshops = await Workshop.find({ organizer: id, status: 'published' })
      .select('title description mode schedule averageRating totalRatings')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      organizer,
      settings,
      workshops,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update own organizer profile
export async function updateOrganizerProfile(req, res) {
  try {
    const { degree, bio, socialLinks } = req.body;

    const updates = {};
    if (degree !== undefined) updates.degree = degree;
    if (bio !== undefined) updates.bio = bio;
    if (socialLinks !== undefined) updates.socialLinks = socialLinks;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Upload profile picture
export async function uploadProfilePic(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { user: req.user._id.toString(), type: 'profilePic' },
    });

    uploadStream.end(req.file.buffer);
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    await User.findByIdAndUpdate(req.user._id, { profilePic: uploadStream.id });
    res.json({ fileId: uploadStream.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get organizer's past workshops with highlights
export async function getOrganizerPastWorkshops(req, res) {
  try {
    const { id } = req.params;
    const workshops = await Workshop.find({
      organizer: id,
      status: 'completed',
    })
      .select('title description mode schedule highlights averageRating totalRatings')
      .sort({ 'schedule.endDate': -1 });

    res.json(workshops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Submit feedback for workshop + organizer
export async function submitFeedback(req, res) {
  try {
    const { workshopId } = req.params;
    const { workshopRating, organizerRating, workshopComment, organizerComment } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Check if user already submitted feedback
    const existing = await Feedback.findOne({ workshop: workshopId, user: req.user._id });
    if (existing) return res.status(409).json({ error: 'Feedback already submitted' });

    const feedback = await Feedback.create({
      workshop: workshopId,
      organizer: workshop.organizer,
      user: req.user._id,
      workshopRating,
      organizerRating,
      workshopComment: workshopComment || '',
      organizerComment: organizerComment || '',
    });

    // Update workshop average rating
    const workshopStats = await Feedback.aggregate([
      { $match: { workshop: workshop._id } },
      { $group: { _id: null, avg: { $avg: '$workshopRating' }, count: { $sum: 1 } } },
    ]);

    if (workshopStats.length > 0) {
      await Workshop.findByIdAndUpdate(workshopId, {
        averageRating: workshopStats[0].avg,
        totalRatings: workshopStats[0].count,
      });
    }

    // Update organizer average rating
    const organizerStats = await Feedback.aggregate([
      { $match: { organizer: workshop.organizer } },
      { $group: { _id: null, avg: { $avg: '$organizerRating' }, count: { $sum: 1 } } },
    ]);

    if (organizerStats.length > 0) {
      await OrganizerSettings.findOneAndUpdate(
        { user: workshop.organizer },
        {
          rating: organizerStats[0].avg,
          totalRatings: organizerStats[0].count,
        },
      );
    }

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get feedback summary for a workshop
export async function getFeedbackSummary(req, res) {
  try {
    const { workshopId } = req.params;
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    const feedback = await Feedback.find({ workshop: workshopId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({
      workshop: {
        averageRating: workshop.averageRating,
        totalRatings: workshop.totalRatings,
      },
      feedback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
