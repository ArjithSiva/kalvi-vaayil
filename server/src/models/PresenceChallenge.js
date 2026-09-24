import mongoose from 'mongoose';

/**
 * One attendance-check ("are you still there?") issued for a live session.
 *
 * Challenges are persisted (rather than generated per request) so that every
 * participant in a session is asked the same question in the same window, the
 * in-app notification can point at a real record, and confirmations can be
 * validated against what the server actually issued.
 *
 * `sequence` is the scheduled slot number (1, 2, 3 ... one per alert interval
 * since the session started). It is unique per session, which makes issuing
 * idempotent: the background scheduler and the lazy on-poll path can race and
 * only one of them will ever create a given slot. Manually triggered checks
 * leave `sequence` unset and are exempt from the unique index.
 */
const presenceChallengeSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    sequence: { type: Number },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    trigger: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  },
  { timestamps: true }
);

presenceChallengeSchema.index({ session: 1, windowEnd: -1 });
presenceChallengeSchema.index(
  { session: 1, sequence: 1 },
  { unique: true, partialFilterExpression: { sequence: { $type: 'number' } } }
);

export default mongoose.models.PresenceChallenge || mongoose.model('PresenceChallenge', presenceChallengeSchema);
