import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema(
  {
    minAttendancePercent: { type: Number, default: 90, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Singleton — always query with findOne
export default mongoose.models.AppSettings || mongoose.model('AppSettings', appSettingsSchema);
