import Resource from '../models/Resource.js';
import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import Attendance from '../models/Attendance.js';
import { chatCompletion, buildGroundedPrompt, generateQuiz, generateRecommendations } from '../services/ai.js';

// AI Chat — grounded in workshop content
export async function chatWithWorkshop(req, res) {
  try {
    const { workshopId } = req.params;
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Authorization: must be registered participant, organizer, or admin
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    const isOrganizer = workshop.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isRegistered = await Registration.findOne({
      user: req.user._id,
      workshop: workshopId,
      status: 'confirmed',
    });

    if (!isOrganizer && !isAdmin && !isRegistered) {
      return res.status(403).json({ error: 'Not authorized to access this workshop AI' });
    }

    // Gather workshop content for grounding
    const resources = await Resource.find({ workshop: workshopId });
    const extractedContent = resources
      .filter((r) => r.extractedText)
      .map((r) => `[${r.title}]: ${r.extractedText}`)
      .join('\n\n');

    const workshopContext = {
      title: workshop.title,
      topics: workshop.topics,
      extractedContent,
    };

    const messages = buildGroundedPrompt(workshopContext, message);
    const response = await chatCompletion(messages);

    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// AI Quiz — ephemeral, not persisted
export async function generateWorkshopQuiz(req, res) {
  try {
    const { workshopId } = req.params;
    const { questionCount } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Authorization
    const isOrganizer = workshop.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isRegistered = await Registration.findOne({
      user: req.user._id,
      workshop: workshopId,
      status: 'confirmed',
    });

    if (!isOrganizer && !isAdmin && !isRegistered) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const resources = await Resource.find({ workshop: workshopId });
    const extractedContent = resources
      .filter((r) => r.extractedText)
      .map((r) => r.extractedText)
      .join('\n\n');

    const workshopContext = {
      title: workshop.title,
      topics: workshop.topics,
      extractedContent,
    };

    const quiz = await generateQuiz(workshopContext, questionCount || 5);
    // NOT persisted — returned directly
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// AI Recommendations
export async function getRecommendations(req, res) {
  try {
    // Get participant history
    const registrations = await Registration.find({ user: req.user._id, status: 'confirmed' })
      .populate({
        path: 'workshop',
        select: 'title topics',
      });

    const attendedWorkshops = await Attendance.find({ user: req.user._id, status: 'present' })
      .populate({
        path: 'workshop',
        select: 'topics',
      });

    const attendedTopics = [...new Set(
      attendedWorkshops.flatMap((a) => a.workshop?.topics || [])
    )];

    // Get available published workshops not yet registered
    const registeredIds = registrations.map((r) => r.workshop?._id).filter(Boolean);
    const availableWorkshops = await Workshop.find({
      status: 'published',
      _id: { $nin: registeredIds },
    }).select('title topics');

    const history = {
      registrations: registrations.map((r) => r.workshop?.title).filter(Boolean),
      attendedTopics,
      interests: req.user.interests || [],
      availableWorkshops: availableWorkshops.map((w) => ({ title: w.title, topics: w.topics })),
    };

    const recommendations = await generateRecommendations(history);
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
