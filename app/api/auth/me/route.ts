import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { maybeRunEscalation } from '../../../../lib/escalation-scheduler';

export async function GET() {
  // Piggyback escalation check on every auth ping — fire-and-forget, never blocks
  maybeRunEscalation();

  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}