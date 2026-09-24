import mongoose from 'mongoose';

const sessionJoinSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sessionJoinSchema.index({ session: 1, user: 1 }, { unique: true });
sessionJoinSchema.index({ session: 1, joinedAt: -1 });

export default mongoose.models.SessionJoin || mongoose.model('SessionJoin', sessionJoinSchema);
