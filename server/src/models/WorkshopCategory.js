import mongoose from 'mongoose';

const workshopCategorySchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      ta: { type: String, default: '' },
    },
    description: {
      en: { type: String, default: '' },
      ta: { type: String, default: '' },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.WorkshopCategory || mongoose.model('WorkshopCategory', workshopCategorySchema);
