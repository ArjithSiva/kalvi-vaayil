import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'organizer', 'participant'], required: true, default: 'participant' },
    phone: { type: String, default: '' },
    profilePic: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS file ID
    bio: { type: String, default: '' },
    qualifications: [{ type: String }],
    degree: { type: String, default: '' },
    socialLinks: {
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    interests: [{ type: String }],
    language: { type: String, enum: ['en', 'ta'], default: 'en' },
    darkMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

// Auto-generate username from name if not set
userSchema.pre('save', function (next) {
  if (!this.username && this.name) {
    this.username = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
  }
  next();
});

export default mongoose.models.User || mongoose.model('User', userSchema);
