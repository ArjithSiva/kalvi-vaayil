import mongoose from 'mongoose';

const organizerSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isActive: { type: Boolean, default: true },
    accessFrom: { type: Date, default: null },
    accessUntil: { type: Date, default: null },
    maxWorkshopsPerWeek: { type: Number, default: 5 },
    maxPhysicalEventsPerMonth: { type: Number, default: 4 },
    maxOnlineEventsPerMonth: { type: Number, default: 10 },
    canHostPhysicalEvents: { type: Boolean, default: false },
    maxWorkshopsLimit: { type: Number, default: 10 },
    maxParticipantsPerWorkshop: { type: Number, default: 100 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.OrganizerSettings || mongoose.model('OrganizerSettings', organizerSettingsSchema);
