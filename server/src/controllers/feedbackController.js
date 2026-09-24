import Feedback from '../models/Feedback.js';
import Workshop from '../models/Workshop.js';
import OrganizerSettings from '../models/OrganizerSettings.js';

// Submit feedback for a workshop
export async function submitFeedback(req, res) {
  try {
    const { workshopId } = req.params;
    const { workshopRating, organizerRating, workshopComment, organizerComment } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Check if already submitted
    const existing = await Feedback.findOne({
      workshop: workshopId,
      user: req.user._id,
    });
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

    // Update organizer rating
    const allFeedback = await Feedback.find({ organizer: workshop.organizer });
    const avgRating =
      allFeedback.reduce((sum, f) => sum + f.organizerRating, 0) / allFeedback.length;

    await OrganizerSettings.findOneAndUpdate(
      { user: workshop.organizer },
      {
        rating: avgRating,
        totalRatings: allFeedback.length,
      },
    );

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get feedback for a workshop (organizer view)
export async function getWorkshopFeedback(req, res) {
  try {
    const { workshopId } = req.params;

    const feedback = await Feedback.find({ workshop: workshopId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get feedback summary for a workshop (rating distribution)
export async function getWorkshopFeedbackSummary(req, res) {
  try {
    const { workshopId } = req.params;

    const feedback = await Feedback.find({ workshop: workshopId });

    const totalCount = feedback.length;
    const averageRating = totalCount > 0
      ? Math.round((feedback.reduce((sum, f) => sum + f.workshopRating, 0) / totalCount) * 10) / 10
      : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const f of feedback) {
      distribution[f.workshopRating] = (distribution[f.workshopRating] || 0) + 1;
    }

    res.json({ averageRating, totalCount, distribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get my feedback for a workshop
export async function getMyFeedback(req, res) {
  try {
    const { workshopId } = req.params;

    const feedback = await Feedback.findOne({
      workshop: workshopId,
      user: req.user._id,
    });

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
