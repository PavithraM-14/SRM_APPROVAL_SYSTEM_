/**
 * True interval-based escalation runner.
 * Started once via instrumentation.ts when the Next.js server boots.
 * Runs escalation every 60 seconds regardless of incoming traffic.
 */
import { runEscalation } from './escalation-runner';
import connectDB from './mongodb';

const INTERVAL_MS = 60 * 1000; // every 60 seconds

let started = false;

export function startEscalationTimer(): void {
  if (started) return;
  started = true;

  console.log('[escalation-timer] Starting — will check every 60s');

  // Run once immediately on boot, then on interval
  runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

async function runOnce(): Promise<void> {
  try {
    await connectDB();
    const result = await runEscalation();
    if (result.reminded > 0 || result.flagged > 0 || result.errors.length > 0) {
      console.log('[escalation-timer] run result:', result);
    }
  } catch (err) {
    console.error('[escalation-timer] error:', err);
  }
}
