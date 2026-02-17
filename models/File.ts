import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    filename: { 
      type: String, 
      required: true 
    },
    originalName: { 
      type: String, 
      required: true 
    },
    mimeType: { 
      type: String, 
      required: true 
    },
    size: { 
      type: Number, 
      required: true 
    },
    data: { 
      type: Buffer, 
      required: true 
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isQuery: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
fileSchema.index({ filename: 1 });
fileSchema.index({ uploadedBy: 1 });

export default mongoose.models.File || mongoose.model('File', fileSchema);
