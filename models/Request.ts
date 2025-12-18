import mongoose from 'mongoose';
import { RequestStatus, ActionType } from '../lib/types';

const approvalHistorySchema = new mongoose.Schema({
  action: { type: String, enum: Object.values(ActionType), required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
  budgetAvailable: { type: Boolean },
  forwardedMessage: { type: String },
  attachments: [{ type: String }],
  previousStatus: { type: String, enum: Object.values(RequestStatus) },
  newStatus: { type: String, enum: Object.values(RequestStatus) },
  // 🔹 Accountant budget trail (optional)
  budgetAllocated: { type: Number },
  budgetSpent: { type: Number },
  budgetBalance: { type: Number },
  // 🔹 Clarification tracking
  clarificationTarget: { type: String }, // For Dean -> Department clarifications
  clarificationType: { type: String }, // For Institution Manager -> SOP/Accountant
  timestamp: { type: Date, default: Date.now },
});

const requestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    purpose: { type: String, required: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    costEstimate: { type: Number, default: 0 },
    expenseCategory: { type: String, default: '' },
    sopReference: { type: String },
    attachments: [{ type: String, required: true, validate: [(v: string[]) => v.length > 0, 'At least one document is required'],}],

    // 🔹 NEW: Accountant budget fields (live values for current request)
    budgetAllocated: { type: Number, default: 0 },
    budgetSpent: { type: Number, default: 0 },
    budgetBalance: { type: Number, default: 0 },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.SUBMITTED,
    },
    history: [approvalHistorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Request || mongoose.model('Request', requestSchema);
