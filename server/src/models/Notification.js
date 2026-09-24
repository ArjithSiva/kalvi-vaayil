import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'registration_confirmed',
        'session_reminder',
        'certificate_ready',
        'new_workshop',
        'workshop_recommendation',
        'announcement',
        'community_reply',
        'broadcast',
        'gate_pass',
        'waitlist_promoted',
        'attendance_check',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    relatedEntityType: { type: String, default: '' },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
