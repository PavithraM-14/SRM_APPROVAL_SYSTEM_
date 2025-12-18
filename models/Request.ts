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
  clarificationRequest: { type: String }, // Question/note when rejecting for clarification
  clarificationResponse: { type: String }, // Response from lower level user
  clarificationAttachments: [{ type: String }], // Attachments for clarification response
  requiresClarification: { type: Boolean, default: false }, // Flag to indicate this is a clarification request
  timestamp: { type: Date, default: Date.now },
});

const requestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    purpose: { type: String, required: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    costEstimate: { type: Number, required: true },
    expenseCategory: { type: String, required: true },
    sopReference: { type: String },
    attachments: [{ type: String }],

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
      default: RequestStatus.MANAGER_REVIEW,
    },
    pendingClarification: { type: Boolean, default: false }, // Flag to indicate request is pending clarification
    clarificationLevel: { type: String }, // The level that needs to provide clarification
    history: [approvalHistorySchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Request || mongoose.model('Request', requestSchema);
