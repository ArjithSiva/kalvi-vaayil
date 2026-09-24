import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    certificateId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['review_ready', 'approved', 'rejected'],
      default: 'review_ready',
    },
    attendancePercent: { type: Number },
    testScore: { type: Number },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: { type: Date },
    pdfFileId: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS
  },
  { timestamps: true }
);

certificateSchema.index({ user: 1, workshop: 1 }, { unique: true });
// `certificateId` already declares `unique: true` above, which creates its own
// index — declaring a second one here produced a duplicate-index warning at boot.

export default mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
