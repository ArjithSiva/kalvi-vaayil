import QuotaRequest from '../models/QuotaRequest.js';
import OrganizerSettings from '../models/OrganizerSettings.js';

// Organizer submits a quota increase request
export async function createQuotaRequest(req, res) {
  try {
    const { type, requestedLimit, reason } = req.body;

    if (!type || !requestedLimit || !reason) {
      return res.status(400).json({ error: 'Type, requested limit, and reason are required' });
    }

    const settings = await OrganizerSettings.findOne({ user: req.user._id });
    if (!settings) return res.status(404).json({ error: 'Organizer settings not found' });

    let currentLimit;
    if (type === 'physical') currentLimit = settings.maxPhysicalEventsPerMonth;
    else if (type === 'online') currentLimit = settings.maxOnlineEventsPerMonth;
    else currentLimit = settings.maxWorkshopsPerWeek;

    // Check for existing pending request
    const existingPending = await QuotaRequest.findOne({
      organizer: req.user._id,
      type,
      status: 'pending',
    });
    if (existingPending) {
      return res.status(409).json({ error: 'You already have a pending request for this category' });
    }

    const request = await QuotaRequest.create({
      organizer: req.user._id,
      type,
      currentLimit,
      requestedLimit,
      reason,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Organizer views their own requests
export async function getMyRequests(req, res) {
  try {
    const requests = await QuotaRequest.find({ organizer: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin: list all pending requests
export async function listPendingRequests(req, res) {
  try {
    const requests = await QuotaRequest.find({ status: 'pending' })
      .populate('organizer', 'name email')
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin: list all requests (with filter)
export async function listAllRequests(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await QuotaRequest.find(filter)
      .populate('organizer', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin: approve or reject a request
export async function reviewQuotaRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const request = await QuotaRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already reviewed' });
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote || '';
    await request.save();

    // If approved, update the organizer settings
    if (status === 'approved') {
      const settings = await OrganizerSettings.findOne({ user: request.organizer });
      if (settings) {
        if (request.type === 'physical') settings.maxPhysicalEventsPerMonth = request.requestedLimit;
        else if (request.type === 'online') settings.maxOnlineEventsPerMonth = request.requestedLimit;
        else settings.maxWorkshopsPerWeek = request.requestedLimit;
        await settings.save();
      }
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
