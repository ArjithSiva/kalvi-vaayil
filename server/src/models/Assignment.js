import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date },
    maxScore: { type: Number, default: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const assignmentScoreSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    feedback: { type: String, default: '' },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assignmentScoreSchema.index({ assignment: 1, user: 1 }, { unique: true });

const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
const AssignmentScore = mongoose.models.AssignmentScore || mongoose.model('AssignmentScore', assignmentScoreSchema);

export { Assignment, AssignmentScore };
export default Assignment;
