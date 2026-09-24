import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    mode: { type: String, enum: ['online', 'physical', 'both'], default: 'online' },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

registrationSchema.index({ user: 1, workshop: 1 }, { unique: true });
registrationSchema.index({ workshop: 1, status: 1 });

export default mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
