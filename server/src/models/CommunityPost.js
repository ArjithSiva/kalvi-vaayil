import mongoose from 'mongoose';

const communityPostSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    isPrivate: { type: Boolean, default: false },
    parentPost: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', default: null },
    attachments: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId }, // GridFS
        name: { type: String },
      },
    ],
  },
  { timestamps: true }
);

communityPostSchema.index({ workshop: 1, createdAt: -1 });
communityPostSchema.index({ parentPost: 1 });

export default mongoose.models.CommunityPost || mongoose.model('CommunityPost', communityPostSchema);
