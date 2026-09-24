import mongoose from 'mongoose';

const presenceCheckSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'PresenceChallenge' },
    confirmedAt: { type: Date, default: Date.now },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
  },
  { timestamps: true }
);

presenceCheckSchema.index({ session: 1, user: 1 });

export default mongoose.models.PresenceCheck || mongoose.model('PresenceCheck', presenceCheckSchema);
