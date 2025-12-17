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
        category: getRequesterCategory(request.status),
        reason: 'Own request'
      };
    }
    return { canSee: false, category: 'completed', reason: 'Not own request' };
  }

  // For approvers, check if request has reached their level through proper workflow
  return analyzeApproverVisibility(request, userRole, userId);
}

function getRequesterCategory(status: RequestStatus): 'pending' | 'approved' | 'in_progress' | 'completed' {
  switch (status) {
    case RequestStatus.APPROVED:
      return 'approved';
    case RequestStatus.REJECTED:
      return 'completed';
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
  
  if (!userInvolvement.hasBeenInvolved) {
    // Check if request has reached their level through proper workflow
    const hasReachedLevel = hasRequestReachedUserLevel(request, userRole, history);
    
    if (!hasReachedLevel) {
      return { canSee: false, category: 'completed', reason: 'Request has not reached this level' };
    }
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
    
    involvement.hasApproved = userActions.some(a => a.action === ActionType.APPROVE);
    involvement.hasRejected = userActions.some(a => a.action === ActionType.REJECT);
    involvement.hasClarified = userActions.some(a => a.action === ActionType.CLARIFY);
  }

  return involvement;
}

function hasRequestReachedUserLevel(
  request: any,
  userRole: UserRole,
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
  
  // Special handling for Dean - show requests that have completed department checks
  if (userRole === UserRole.DEAN) {
    // Dean can see requests that are back from department clarifications
    if (currentStatus === RequestStatus.DEAN_REVIEW) {
      // Check if this request came back from department checks
      const hasDepartmentResponse = history.some((h: any) => 
        h.departmentResponse && h.action === ActionType.FORWARD
      );
      if (hasDepartmentResponse) {
        return true;
      }
    }
    
    // Dean can also see requests currently in department checks (that they sent)
    if (currentStatus === RequestStatus.DEPARTMENT_CHECKS) {
      const deanSentClarification = history.some((h: any) => 
        h.action === ActionType.CLARIFY && 
        h.clarificationTarget &&
        h.actor?.role === 'dean'
      );
      return deanSentClarification;
    }
  }
  
  // Check if current status requires this user's role
  const requiredApprovers = approvalEngine.getRequiredApprover(currentStatus);
  if (requiredApprovers.includes(userRole)) {
    return true;
  }

  // ENHANCED: Check if request has EVER passed through this user's level
  // This ensures users can see ALL requests that have historically been at their level
  const statusesRequiringThisRole = getAllStatusesForRole(userRole);
  
  // Check history for any status that required this role
  const hasPassedThrough = history.some(h => 
    statusesRequiringThisRole.includes(h.newStatus) || 
    statusesRequiringThisRole.includes(h.previousStatus)
  );
  
  // ADDITIONAL: Check if request has progressed beyond this user's level
  // This catches cases where the request has moved past their level
  const hasProgressedBeyond = checkIfRequestProgressedBeyondUserLevel(request, userRole, history);
  
  return hasPassedThrough || hasProgressedBeyond;
}

/**
 * Check if a request has progressed beyond the user's approval level
 * This ensures users can see requests they've previously approved
 */
function checkIfRequestProgressedBeyondUserLevel(
  request: any,
  userRole: UserRole,
  history: any[]
): boolean {
  
  // Define the approval workflow order
  const workflowOrder = [
    UserRole.INSTITUTION_MANAGER,
    UserRole.SOP_VERIFIER,
    UserRole.ACCOUNTANT,
    UserRole.VP,
    UserRole.HEAD_OF_INSTITUTION,
    UserRole.DEAN,
    UserRole.MMA, // Department roles are parallel to Dean
    UserRole.HR,
    UserRole.AUDIT,
    UserRole.IT,
    UserRole.CHIEF_DIRECTOR,
    UserRole.CHAIRMAN
  ];
  
  const userLevelIndex = workflowOrder.indexOf(userRole);
  if (userLevelIndex === -1) return false;
  
  // Check if request has reached any level beyond the user's level
  const currentStatus = request.status;
  const statusesForLaterRoles = workflowOrder
    .slice(userLevelIndex + 1)
    .flatMap(role => getAllStatusesForRole(role));
  
  // If current status is for a later role, user should see this request
  if (statusesForLaterRoles.includes(currentStatus)) {
    return true;
  }
  
  // Check history for any status that indicates progression beyond user's level
  const hasReachedLaterLevel = history.some(h => 
    statusesForLaterRoles.includes(h.newStatus) || 
    statusesForLaterRoles.includes(h.previousStatus)
  );
  
  return hasReachedLaterLevel;
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
      return { 
        category: 'in_progress', 
        reason: 'You approved, now at next level',
        userAction: 'approve'
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

  // Request is visible but user hasn't acted yet
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