import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
import { getCurrentUser } from '../../../lib/auth';
import { RequestStatus, ActionType, UserRole } from '../../../lib/types';
import { filterRequestsByVisibility, analyzeRequestVisibility } from '../../../lib/request-visibility';
import mongoose from 'mongoose';
import { approvalEngine } from '../../../lib/approval-engine';

// Function to get role-based filter for pending approvals
function getPendingApprovalsFilter(userRole: UserRole, userId: any) {
  let filter: any = {};

  // For now, show all non-completed requests to any non-requester role
  // This will help debug the issue and ensure approvers can see requests
  if (userRole !== UserRole.REQUESTER) {
    filter.status = {
      $nin: [RequestStatus.APPROVED, RequestStatus.REJECTED]
    };
  } else {
    // Requesters should not see any approvals
    filter._id = { $exists: false };
  }

  return filter;
}

export async function GET(request: NextRequest) {
  console.log('[DEBUG] Approvals API called');
  try {
    await connectDB();
    const user = await getCurrentUser();

    console.log('[DEBUG] Current user:', user ? { id: user.id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('[DEBUG] No user found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requesters don't have pending approvals to process
    if (user.role === UserRole.REQUESTER) {
      console.log('[DEBUG] User is requester, redirecting to requests');
      return NextResponse.json({
        error: 'Requesters should use /api/requests endpoint',
        requests: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status'); // Get status filter from query

    console.log('[DEBUG] Query params:', { page, limit, statusFilter });
    console.log('[DEBUG] Status filter type:', typeof statusFilter, 'Value:', statusFilter);

    // Get user's database record
    let dbUser = null;
    if (mongoose.Types.ObjectId.isValid(user.id)) {
      dbUser = await User.findById(user.id);
    } else {
      dbUser = await User.findOne({ email: user.email });
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all requests and apply sophisticated visibility filtering
    const allRequests = await Request.find({})
      .populate('requester', 'name email empId role')
      .populate('history.actor', 'name email empId role')
      .sort({ updatedAt: -1 })
      .lean(); // Convert to plain objects

    console.log('[DEBUG] Total requests in system:', allRequests.length);

    // Debug: Check if there are any MANAGER_REVIEW requests
    const managerReviewRequests = allRequests.filter(r => r.status === RequestStatus.MANAGER_REVIEW);
    console.log('[DEBUG] Total MANAGER_REVIEW requests in system:', managerReviewRequests.length);

    // Debug: Check required approvers for MANAGER_REVIEW
    const requiredApprovers = approvalEngine.getRequiredApprover(RequestStatus.MANAGER_REVIEW);
    console.log('[DEBUG] Required approvers for MANAGER_REVIEW:', requiredApprovers);
    console.log('[DEBUG] User role:', user.role);
    console.log('[DEBUG] Is user authorized for MANAGER_REVIEW?', requiredApprovers.includes(user.role as UserRole));

    // Determine visibility mode based on status filter
    let visibilityMode: 'pending' | 'all' = 'pending';
    let visibleRequests: any[] = [];

    if (statusFilter === 'approved') {
      // Show all requests that the user has approved (not just finally approved ones)
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        user.role as UserRole,
        dbUser._id.toString(),
        dbUser.college,
        'approved'
      );
      console.log('[DEBUG] Filtered to user-approved requests:', visibleRequests.length);
    } else if (statusFilter === 'rejected') {
      const rejectedRequests = allRequests.filter(req => req.status === RequestStatus.REJECTED);
      console.log('[DEBUG] Total rejected requests in system:', rejectedRequests.length);

      // For non-requesters: show requests they have rejected OR requests they approved but were later rejected by someone else
      visibleRequests = rejectedRequests.filter(req => {
        // Check if this user has rejected this request
        const userHasRejected = req.history?.some((h: any) => {
          // Handle both populated and unpopulated actor references
          let actorId: string | null = null;

          if (h.actor) {
            if (typeof h.actor === 'object' && h.actor._id) {
              // Actor is populated
              actorId = h.actor._id.toString();
            } else {
              // Actor is just an ObjectId
              actorId = h.actor.toString();
            }
          }

          const isUserActor = actorId === dbUser._id.toString();
          const isRejectionAction = h.action === ActionType.REJECT;

          return isUserActor && isRejectionAction;
        });

        // Check if this user has approved this request in the history
        const userHasApproved = req.history?.some((h: any) => {
          // Handle both populated and unpopulated actor references
          let actorId: string | null = null;

          if (h.actor) {
            if (typeof h.actor === 'object' && h.actor._id) {
              // Actor is populated
              actorId = h.actor._id.toString();
            } else {
              // Actor is just an ObjectId
              actorId = h.actor.toString();
            }
          }

          const isUserActor = actorId === dbUser._id.toString();
          const isApprovalAction = h.action === ActionType.APPROVE || h.action === ActionType.FORWARD;

          return isUserActor && isApprovalAction;
        });

        console.log(`[DEBUG] Request "${req.title}" - User approved: ${userHasApproved}`);
        if (req.history && req.history.length > 0) {
          console.log(`[DEBUG] Request history:`, req.history.map((h: any) => ({
            actorId: h.actor?._id?.toString() || h.actor?.toString(),
            actorEmail: h.actor?.email,
            action: h.action,
            notes: h.notes?.substring(0, 50)
          })));
          console.log(`[DEBUG] Current user ID: ${dbUser._id.toString()}, Email: ${dbUser.email}`);
        }

        console.log(`[DEBUG] Request "${req.title}" - User rejected: ${userHasRejected}, User approved: ${userHasApproved}`);

        // Show if user rejected it OR if user approved it but someone else rejected it later
        return userHasRejected || userHasApproved;
      });
      console.log('[DEBUG] Filtered to user-approved but later rejected requests:', visibleRequests.length);
    } else if (statusFilter === 'in_progress') {
      // Show requests that are in progress and visible to this user
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        user.role as UserRole,
        dbUser._id.toString(),
        dbUser.college,
        'in_progress'
      );
      console.log('[DEBUG] Filtered to in-progress requests:', visibleRequests.length);
    } else if (statusFilter === 'all') {
      // Show all requests visible to this role (no category filter)
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        user.role as UserRole,
        dbUser._id.toString(),
        dbUser.college
      );
      console.log('[DEBUG] Showing all visible requests:', visibleRequests.length);

      // Debug: Show breakdown by category
      const breakdown = {
        pending: visibleRequests.filter(req => req._visibility?.category === 'pending').length,
        approved: visibleRequests.filter(req => req._visibility?.category === 'approved').length,
        in_progress: visibleRequests.filter(req => req._visibility?.category === 'in_progress').length,
        completed: visibleRequests.filter(req => req._visibility?.category === 'completed').length,
      };
      console.log('[DEBUG] All requests breakdown by category:', breakdown);
      console.log('[DEBUG] Sample visible requests:', visibleRequests.slice(0, 3).map(req => ({
        id: req._id,
        title: req.title,
        status: req.status,
        visibility: req._visibility
      })));
    } else {
      // Default: show only pending approvals (when no status filter or status=pending)
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        user.role as UserRole,
        dbUser._id.toString(),
        dbUser.college,
        'pending'
      );
      console.log('[DEBUG] Showing pending approvals:', visibleRequests.length);
    }

    // Debug: Show visibility analysis for MANAGER_REVIEW requests
    if (managerReviewRequests.length > 0 && !statusFilter) {
      console.log('[DEBUG] MANAGER_REVIEW requests visibility analysis:');
      managerReviewRequests.forEach(req => {
        const visibility = analyzeRequestVisibility(req, user.role as UserRole, dbUser._id.toString(), dbUser.college);

        // Check if this is a post-parallel-verification scenario
        const hasParallelVerificationHistory = req.history?.some((h: any) =>
          h.newStatus === RequestStatus.PARALLEL_VERIFICATION ||
          h.newStatus === RequestStatus.SOP_COMPLETED ||
          h.newStatus === RequestStatus.BUDGET_COMPLETED
        );

        // Check if manager has previously acted
        const managerPreviousActions = req.history?.filter((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString())
        );

        // Check when request was last set to manager_review
        const lastManagerReviewChange = req.history
          ?.filter((h: any) => h.newStatus === RequestStatus.MANAGER_REVIEW)
          ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        // Check if manager has acted after the last status change
        const managerActionsAfterStatusChange = lastManagerReviewChange ? req.history?.filter((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString()) &&
          new Date(h.timestamp) > new Date(lastManagerReviewChange.timestamp)
        ) : [];

        console.log(`[DEBUG] Request ${req._id}:`);
        console.log(`  - canSee=${visibility.canSee}, category=${visibility.category}, reason=${visibility.reason}`);
        console.log(`  - hasParallelVerificationHistory=${hasParallelVerificationHistory}`);
        console.log(`  - managerPreviousActions=${managerPreviousActions?.length || 0}`);
        console.log(`  - currentStatus=${req.status}`);
        console.log(`  - lastManagerReviewChange=${lastManagerReviewChange ? new Date(lastManagerReviewChange.timestamp).toISOString() : 'none'}`);
        console.log(`  - managerActionsAfterStatusChange=${managerActionsAfterStatusChange?.length || 0}`);
      });
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const filteredRequests = visibleRequests.slice(skip, skip + limit);
    const total = visibleRequests.length;

    console.log('[DEBUG] Returning', filteredRequests.length, 'requests after pagination');

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filter: statusFilter || 'pending' // Include filter info in response
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 });
  }
}