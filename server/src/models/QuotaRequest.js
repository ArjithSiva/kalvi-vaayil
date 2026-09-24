import mongoose from 'mongoose';

const quotaRequestSchema = new mongoose.Schema(
  {
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['physical', 'online', 'workshop'], required: true },
    currentLimit: { type: Number, required: true },
    requestedLimit: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

quotaRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.QuotaRequest || mongoose.model('QuotaRequest', quotaRequestSchema);
