import { RequestStatus, ActionType, UserRole } from './types';
import { approvalEngine } from './approval-engine';

export interface RequestVisibility {
  canSee: boolean;
  category: 'pending' | 'approved' | 'in_progress' | 'completed';
  reason: string;
  userAction?: 'approve' | 'clarify' | 'reject' | null;
}

/**
 * Determines if a user can see a request and categorizes it based on their involvement
 */
export function analyzeRequestVisibility(
  request: any,
  userRole: UserRole,
  userId: string
): RequestVisibility {
  
  // Requesters can always see their own requests
  if (userRole === UserRole.REQUESTER) {
    if (request.requester._id?.toString() === userId || request.requester.toString() === userId) {
      return {
        canSee: true,
        category: getRequesterCategory(request.status, request.pendingClarification, request.clarificationLevel),
        reason: 'Own request'
      };
    }
    return { canSee: false, category: 'completed', reason: 'Not own request' };
  }

  // For approvers, check if request has reached their level through proper workflow
  return analyzeApproverVisibility(request, userRole, userId);
}

function getRequesterCategory(
  status: RequestStatus, 
  pendingClarification?: boolean, 
  clarificationLevel?: string
): 'pending' | 'approved' | 'in_progress' | 'completed' {
  switch (status) {
    case RequestStatus.APPROVED:
      return 'approved';
    case RequestStatus.REJECTED:
      // If request is rejected but pending clarification from requester, show as pending
      if (pendingClarification && clarificationLevel === UserRole.REQUESTER) {
        return 'pending';
      }
      return 'completed';
    case RequestStatus.SUBMITTED:
      // If request is back to submitted status due to clarification, show as pending
      if (pendingClarification && clarificationLevel === UserRole.REQUESTER) {
        return 'pending';
      }
      return 'pending';
    default:
      return 'pending'; // All other statuses are "in progress" for requester
  }
}

function analyzeApproverVisibility(
  request: any,
  userRole: UserRole,
  userId: string
): RequestVisibility {
  
  const history = request.history || [];
  
  // Check if user has been involved in this request
  const userInvolvement = analyzeUserInvolvement(history, userRole, userId);
  
  // Check if request currently needs user's approval
  const needsCurrentApproval = doesRequestNeedUserApproval(request, userRole, userId, history);
  
  // Check if request is pending clarification from this user
  const needsClarification = request.pendingClarification && request.clarificationLevel === userRole;
  
  // Check if request has reached or passed through user's workflow level
  const hasReachedUserLevel = hasRequestReachedUserLevel(request, userRole, history);
  
  // Special handling for Dean - can see requests they sent for department clarification
  const deanCanSeeClariRequest = userRole === UserRole.DEAN && 
    request.status === RequestStatus.DEPARTMENT_CHECKS &&
    history.some((h: any) => 
      h.action === ActionType.CLARIFY && 
      h.clarificationTarget &&
      (h.actor?._id?.toString() === userId || h.actor?.toString() === userId)
    );
  
  // User can see request if:
  // 1. They have been involved in any way (approved, rejected, or clarified), OR
  // 2. It currently needs their approval, OR
  // 3. It needs clarification from them, OR
  // 4. The request has reached their level in the workflow (and wasn't rejected before reaching them), OR
  // 5. (Dean only) They sent it for department clarification
  const canSee = userInvolvement.hasBeenInvolved || needsCurrentApproval || needsClarification || hasReachedUserLevel || deanCanSeeClariRequest;
  
  if (!canSee) {
    return { canSee: false, category: 'completed', reason: 'Not involved and not at user level' };
  }

  // User can see the request, now categorize it
  const category = categorizeRequestForUser(request, userRole, userId, userInvolvement);
  
  return {
    canSee: true,
    category: category.category,
    reason: category.reason,
    userAction: category.userAction
  };
}

interface UserInvolvement {
  hasBeenInvolved: boolean;
  hasApproved: boolean;
  hasRejected: boolean;
  hasClarified: boolean;
  lastAction?: ActionType;
  lastActionTimestamp?: Date;
}

function analyzeUserInvolvement(
  history: any[],
  userRole: UserRole,
  userId: string
): UserInvolvement {
  
  const userActions = history.filter(h => 
    h.actor?._id?.toString() === userId || h.actor?.toString() === userId
  );

  const involvement: UserInvolvement = {
    hasBeenInvolved: userActions.length > 0,
    hasApproved: false,
    hasRejected: false,
    hasClarified: false
  };

  if (userActions.length > 0) {
    const lastAction = userActions[userActions.length - 1];
    involvement.lastAction = lastAction.action;
    involvement.lastActionTimestamp = lastAction.timestamp;
    
    // Consider both APPROVE and FORWARD as approval actions
    involvement.hasApproved = userActions.some(a => 
      a.action === ActionType.APPROVE || a.action === ActionType.FORWARD
    );
    involvement.hasRejected = userActions.some(a => a.action === ActionType.REJECT);
    involvement.hasClarified = userActions.some(a => a.action === ActionType.CLARIFY);
  }

  return involvement;
}



