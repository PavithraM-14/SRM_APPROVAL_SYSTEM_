import { NextResponse } from 'next/server';
import { runEscalation } from '../../../../lib/escalation-runner';

/**
 * POST /api/escalation/run
 * Manual admin trigger — runs escalation immediately regardless of the
 * internal scheduler's cooldown. Restrict access via middleware or remove
 * this route entirely in production if not needed.
 */
export async function POST() {
  try {
    const result = await runEscalation();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('[escalation/run] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
