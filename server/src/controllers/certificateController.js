import crypto from 'crypto';
import Certificate from '../models/Certificate.js';
import Workshop from '../models/Workshop.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import { Assignment, AssignmentScore } from '../models/Assignment.js';
import Registration from '../models/Registration.js';
import AppSettings from '../models/AppSettings.js';
import { getGridFSBucket } from '../config/db.js';
import { generateCertificatePDF } from '../services/certificate.js';
import { createNotification } from '../services/notification.js';

// Get or create certificate when attendance and quiz requirements are met
export async function checkCertificateEligibility(req, res) {
  try {
    const { workshopId, userId } = req.params;
    const { quizScore } = req.body || {};
    const targetUser = userId || req.user._id;

    const [workshop, totalSessions, presentCount, settings] = await Promise.all([
      Workshop.findById(workshopId),
      Session.countDocuments({ workshop: workshopId }),
      Attendance.countDocuments({ workshop: workshopId, user: targetUser, status: 'present' }),
      AppSettings.findOne(),
    ]);

    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
    const minPercent = Math.max(settings?.minAttendancePercent || 90, 80);

    // Check quiz requirement
    const hasQuiz = workshop.quiz && workshop.quiz.length > 0;
    const passingScore = workshop.passingScore || 60;
    const quizPassed = !hasQuiz || (quizScore != null && quizScore >= passingScore);

    // Check if certificate already exists
    let certificate = await Certificate.findOne({ user: targetUser, workshop: workshopId });

    if (percentage >= minPercent && quizPassed && !certificate) {
      // Calculate test score from assignments
      const assignments = await Assignment.find({ workshop: workshopId });
      let totalScore = 0;
      let maxTotal = 0;
      for (const a of assignments) {
        const score = await AssignmentScore.findOne({ assignment: a._id, user: targetUser });
        if (score) {
          totalScore += score.score;
          maxTotal += a.maxScore;
        }
      }
      const testScore = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : (quizScore ?? null);

      // Auto-approve when all criteria are met
      certificate = await Certificate.create({
        user: targetUser,
        workshop: workshopId,
        certificateId: crypto.randomUUID(),
        status: 'approved',
        attendancePercent: percentage,
        testScore,
        issuedAt: new Date(),
      });
    }

    if (certificate) {
      return res.json(certificate);
    }

    res.json({
      eligible: false,
      percentage,
      minPercent,
      quizRequired: hasQuiz,
      quizPassed,
      passingScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Organizer reviews certificates
export async function listReviewReady(req, res) {
  try {
    const { workshopId } = req.params;
    const certificates = await Certificate.find({
      workshop: workshopId,
      status: 'review_ready',
    }).populate('user', 'name email profilePic');

    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function reviewCertificate(req, res) {
  try {
    const { certificateId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const certificate = await Certificate.findById(certificateId)
      .populate('workshop', 'title organizer');

    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });

    // Only the workshop organizer or admin can review
    if (certificate.workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    certificate.status = status;
    certificate.reviewedBy = req.user._id;

    if (status === 'approved') {
      certificate.issuedAt = new Date();
      // Generate PDF
      const populated = await Certificate.findById(certificate._id)
        .populate('user', 'name')
        .populate('workshop', 'title');
      const pdfFileId = await generateCertificatePDF(populated);
      certificate.pdfFileId = pdfFileId;

      // Notify participant
      await createNotification(
        certificate.user._id,
        'certificate_ready',
        'Certificate Ready',
        `Your certificate for "${certificate.workshop.title}" is ready to download.`,
        { type: 'certificate', id: certificate._id }
      );
    }

    await certificate.save();
    res.json(certificate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get my certificates
export async function getMyCertificates(req, res) {
  try {
    const certificates = await Certificate.find({ user: req.user._id, status: 'approved' })
      .populate('workshop', 'title')
      .sort({ issuedAt: -1 });
    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Download certificate PDF
export async function downloadCertificate(req, res) {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate || certificate.status !== 'approved') {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Only the owner or admin can download
    if (certificate.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!certificate.pdfFileId) return res.status(404).json({ error: 'PDF not generated' });

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(certificate.pdfFileId);
    res.set('Content-Type', 'application/pdf');
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Public verification — NO AUTH REQUIRED
export async function verifyCertificate(req, res) {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate('user', 'name')
      .populate('workshop', 'title');

    if (!certificate || certificate.status !== 'approved') {
      return res.json({
        valid: false,
        message: 'Certificate not found or not valid',
      });
    }

    // Only expose: valid, name, workshop, date, certificateId (for LinkedIn integration)
    res.json({
      valid: true,
      participantName: certificate.user?.name,
      workshopTitle: certificate.workshop?.title,
      issuedAt: certificate.issuedAt,
      certificateId: certificate.certificateId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