/**
 * Check if a request has reached or passed through the user's workflow level
 * IMPORTANT: Users should NOT see requests that were rejected before reaching their level
 */
function hasRequestReachedUserLevel(
  request: any,
  userRole: UserRole,
  history: any[]
): boolean {
  
  const currentStatus = request.status;
  
  // If request is rejected, check if it was rejected before reaching this user's level
  if (currentStatus === RequestStatus.REJECTED) {
    return hasRequestReachedUserLevelBeforeRejection(request, userRole, history);
  }
  
  // Get all statuses that this user role can handle
  const userStatuses = getAllStatusesForRole(userRole);
  
  // Check if current status is one the user can handle
  if (userStatuses.includes(currentStatus)) {
    return true;
  }
  
  // Check if request has been at any status this user can handle in the past
  const hasBeenAtUserLevel = history.some((h: any) => 
    h.newStatus && userStatuses.includes(h.newStatus)
  );
  
  if (hasBeenAtUserLevel) {
    return true;
  }
  
  // For non-rejected requests, check if they've reached the user's workflow level
  // This is more restrictive and only shows requests that have actually progressed to their level
  return false;
  
  return false;
}

/**
 * Check if a rejected request actually reached the user's level before being rejected
 */
function hasRequestReachedUserLevelBeforeRejection(
  request: any,
  userRole: UserRole,
  history: any[]
): boolean {
  
  // Get all statuses that this user role can handle
  const userStatuses = getAllStatusesForRole(userRole);
  
  // Find when the request was rejected
  const rejectionEntry = history.find((h: any) => h.newStatus === RequestStatus.REJECTED);
  if (!rejectionEntry) {
    return false; // No rejection found, shouldn't happen for rejected requests
  }
  
  const rejectionTime = new Date(rejectionEntry.timestamp);
  
  // Check if the request was ever at this user's level BEFORE the rejection
  const wasAtUserLevelBeforeRejection = history.some((h: any) => {
    if (!h.newStatus || !userStatuses.includes(h.newStatus)) {
      return false;
    }
    
    const entryTime = new Date(h.timestamp);
    return entryTime < rejectionTime;
  });
  
  return wasAtUserLevelBeforeRejection;
}

/**
 * Check if a request currently needs the user's approval
 */
