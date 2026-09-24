import { Assignment, AssignmentScore } from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Workshop from '../models/Workshop.js';
import { getGridFSBucket } from '../config/db.js';
import { chatCompletion } from '../services/ai.js';
import multer from 'multer';

export async function createAssignment(req, res) {
  try {
    const { workshopId } = req.params;
    const { title, description, dueDate, maxScore } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const assignment = await Assignment.create({
      workshop: workshopId,
      title,
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      maxScore: maxScore || 100,
      createdBy: req.user._id,
    });

    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listAssignments(req, res) {
  try {
    const { workshopId } = req.params;
    const assignments = await Assignment.find({ workshop: workshopId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function scoreAssignment(req, res) {
  try {
    const { assignmentId } = req.params;
    const { userId, score, feedback } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const workshop = await Workshop.findById(assignment.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const assignmentScore = await AssignmentScore.findOneAndUpdate(
      { assignment: assignmentId, user: userId },
      {
        assignment: assignmentId,
        user: userId,
        score,
        feedback: feedback || '',
        gradedBy: req.user._id,
        gradedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(assignmentScore);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAssignmentScores(req, res) {
  try {
    const { assignmentId } = req.params;
    const scores = await AssignmentScore.find({ assignment: assignmentId })
      .populate('user', 'name email')
      .populate('gradedBy', 'name');
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyScores(req, res) {
  try {
    const { workshopId } = req.params;
    const assignments = await Assignment.find({ workshop: workshopId });
    const assignmentIds = assignments.map((a) => a._id);

    const scores = await AssignmentScore.find({
      assignment: { $in: assignmentIds },
      user: req.user._id,
    }).populate('assignment', 'title maxScore');

    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Submit an assignment (participant)
export async function submitAssignment(req, res) {
  try {
    const { assignmentId } = req.params;
    const { content } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Check registration
    const Registration = (await import('../models/Registration.js')).default;
    const registration = await Registration.findOne({
      user: req.user._id,
      workshop: assignment.workshop,
      status: 'confirmed',
    });

    if (!registration) {
      return res.status(403).json({ error: 'Not registered for this workshop' });
    }

    // Handle file upload if present
    let fileId = null;
    let fileName = '';
    if (req.file) {
      const bucket = getGridFSBucket();
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
        metadata: { assignment: assignmentId, user: req.user._id.toString() },
      });

      uploadStream.end(req.file.buffer);
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error', reject);
      });

      fileId = uploadStream.id;
      fileName = req.file.originalname;
    }

    // Upsert submission
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment: assignmentId, user: req.user._id },
      {
        assignment: assignmentId,
        user: req.user._id,
        content: content || '',
        fileId,
        fileName,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get submissions for an assignment (organizer only)
export async function getAssignmentSubmissions(req, res) {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const workshop = await Workshop.findById(assignment.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
      .populate('user', 'name email')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// AI-assisted evaluation of a submission
export async function aiEvaluateSubmission(req, res) {
  try {
    const { submissionId } = req.params;
    const { rubric } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('user', 'name');
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const workshop = await Workshop.findById(assignment.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Build prompt for AI evaluation
    const prompt = `Evaluate this assignment submission and provide a score and feedback.

Assignment: ${assignment.title}
Description: ${assignment.description}
Max Score: ${assignment.maxScore}
Rubric: ${rubric || 'Grade based on completeness, accuracy, and quality.'}

Student Submission:
${submission.content}

Provide your response in JSON format:
{
  "suggestedScore": <number between 0 and ${assignment.maxScore}>,
  "feedback": "<constructive feedback for the student>"
}`;

    const messages = [
      { role: 'system', content: 'You are an expert educator evaluating student assignments. Be fair, constructive, and precise.' },
      { role: 'user', content: prompt },
    ];

    const aiResponse = await chatCompletion(messages, { temperature: 0.3 });

    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let evaluation = { suggestedScore: 0, feedback: 'Could not parse AI response' };

    if (jsonMatch) {
      try {
        evaluation = JSON.parse(jsonMatch[0]);
      } catch {
        // Use raw response if JSON parsing fails
        evaluation.feedback = aiResponse;
      }
    }

    res.json({
      submissionId,
      suggestedScore: evaluation.suggestedScore,
      feedback: evaluation.feedback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
