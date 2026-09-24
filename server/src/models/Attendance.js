import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    method: { type: String, enum: ['manual', 'qr', 'csv'], required: true },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attendanceSchema.index({ session: 1, user: 1 }, { unique: true });
attendanceSchema.index({ workshop: 1, user: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
