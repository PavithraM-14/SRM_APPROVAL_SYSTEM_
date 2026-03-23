/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (both dev and prod).
 * Used to kick off the escalation background timer.
 */
export async function register() {
  // Only run in the Node.js runtime (not edge), and not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startEscalationTimer } = await import('./lib/escalation-timer');
    startEscalationTimer();
  }
}
