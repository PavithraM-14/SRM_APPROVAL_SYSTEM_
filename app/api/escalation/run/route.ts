import { NextRequest, NextResponse } from 'next/server';
import { runEscalation } from '../../../../lib/escalation-runner';

/**
 * POST /api/escalation/run
 * Manual trigger endpoint (useful for testing / admin use).
 * The scheduler also runs this logic automatically every 60s in-process.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-escalation-secret');
  if (!secret || secret !== process.env.ESCALATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
