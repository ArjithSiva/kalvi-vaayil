import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workshopRating: { type: Number, required: true, min: 1, max: 5 },
    organizerRating: { type: Number, required: true, min: 1, max: 5 },
    workshopComment: { type: String, default: '' },
    organizerComment: { type: String, default: '' },
  },
  { timestamps: true }
);

feedbackSchema.index({ workshop: 1, user: 1 }, { unique: true });

export default mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
