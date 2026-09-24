import mongoose from 'mongoose';

const workshopSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    topics: [{ type: String }],
    type: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopCategory' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schedule: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    capacity: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: ['online', 'physical', 'hybrid'], default: 'online' },
    venue: { type: String, default: '' },
    venueLocation: {
      address: { type: String, default: '' },
      mapLink: { type: String, default: '' },
      roomNumber: { type: String, default: '' },
    },
    durationDays: { type: Number, default: 1, min: 1 },
    scheduleTimings: [{
      date: { type: Date },
      startTime: { type: String },
      endTime: { type: String },
      topic: { type: String, default: '' },
    }],
    totalClassesCount: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'completed', 'cancelled'],
      default: 'draft',
    },
    highlights: {
      images: [{ type: String }],
      videoUrls: [{ type: String }],
      highlightsText: [{ type: String }],
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    attendanceSettings: {
      alertIntervalMinutes: { type: Number, default: 5, min: 1 },
      maxAllowedMissedAlerts: { type: Number, default: 3, min: 0 },
    },
    quiz: [{
      question: { type: String },
      options: [{ type: String }],
      correctOption: { type: Number },
    }],
    passingScore: { type: Number, default: 60, min: 0, max: 100 },
    announcements: [{
      title: { type: String, required: true },
      message: { type: String, required: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

workshopSchema.index({ organizer: 1, createdAt: -1 });
workshopSchema.index({ status: 1, 'schedule.startDate': 1 });

export default mongoose.models.Workshop || mongoose.model('Workshop', workshopSchema);
