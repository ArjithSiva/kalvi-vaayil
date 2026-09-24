import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    type: { type: String, enum: ['pdf', 'doc', 'link'], required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    fileId: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS file ID
    externalUrl: { type: String, default: '' },
    extractedText: { type: String, default: '' }, // For AI grounding
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetAudience: { type: String, enum: ['online', 'physical', 'all'], default: 'all' },
  },
  { timestamps: true }
);

resourceSchema.index({ workshop: 1 });

export default mongoose.models.Resource || mongoose.model('Resource', resourceSchema);
