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
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId')
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
      // Show only fully approved requests (Chairman approved)
      visibleRequests = allRequests.filter(req => req.status === RequestStatus.APPROVED);
      console.log('[DEBUG] Filtered to approved requests:', visibleRequests.length);
    } else if (statusFilter === 'rejected') {
      // Show only rejected requests
      visibleRequests = allRequests.filter(req => req.status === RequestStatus.REJECTED);
      console.log('[DEBUG] Filtered to rejected requests:', visibleRequests.length);
    } else if (statusFilter === 'all') {
      // Show all requests visible to this role (no category filter)
      visibleRequests = filterRequestsByVisibility(
        allRequests, 
        user.role as UserRole, 
        dbUser._id.toString()
      );
      console.log('[DEBUG] Showing all visible requests:', visibleRequests.length);
    } else {
      // Default: show only pending approvals
      visibleRequests = filterRequestsByVisibility(
        allRequests, 
        user.role as UserRole, 
        dbUser._id.toString(),
        'pending'
      );
      console.log('[DEBUG] Showing pending approvals:', visibleRequests.length);
    }

    // Debug: Show visibility analysis for MANAGER_REVIEW requests
    if (managerReviewRequests.length > 0 && !statusFilter) {
      console.log('[DEBUG] MANAGER_REVIEW requests visibility analysis:');
      managerReviewRequests.forEach(req => {
        const visibility = analyzeRequestVisibility(req, user.role as UserRole, dbUser._id.toString());
        
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