function doesRequestNeedUserApproval(
  request: any,
  userRole: UserRole,
  userId: string,
  history: any[]
): boolean {
  
  const currentStatus = request.status;
  
  // Special handling for department clarifications
  if (currentStatus === RequestStatus.DEPARTMENT_CHECKS && 
      [UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(userRole)) {
    
    // Find the latest clarification request from Dean
    const latestClarification = history
      .filter((h: any) => h.action === ActionType.CLARIFY && h.clarificationTarget)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    // Only show to the department that was specifically targeted
    if (latestClarification) {
      const targetedRole = latestClarification.clarificationTarget; // e.g., 'hr', 'mma'
      const currentUserRole = userRole.toLowerCase(); // Convert UserRole.HR to 'hr'
      return targetedRole === currentUserRole;
    }
    
    return false; // No clarification found, don't show to any department
  }
  
  // Check if current status requires this user's role
  const requiredApprovers = approvalEngine.getRequiredApprover(currentStatus);
  if (!requiredApprovers.includes(userRole)) {
    return false;
  }

  // Find when the request was last set to the current status
  const lastStatusChange = history
    ?.filter((h: any) => h.newStatus === currentStatus)
    ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Check if user has acted AFTER the request was set to current status
  const hasActedAfterStatusChange = lastStatusChange && history?.some((h: any) => 
    (h.actor?._id?.toString() === userId || h.actor?.toString() === userId) &&
    new Date(h.timestamp) > new Date(lastStatusChange.timestamp) &&
    (h.action === ActionType.APPROVE || h.action === ActionType.FORWARD)
  );

  // User needs to act if they haven't acted after the latest status change
  return !hasActedAfterStatusChange;
}

function getAllStatusesForRole(userRole: UserRole): RequestStatus[] {
  const statusMap: Record<UserRole, RequestStatus[]> = {
    [UserRole.REQUESTER]: [],
    [UserRole.INSTITUTION_MANAGER]: [
      RequestStatus.MANAGER_REVIEW,
      RequestStatus.PARALLEL_VERIFICATION
    ],
    [UserRole.SOP_VERIFIER]: [
      RequestStatus.SOP_VERIFICATION,
      RequestStatus.PARALLEL_VERIFICATION,
      RequestStatus.SOP_COMPLETED
    ],
    [UserRole.ACCOUNTANT]: [
      RequestStatus.BUDGET_CHECK,
      RequestStatus.PARALLEL_VERIFICATION,
      RequestStatus.BUDGET_COMPLETED
    ],
    [UserRole.VP]: [RequestStatus.VP_APPROVAL],
    [UserRole.HEAD_OF_INSTITUTION]: [RequestStatus.HOI_APPROVAL],
    [UserRole.DEAN]: [RequestStatus.DEAN_REVIEW, RequestStatus.DEAN_VERIFICATION],
    [UserRole.MMA]: [RequestStatus.DEPARTMENT_CHECKS],
    [UserRole.HR]: [RequestStatus.DEPARTMENT_CHECKS],
    [UserRole.AUDIT]: [RequestStatus.DEPARTMENT_CHECKS],
    [UserRole.IT]: [RequestStatus.DEPARTMENT_CHECKS],
    [UserRole.CHIEF_DIRECTOR]: [RequestStatus.CHIEF_DIRECTOR_APPROVAL],
    [UserRole.CHAIRMAN]: [RequestStatus.CHAIRMAN_APPROVAL]
  };

  return statusMap[userRole] || [];
}

function categorizeRequestForUser(
  request: any,
  userRole: UserRole,
  userId: string,
  involvement: UserInvolvement
): { category: 'pending' | 'approved' | 'in_progress' | 'completed'; reason: string; userAction?: 'approve' | 'clarify' | 'reject' | null } {
  
  const currentStatus = request.status;
  
  // If request is completed (approved/rejected), it's completed for everyone
  if (currentStatus === RequestStatus.APPROVED) {
    return { 
      category: 'approved', 
      reason: 'Request has been approved',
      userAction: involvement.hasApproved ? 'approve' : null
    };
  }
  
  if (currentStatus === RequestStatus.REJECTED) {
    return { 
      category: 'completed', 
      reason: 'Request has been rejected',
      userAction: involvement.hasRejected ? 'reject' : null
    };
  }

  // Special handling for clarification workflow states
  // Requests pending clarification should show as "rejected" to the original rejector until clarification is provided
  if (request.pendingClarification) {
    // Find the latest rejection with clarification
    const latestRejectionWithClarification = request.history
      ?.filter((h: any) => h.action === ActionType.REJECT_WITH_CLARIFICATION)
      ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (latestRejectionWithClarification) {
      const rejectorId = latestRejectionWithClarification.actor?._id?.toString() || latestRejectionWithClarification.actor?.toString();
      
      // If this user is the original rejector
      if (rejectorId === userId) {
        // Check if requester has provided clarification yet
        const requesterClarificationProvided = request.history?.some((h: any) => 
          h.action === ActionType.CLARIFY_AND_REAPPROVE && 
          h.actor?.role === 'requester' &&
          new Date(h.timestamp) > new Date(latestRejectionWithClarification.timestamp)
        );

        if (requesterClarificationProvided) {
          // Requester has provided clarification - show as pending for original rejector
          return {
            category: 'pending',
            reason: 'Requester provided clarification - review needed',
            userAction: 'clarify'
          };
        } else {
          // Clarification still pending from requester - show as rejected
          return {
            category: 'completed',
            reason: 'You rejected this request - awaiting requester clarification',
            userAction: 'reject'
          };
        }
      }
    }
  }

  // Check if request needs clarification from this user
  // IMPORTANT: Only REQUESTERS and DEAN (in Dean-mediated cases) can provide clarification responses
  if (request.pendingClarification && request.clarificationLevel === userRole) {
    // Special handling for Dean-mediated clarifications
    if (userRole === UserRole.DEAN) {
      // Check if this is a Dean-mediated clarification from above Dean level
      const isDeanMediated = request.history?.some((h: any) => 
        h.action === ActionType.REJECT_WITH_CLARIFICATION && h.isDeanMediated
      );
      
      if (isDeanMediated) {
        // Check if requester has provided clarification
        const requesterClarified = request.history?.some((h: any) => 
          h.action === ActionType.CLARIFY_AND_REAPPROVE && h.actor?.role === 'requester'
        );
        
        if (requesterClarified) {
          return { 
            category: 'pending', 
            reason: 'Review requester clarification and re-approve',
            userAction: 'clarify'
          };
        } else {
          return { 
            category: 'pending', 
            reason: 'Handle rejection from above Dean level',
            userAction: 'clarify'
          };
        }
      }
    } else if (userRole === UserRole.REQUESTER) {
      // Only requesters can provide clarification responses
      return { 
        category: 'pending', 
        reason: 'Needs clarification from you',
        userAction: 'clarify'
      };
    }
    
    // For all other roles (VP, Manager, etc.), they should NOT be able to respond to their own clarification requests
    // They should see it as rejected/completed until requester responds
  }

  // Check if user needs to act on this request now
  const requiredApprovers = approvalEngine.getRequiredApprover(currentStatus);
  const needsUserAction = requiredApprovers.includes(userRole);

  if (needsUserAction) {
    // Find when the request was last set to the current status
    const lastStatusChange = request.history
      ?.filter((h: any) => h.newStatus === currentStatus)
      ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    // Check if user has acted AFTER the request was set to current status
    const hasActedAfterStatusChange = lastStatusChange && request.history?.some((h: any) => 
      (h.actor?._id?.toString() === userId || h.actor?.toString() === userId) &&
      new Date(h.timestamp) > new Date(lastStatusChange.timestamp) &&
      (h.action === ActionType.APPROVE || h.action === ActionType.FORWARD)
    );

    if (!hasActedAfterStatusChange) {
      return { 
        category: 'pending', 
        reason: 'Waiting for your approval',
        userAction: null
      };
    }
  }

  // User has been involved but request is still in progress
  if (involvement.hasBeenInvolved) {
    if (involvement.hasApproved) {
      // For managers and other approvers, show approved requests that are still in workflow as "approved"
      // This ensures they appear in the "approved" count in dashboard stats
      return { 
        category: 'approved', 
        reason: 'You approved this request',
        userAction: 'approve'
      };
    }
    if (involvement.hasRejected) {
      // Check if this was a rejection with clarification that now has a response
      const userRejectionWithClarification = request.history?.find((h: any) => 
        (h.actor?._id?.toString() === userId || h.actor?.toString() === userId) &&
        h.action === ActionType.REJECT_WITH_CLARIFICATION
      );

      if (userRejectionWithClarification) {
        // Check if requester has provided clarification after this rejection
        const requesterClarificationProvided = request.history?.some((h: any) => 
          h.action === ActionType.CLARIFY_AND_REAPPROVE && 
          h.actor?.role === 'requester' &&
          new Date(h.timestamp) > new Date(userRejectionWithClarification.timestamp)
        );

        if (requesterClarificationProvided && request.pendingClarification === false) {
          // Requester provided clarification and it's back for review
          return {
            category: 'pending',
            reason: 'Requester provided clarification - review needed',
            userAction: 'clarify'
          };
        }
      }

      return { 
        category: 'completed', 
        reason: 'You rejected this request',
        userAction: 'reject'
      };
    }
    if (involvement.hasClarified) {
      return { 
        category: 'in_progress', 
        reason: 'You requested clarification',
        userAction: 'clarify'
      };
    }
  }

  // Request has reached user's level but they haven't acted yet
  // Check if it's at a status they can handle
  const userStatuses = getAllStatusesForRole(userRole);
  if (userStatuses.includes(currentStatus)) {
    return { 
      category: 'pending', 
      reason: 'Available for your review',
      userAction: null
    };
  }

  // Request is visible but at a different workflow stage
  return { 
    category: 'in_progress', 
    reason: 'Request in workflow',
    userAction: null
  };
}

/**
 * Filter requests based on user role and involvement
 */
export function filterRequestsByVisibility(
  requests: any[],
  userRole: UserRole,
  userId: string,
  categoryFilter?: 'pending' | 'approved' | 'in_progress' | 'completed'
): any[] {
  
  return requests
    .filter(request => request && request._id) // Filter out invalid requests
    .map(request => {
      // Ensure request has required properties
      const safeRequest = {
        _id: request._id,
        title: request.title || 'Untitled Request',
        status: request.status || 'unknown',
        college: request.college || 'Unknown',
        department: request.department || 'Unknown',
        costEstimate: request.costEstimate || 0,
        createdAt: request.createdAt || new Date(),
        requester: request.requester || { name: 'Unknown', email: 'unknown' },
        history: request.history || [],
        ...request, // Spread original request to preserve other properties
        _visibility: analyzeRequestVisibility(request, userRole, userId)
      };
      return safeRequest;
    })
    .filter(request => {
      if (!request._visibility.canSee) return false;
      if (categoryFilter && request._visibility.category !== categoryFilter) return false;
      return true;
    });
}