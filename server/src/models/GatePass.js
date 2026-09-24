import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const gatePassSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    scannedAt: { type: Date, default: null },
    isValid: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// `token` already declares `unique: true` inline — a second schema-level index
// on the same field produced a duplicate-index warning at boot.
gatePassSchema.index({ workshop: 1, user: 1 });

// Generate JWT-signed token
gatePassSchema.methods.generateToken = function () {
  const payload = {
    userId: this.user.toString(),
    workshopId: this.workshop.toString(),
    registrationId: this.registration.toString(),
    passId: this._id.toString(),
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
};

// Verify token
gatePassSchema.statics.verifyToken = function (token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
};

export default mongoose.models.GatePass || mongoose.model('GatePass', gatePassSchema);
