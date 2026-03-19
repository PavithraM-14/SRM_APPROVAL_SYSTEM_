/**
 * Serverless-compatible escalation scheduler.
 *
 * Strategy: piggyback on incoming requests. Each invocation checks a shared
 * MongoDB document to decide whether escalation is due. An optimistic lock
 * (runningUntil TTL) prevents multiple concurrent serverless instances from
 * running escalation simultaneously.
 *
 * Call `maybeRunEscalation()` from any frequently-hit API route.
 */
import connectDB from './mongodb';
import EscalationState from '../models/EscalationState';
import { runEscalation } from './escalation-runner';

const POLL_INTERVAL_MS = 60 * 1000;   // run at most once per minute
const LOCK_TTL_MS      = 30 * 1000;   // lock expires after 30s (guards against crashes)

/**
 * Called on each API request. Runs escalation if:
 *  - at least POLL_INTERVAL_MS has passed since the last run, AND
 *  - no other instance holds the lock right now.
 *
 * Fire-and-forget: never throws, never blocks the caller.
 */
export function maybeRunEscalation(): void {
  _tryRun().catch((e) => console.error('[escalation-scheduler] unexpected error:', e));
}

async function _tryRun(): Promise<void> {
  try {
    await connectDB();

    const now = new Date();
    const lockExpiry = new Date(now.getTime() + LOCK_TTL_MS);
    const runCutoff  = new Date(now.getTime() - POLL_INTERVAL_MS);

    // Atomically acquire the lock only if:
    //   - lastRunAt is null or older than POLL_INTERVAL_MS, AND
    //   - runningUntil is null or already expired (no live lock held)
    const acquired = await EscalationState.findOneAndUpdate(
      {
        _id: 'singleton',
        $and: [
          { $or: [{ lastRunAt: null }, { lastRunAt: { $lte: runCutoff } }] },
          { $or: [{ runningUntil: null }, { runningUntil: { $lte: now } }] },
        ],
      },
      { $set: { runningUntil: lockExpiry } },
      { upsert: true, new: false, setDefaultsOnInsert: true }
    ).catch(() => null); // upsert race on first insert — safe to ignore

    if (!acquired) return; // another instance is running or it's too soon

    try {
      const result = await runEscalation();
      if (result.reminded > 0 || result.flagged > 0 || result.errors.length > 0) {
        console.log('[escalation-scheduler] run result:', result);
      }
    } finally {
      // Release lock and record completion time
      await EscalationState.updateOne(
        { _id: 'singleton' },
        { $set: { lastRunAt: new Date(), runningUntil: null } }
      );
    }
  } catch (e) {
    console.error('[escalation-scheduler] _tryRun error:', e);
  }
}
