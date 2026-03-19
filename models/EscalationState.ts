import mongoose from 'mongoose';

/**
 * Single-document collection used as a distributed lock for the escalation runner.
 * All serverless instances share this document to coordinate who runs escalation
 * and when it last ran — no external cron needed.
 */
const escalationStateSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  lastRunAt: { type: Date, default: null },
  runningUntil: { type: Date, default: null }, // optimistic lock expiry
});

export default mongoose.models.EscalationState ||
  mongoose.model('EscalationState', escalationStateSchema);
