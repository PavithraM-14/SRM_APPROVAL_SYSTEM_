import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import User from '../../../../models/User';
import { getCurrentUser } from '../../../../lib/auth';
import { RequestStatus, UserRole } from '../../../../lib/types';
import { filterRequestsByVisibility } from '../../../../lib/request-visibility';
import mongoose from 'mongoose';



export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      .lean(); // Convert to plain objects
    
    // For total requests: 
    // - Requesters see only their own requests
    // - Non-requesters see ALL requests that have ever been at their level (including approved ones)
    let totalRequests: number;
    let visibleRequests: any[];
    
    if (user.role === UserRole.REQUESTER) {
      // Requesters see only their own requests
      visibleRequests = allRequests.filter(req => 
        req.requester._id?.toString() === dbUser._id.toString() || 
        req.requester.toString() === dbUser._id.toString()
      );
      totalRequests = visibleRequests.length;
    } else {
      // Non-requesters: apply visibility filtering to get ALL requests at their level
      visibleRequests = filterRequestsByVisibility(
        allRequests, 
        user.role as UserRole, 
        dbUser._id.toString()
      );
      
      // Total requests = all requests they can see (including approved/completed ones)
      totalRequests = visibleRequests.length;
    }
    
    // Calculate other stats based on role
    let pendingRequests: number;
    let approvedRequests: number;
    let rejectedRequests: number;
    let inProgressRequests: number;
    
    if (user.role === UserRole.REQUESTER) {
      // For requesters, use their own requests
      pendingRequests = visibleRequests.filter(req => 
        !['approved', 'rejected'].includes(req.status)
      ).length;
      
      approvedRequests = visibleRequests.filter(req => 
        req.status === RequestStatus.APPROVED
      ).length;
      
      rejectedRequests = visibleRequests.filter(req => 
        req.status === RequestStatus.REJECTED
      ).length;
      
      inProgressRequests = 0; // Requesters don't have "in progress" concept
    } else {
      // For non-requesters, use visibility-filtered requests for all counts
      // This ensures they only see requests that have been at their level
      pendingRequests = visibleRequests.filter(req => 
        req._visibility.category === 'pending'
      ).length;
      
      // Approved: show requests they can see that are approved
      approvedRequests = visibleRequests.filter(req => 
        req._visibility.category === 'approved' || req.status === RequestStatus.APPROVED
      ).length;
      
      // Rejected: show requests they can see that are rejected
      rejectedRequests = visibleRequests.filter(req => 
        req.status === RequestStatus.REJECTED
      ).length;
      
      // In-progress: show requests they've been involved with
      inProgressRequests = visibleRequests.filter(req => 
        req._visibility.category === 'in_progress' && 
        (req._visibility.userAction === 'approve' || req._visibility.userAction === 'clarify')
      ).length;
    }

    return NextResponse.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      inProgressRequests,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}