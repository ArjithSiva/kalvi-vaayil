import CommunityPost from '../models/CommunityPost.js';
import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import { getGridFSBucket } from '../config/db.js';
import { createNotification } from '../services/notification.js';

export async function createPost(req, res) {
  try {
    const { workshopId } = req.params;
    const { content, isPrivate, parentPost } = req.body;

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Check registration (participants must be registered; organizers/admins always allowed)
    if (req.user.role === 'participant') {
      const reg = await Registration.findOne({ user: req.user._id, workshop: workshopId, status: 'confirmed' });
      if (!reg) return res.status(403).json({ error: 'You must be registered for this workshop' });
    }

    const post = await CommunityPost.create({
      workshop: workshopId,
      author: req.user._id,
      content,
      isPrivate: isPrivate || false,
      parentPost: parentPost || null,
      attachments: req.body.attachments || [],
    });

    // Notify organizer about new question
    if (!parentPost) {
      await createNotification(
        workshop.organizer,
        'community_reply',
        'New Question',
        `A new question was posted in "${workshop.title}".`,
        { type: 'communityPost', id: post._id }
      );
    }

    // If this is a reply, notify the parent post author
    if (parentPost) {
      const parent = await CommunityPost.findById(parentPost);
      if (parent && parent.author.toString() !== req.user._id.toString()) {
        await createNotification(
          parent.author,
          'community_reply',
          'New Reply',
          'Someone replied to your question.',
          { type: 'communityPost', id: post._id }
        );
      }
    }

    const populated = await CommunityPost.findById(post._id)
      .populate('author', 'name profilePic');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listPosts(req, res) {
  try {
    const { workshopId } = req.params;

    // Build filter: show public posts + private posts authored by or involving the current user
    const filter = { workshop: workshopId, parentPost: null };

    if (req.user.role === 'participant') {
      filter.$or = [
        { isPrivate: false },
        { isPrivate: true, author: req.user._id },
      ];
    }
    // Organizers and admins see everything

    const posts = await CommunityPost.find(filter)
      .populate('author', 'name profilePic')
      .sort({ createdAt: -1 });

    // Load replies for each post
    const result = [];
    for (const post of posts) {
      const replyFilter = { parentPost: post._id };
      if (req.user.role === 'participant') {
        replyFilter.$or = [
          { isPrivate: false },
          { isPrivate: true, $or: [{ author: req.user._id }, { parentPost: post._id }] },
        ];
      }

      const replies = await CommunityPost.find({ parentPost: post._id })
        .populate('author', 'name profilePic')
        .sort({ createdAt: 1 });

      // Filter private replies for participants
      const visibleReplies = req.user.role === 'participant'
        ? replies.filter((r) => !r.isPrivate || r.author._id.toString() === req.user._id.toString() || post.author._id.toString() === req.user._id.toString())
        : replies;

      result.push({ ...post.toJSON(), replies: visibleReplies });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function uploadPostAttachment(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    uploadStream.end(req.file.buffer);
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    res.json({ fileId: uploadStream.id, name: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
