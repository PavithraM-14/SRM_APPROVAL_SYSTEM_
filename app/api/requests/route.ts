import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
import AuditLog from '../../../models/AuditLog';
import { getCurrentUser, validateUserAction } from '../../../lib/auth';
import { CreateRequestSchema } from '../../../lib/types';
import { RequestStatus, ActionType, UserRole } from '../../../lib/types';
import { filterRequestsByVisibility } from '../../../lib/request-visibility';
import mongoose from 'mongoose';
import { approvalEngine } from '../../../lib/approval-engine';

// Function to get role-based filter for request visibility
function getRoleBasedFilter(userRole: UserRole, userId: any, pendingOnly: boolean = false, isForDashboard: boolean = false) {
  let filter: any = {};
  
  switch (userRole) {
    case UserRole.REQUESTER:
      // Requesters can only see their own requests
      filter.requester = userId;
      break;
      
    default:
      // For non-requesters, be more inclusive especially for dashboard
      if (isForDashboard) {
        // For dashboard recent requests, show all requests to give approvers system overview
        filter = {}; // No filter = all requests
      } else if (pendingOnly) {
        // For pending approvals, show all non-completed requests
        filter.status = { 
          $nin: [RequestStatus.APPROVED, RequestStatus.REJECTED] 
        };
      } else {
        // For regular requests view, show all requests
        filter = {}; // No filter = all requests
      }
      break;
  }
  
  return filter;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status'); // Renamed for clarity
    const college = searchParams.get('college');
    const pendingApprovals = searchParams.get('pendingApprovals') === 'true';
    
    console.log('[DEBUG] Requests API called:', {
      userId: user.id,
      userRole: user.role,
      statusFilter,
      page,
      limit
    });
    
    let filter: any = {};
    
    // Get user's database record for proper filtering
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
    let baseQuery: any = {};
    
    // Apply basic filters first
    if (college) {
      baseQuery.college = college;
    }

    const allRequests = await Request.find(baseQuery)
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(); // Convert to plain objects for better performance

    console.log('[DEBUG] Total requests fetched:', allRequests.length);

    // Apply role-based visibility filtering
    let visibleRequests = filterRequestsByVisibility(
      allRequests, 
      user.role as UserRole, 
      dbUser._id.toString()
    );

    console.log('[DEBUG] Requests after visibility filtering:', visibleRequests.length);

    // Apply status filtering based on the URL query parameter
    if (statusFilter) {
      console.log('[DEBUG] Applying status filter:', statusFilter);
      
      if (statusFilter === 'pending') {
        // For both requesters and approvers: use visibility category
        visibleRequests = visibleRequests.filter(req => req._visibility?.category === 'pending');
      } else if (statusFilter === 'approved') {
        if (user.role === UserRole.REQUESTER) {
          // For requesters: show only requests that have been fully approved by Chairman
          visibleRequests = visibleRequests.filter(req => req.status === RequestStatus.APPROVED);
        } else {
          // For non-requesters: show requests that they have approved (regardless of current status)
          visibleRequests = visibleRequests.filter(req => req._visibility?.category === 'approved');
        }
      } else if (statusFilter === 'rejected') {
        // Show requests that are rejected OR were rejected with clarification
        visibleRequests = visibleRequests.filter(req => {
          // Include requests with status REJECTED
          if (req.status === RequestStatus.REJECTED) return true;
          
          // Also include requests that were rejected with clarification (even if status changed)
          const wasRejectedWithClarification = req.history?.some((h: any) => 
            h.action === ActionType.REJECT_WITH_CLARIFICATION
          );
          
          return wasRejectedWithClarification;
        });
      } else if (statusFilter === 'all') {
        // Show all visible requests (no additional filtering)
        // visibleRequests already contains all visible requests
      } else {
        // Filter by specific status
        visibleRequests = visibleRequests.filter(req => req.status === statusFilter);
      }
      
      console.log('[DEBUG] Requests after status filter:', visibleRequests.length);
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const filteredRequests = visibleRequests.slice(skip, skip + limit);
    const total = visibleRequests.length;

    console.log('[DEBUG] Returning', filteredRequests.length, 'requests after pagination');
    console.log('[DEBUG] Total visible requests before pagination:', visibleRequests.length);
    console.log('[DEBUG] Request titles:', filteredRequests.map(r => r.title));

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filter: statusFilter || 'all' // Include active filter in response
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    
    // Enhanced security validation
    const validation = validateUserAction(user, 'create_request');
    if (!validation.allowed) {
      // Log security violation attempt
      console.warn(`Unauthorized request creation attempt by user ${user?.email || 'unknown'} with role ${user?.role || 'unknown'}: ${validation.reason}`);
      
      // Log to audit trail if user exists
      if (user) {
        await AuditLog.create({
          requestId: null,
          userId: user.id,
          action: 'unauthorized_request_creation_attempt',
          details: { 
            userRole: user.role, 
            userEmail: user.email,
            reason: validation.reason,
            timestamp: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          },
        });
      }
      
      const statusCode = user ? 403 : 401;
      const errorMessage = user ? `Forbidden: ${validation.reason}` : 'Unauthorized: Authentication required';
      
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const body = await request.json();
    const validatedData = CreateRequestSchema.parse(body);

    // Find the requester user (should already exist from authentication)
    const requesterUser = await User.findOne({ email: user!.email });
    if (!requesterUser) {
      return NextResponse.json({ error: 'User not found. Please ensure you are properly authenticated.' }, { status: 404 });
    }

    const newRequest = await Request.create({
      ...validatedData,
      requester: requesterUser._id,
      status: RequestStatus.MANAGER_REVIEW, // Directly go to manager review
      history: [{
        action: ActionType.CREATE,
        actor: requesterUser._id,
        timestamp: new Date(),
        notes: 'Request created and forwarded to manager for review',
        newStatus: RequestStatus.MANAGER_REVIEW,
      }],
    });

    // Log audit
    await AuditLog.create({
      requestId: newRequest._id,
      userId: requesterUser._id,
      action: 'create_request',
      details: { requestData: validatedData },
    });

    const populatedRequest = await Request.findById(newRequest._id)
      .populate('requester', 'name email empId');

    console.log('[DEBUG] Request created successfully:', {
      requestId: newRequest._id,
      title: validatedData.title,
      requester: user!.email
    });

    return NextResponse.json(populatedRequest, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json({ 
      error: 'Failed to create request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}