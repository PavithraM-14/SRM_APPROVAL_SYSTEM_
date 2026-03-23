import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import { getCurrentUser } from '../../../../lib/auth';
import { RequestStatus, UserRole } from '../../../../lib/types';
import {
  ESCALATION_HIERARCHY,
  isHigherRole,
} from '../../../../lib/escalation-hierarchy';

// Roles allowed to access the flagged requests endpoint
// Must stay in sync with the nav items in dashboard/layout.tsx
const ALLOWED_ROLES = new Set<UserRole>([
  UserRole.ACCOUNTANT,
  UserRole.VP,
  UserRole.VP_RESEARCH,
  UserRole.VP_ACADEMIC,
  UserRole.VP_ADMIN,
  UserRole.RESEARCH_DIRECTOR,
  UserRole.HEAD_OF_INSTITUTION,
  UserRole.DEAN,
  UserRole.MMA,
  UserRole.HR,
  UserRole.AUDIT,
  UserRole.IT,
  UserRole.CHIEF_DIRECTOR,
  UserRole.CHAIRMAN,
]);

const TERMINAL_STATUSES = [RequestStatus.APPROVED, RequestStatus.REJECTED];

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.role as UserRole;

    if (!ALLOWED_ROLES.has(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const countOnly = request.nextUrl.searchParams.get('countOnly') === 'true';

    // Query all flagged, non-terminal requests
    const flaggedRequests = await Request.find({
      'escalation.flagged': true,
      status: { $nin: TERMINAL_STATUSES },
    })
      .populate('requester', 'name email')
      .lean();

    // Filter: roles in the escalation hierarchy see requests stalled at their level or below.
    // Roles outside the hierarchy (e.g. vp_research, accountant, mma) see all flagged requests.
    const visible = flaggedRequests.filter((req) => {
      const stalledRole = req.escalation?.stalledRole as UserRole | undefined;
      if (!stalledRole) return false;
      const inHierarchy = ESCALATION_HIERARCHY.includes(userRole);
      if (!inHierarchy) return true;
      return stalledRole === userRole || isHigherRole(userRole, stalledRole);
    });

    if (countOnly) {
      // Badge count: actionable = no higher role has acted yet
      const actionable = visible.filter((req) => !req.escalation?.actedByHigherRole);
      return NextResponse.json({ count: actionable.length });
    }

    const now = Date.now();

    const result = visible.map((req) => ({
      _id: req._id,
      requestId: req.requestId,
      title: req.title,
      college: req.college,
      department: req.department,
      requester: req.requester,
      status: req.status,
      escalation: {
        flagged: req.escalation?.flagged ?? false,
        flaggedAt: req.escalation?.flaggedAt ?? null,
        stalledRole: req.escalation?.stalledRole ?? null,
        reminderSent: req.escalation?.reminderSent ?? false,
        actedByHigherRole: req.escalation?.actedByHigherRole ?? null,
        actedByHigherRoleAt: req.escalation?.actedByHigherRoleAt ?? null,
      },
      timeSinceFlagged: req.escalation?.flaggedAt
        ? now - new Date(req.escalation.flaggedAt).getTime()
        : 0,
    }));

    return NextResponse.json({ requests: result, count: result.length });
  } catch (error) {
    console.error('[flagged] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flagged requests', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
