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
  
  // Check if request currently needs user's approval
  const needsCurrentApproval = doesRequestNeedUserApproval(request, userRole, userId, history);
  
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
  // 3. The request has reached their level in the workflow, OR
  // 4. (Dean only) They sent it for department clarification
  const canSee = userInvolvement.hasBeenInvolved || needsCurrentApproval || hasReachedUserLevel || deanCanSeeClariRequest;
  
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
 */
function hasRequestReachedUserLevel(
  request: any,
  userRole: UserRole,
  history: any[]
): boolean {
  
  const currentStatus = request.status;
  
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
  
  // Special cases for workflow progression
  switch (userRole) {
    case UserRole.INSTITUTION_MANAGER:
      // Managers can see requests that started or have been through manager review
      return currentStatus !== RequestStatus.SUBMITTED || 
             history.some(h => h.newStatus === RequestStatus.MANAGER_REVIEW);
    
    case UserRole.SOP_VERIFIER:
    case UserRole.ACCOUNTANT:
      // SOP and Accountant can see requests that have reached parallel verification or beyond
      return [
        RequestStatus.PARALLEL_VERIFICATION,
        RequestStatus.SOP_VERIFICATION,
        RequestStatus.BUDGET_CHECK,
        RequestStatus.SOP_COMPLETED,
        RequestStatus.BUDGET_COMPLETED,
        RequestStatus.VP_APPROVAL,
        RequestStatus.HOI_APPROVAL,
        RequestStatus.DEAN_REVIEW,
        RequestStatus.DEPARTMENT_CHECKS,
        RequestStatus.DEAN_VERIFICATION,
        RequestStatus.CHIEF_DIRECTOR_APPROVAL,
        RequestStatus.CHAIRMAN_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED
      ].includes(currentStatus) || 
      history.some(h => [
        RequestStatus.PARALLEL_VERIFICATION,
        RequestStatus.SOP_VERIFICATION,
        RequestStatus.BUDGET_CHECK
      ].includes(h.newStatus));
    
    case UserRole.VP:
      // VP can see requests that have reached VP approval or beyond
      return [
        RequestStatus.VP_APPROVAL,
        RequestStatus.HOI_APPROVAL,
        RequestStatus.DEAN_REVIEW,
        RequestStatus.DEPARTMENT_CHECKS,
        RequestStatus.DEAN_VERIFICATION,
        RequestStatus.CHIEF_DIRECTOR_APPROVAL,
        RequestStatus.CHAIRMAN_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED
      ].includes(currentStatus) || 
      history.some(h => h.newStatus === RequestStatus.VP_APPROVAL);
    
    case UserRole.HEAD_OF_INSTITUTION:
      // HOI can see requests that have reached HOI approval or beyond
      return [
        RequestStatus.HOI_APPROVAL,
        RequestStatus.DEAN_REVIEW,
        RequestStatus.DEPARTMENT_CHECKS,
        RequestStatus.DEAN_VERIFICATION,
        RequestStatus.CHIEF_DIRECTOR_APPROVAL,
        RequestStatus.CHAIRMAN_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED
      ].includes(currentStatus) || 
      history.some(h => h.newStatus === RequestStatus.HOI_APPROVAL);
    
    case UserRole.DEAN:
      // Dean can see requests that have reached dean review or beyond
      return [
        RequestStatus.DEAN_REVIEW,
        RequestStatus.DEPARTMENT_CHECKS,
        RequestStatus.DEAN_VERIFICATION,
        RequestStatus.CHIEF_DIRECTOR_APPROVAL,
        RequestStatus.CHAIRMAN_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED
      ].includes(currentStatus) || 
      history.some(h => [RequestStatus.DEAN_REVIEW, RequestStatus.DEAN_VERIFICATION].includes(h.newStatus));
    
    case UserRole.MMA:
    case UserRole.HR:
    case UserRole.AUDIT:
    case UserRole.IT:
      // Department roles can see requests that have reached department checks
      return currentStatus === RequestStatus.DEPARTMENT_CHECKS || 
             history.some(h => h.newStatus === RequestStatus.DEPARTMENT_CHECKS);
    
    case UserRole.CHIEF_DIRECTOR:
      // Chief Director can see requests that have reached chief director approval or beyond
      return [
        RequestStatus.CHIEF_DIRECTOR_APPROVAL,
        RequestStatus.CHAIRMAN_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED
      ].includes(currentStatus) || 
      history.some(h => h.newStatus === RequestStatus.CHIEF_DIRECTOR_APPROVAL);
    
    case UserRole.CHAIRMAN:
      // Chairman can see requests that have reached chairman approval or beyond
      return [
        RequestStatus.CHAIRMAN_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED
      ].includes(currentStatus) || 
      history.some(h => h.newStatus === RequestStatus.CHAIRMAN_APPROVAL);
  }
  
  return false;
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