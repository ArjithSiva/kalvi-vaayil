import Resource from '../models/Resource.js';
import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';
import { getGridFSBucket } from '../config/db.js';
import { extractText } from '../services/textExtract.js';

export async function uploadResource(req, res) {
  try {
    const { workshopId } = req.params;
    const { title, description, type, externalUrl } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (type === 'link') {
      const resource = await Resource.create({
        workshop: workshopId,
        type: 'link',
        title,
        description: description || '',
        externalUrl,
        uploadedBy: req.user._id,
        targetAudience: req.body.target || 'all',
      });
      // Notify registered participants about new resource
      await notifyResourceUpload(workshopId, title, req.user.name, resource.targetAudience);
      return res.status(201).json(resource);
    }

    // File upload to GridFS
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { workshop: workshopId, uploadedBy: req.user._id.toString() },
    });

    uploadStream.end(req.file.buffer);

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    // Extract text for AI grounding
    let extractedText = '';
    if (req.file.mimetype === 'application/pdf' || req.file.mimetype.includes('wordprocessingml') || req.file.mimetype === 'application/msword') {
      extractedText = await extractText(req.file.buffer, req.file.mimetype);
    }

    const resource = await Resource.create({
      workshop: workshopId,
      type: type || (req.file.mimetype === 'application/pdf' ? 'pdf' : 'doc'),
      title,
      description: description || '',
      fileId: uploadStream.id,
      extractedText,
      uploadedBy: req.user._id,
      targetAudience: req.body.target || 'all',
    });

    // Notify registered participants about new resource
    await notifyResourceUpload(workshopId, title, req.user.name, resource.targetAudience);

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listResources(req, res) {
  try {
    const { workshopId } = req.params;
    const resources = await Resource.find({ workshop: workshopId })
      .populate('uploadedBy', 'name')
      .select('-extractedText')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function downloadResource(req, res) {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    // Authorization check
    const workshop = await Workshop.findById(resource.workshop);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    const isOrganizer = workshop.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isRegistered = await Registration.findOne({
      user: req.user._id,
      workshop: resource.workshop,
      status: 'confirmed',
    });

    if (!isOrganizer && !isAdmin && !isRegistered) {
      return res.status(403).json({ error: 'Not authorized to access this resource' });
    }

    if (resource.type === 'link') {
      return res.json({ url: resource.externalUrl });
    }

    if (!resource.fileId) return res.status(404).json({ error: 'File not found' });

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(resource.fileId);

    downloadStream.on('error', () => {
      res.status(404).json({ error: 'File not found in storage' });
    });

    res.set('Content-Type', 'application/octet-stream');
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Notify participants based on targetAudience
async function notifyResourceUpload(workshopId, resourceTitle, organizerName, targetAudience = 'all') {
  try {
    // Build filter based on targetAudience
    const registrationFilter = { workshop: workshopId, status: 'confirmed' };
    if (targetAudience !== 'all') {
      registrationFilter.mode = targetAudience;
    }

    const registrations = await Registration.find(registrationFilter).select('user mode');

    if (registrations.length === 0) return;

    const onlineCount = registrations.filter((r) => r.mode === 'online' || r.mode === 'both').length;
    const physicalCount = registrations.filter((r) => r.mode === 'physical' || r.mode === 'both').length;

    const notifications = registrations.map((r) => ({
      user: r.user,
      type: 'announcement',
      title: 'New Resource Available',
      message: `${organizerName || 'The organizer'} published a new resource: "${resourceTitle}". Available for ${registrations.length} participants (${onlineCount} online, ${physicalCount} physical).`,
      relatedEntityType: 'workshop',
      relatedEntityId: workshopId,
    }));

    await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Failed to send resource upload notifications:', err.message);
  }
}

export async function deleteResource(req, res) {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const workshop = await Workshop.findById(resource.workshop);
    if (workshop.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete from GridFS
    if (resource.fileId) {
      const bucket = getGridFSBucket();
      await bucket.delete(resource.fileId);
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
