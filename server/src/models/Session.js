import mongoose from 'mongoose';
import crypto from 'crypto';

const sessionSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    googleMeetLink: { type: String, default: '' },
    attendanceMode: {
      type: String,
      enum: ['manual', 'qr', 'csv'],
      default: 'manual',
    },
    qrToken: { type: String, default: null },
    qrExpiresAt: { type: Date, default: null },
    resources: [{
      title: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ['slides', 'code', 'recording', 'document'], default: 'document' },
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

sessionSchema.index({ workshop: 1, date: 1 });

// Generate a QR token before saving if attendance mode is QR
sessionSchema.pre('save', function (next) {
  if (this.attendanceMode === 'qr' && this.isModified('attendanceMode')) {
    this.qrToken = crypto.randomUUID();
    // Default expiry: 2 hours from session start
    if (!this.qrExpiresAt && this.startTime) {
      this.qrExpiresAt = new Date(this.startTime.getTime() + 2 * 60 * 60 * 1000);
    }
  }
  next();
});

export default mongoose.models.Session || mongoose.model('Session', sessionSchema);
