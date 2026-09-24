import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

waitlistSchema.index({ workshop: 1, position: 1 });
waitlistSchema.index({ workshop: 1, user: 1 }, { unique: true });

export default mongoose.models.Waitlist || mongoose.model('Waitlist', waitlistSchema);
