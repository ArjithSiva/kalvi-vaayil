import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    fileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    fileName: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignment: 1, user: 1 }, { unique: true });

export default mongoose.models.AssignmentSubmission || mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
