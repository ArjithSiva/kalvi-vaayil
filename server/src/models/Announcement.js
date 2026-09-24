import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

announcementSchema.index({ workshop: 1, createdAt: -1 });

export default mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
