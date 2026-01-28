import { RequestStatus, UserRole } from './types';

/**
 * Queries Engine - Handles backward flow when requests are rejected for queries
 */
export const queryEngine = {
  
  /**
   * Get the queries target based on rejection level
   * NEW LOGIC:
   * - Above Dean level (HOI, Chief Director, Chairman) → Dean handles queries with requester
   * - Dean and below → Direct to requester
   */
  getQueryTarget(currentStatus: RequestStatus, currentRole: UserRole): { status: RequestStatus; role: UserRole; isDeanMediated: boolean } | null {
    
    // Roles above Dean level - VP, HOI, Chief Director, Chairman
    const aboveDeanRoles = [
      UserRole.VP,
      UserRole.HEAD_OF_INSTITUTION,
      UserRole.CHIEF_DIRECTOR,
      UserRole.CHAIRMAN,
    ];
    
    // If rejection is from above Dean level, Dean mediates
    if (aboveDeanRoles.includes(currentRole)) {
      return {
        status: RequestStatus.DEAN_REVIEW,
        role: UserRole.DEAN,
        isDeanMediated: true
      };
    }
    
    // Dean and below (including HOI, VP, Manager) - direct to requester
    return {
      status: RequestStatus.SUBMITTED,
      role: UserRole.REQUESTER,
      isDeanMediated: false
    };
  },

  /**
   * Get the previous level in the workflow for queries (legacy method for backward compatibility)
   */
  getPreviousLevel(currentStatus: RequestStatus, currentRole: UserRole): { status: RequestStatus; role: UserRole } | null {
    const target = this.getQueryTarget(currentStatus, currentRole);
    return target ? { status: target.status, role: target.role } : null;
  },

  /**
   * Check if a request is pending response for a specific user
   */
  isPendingClarificationForUser(request: any, userRole: UserRole, userId: string): boolean {
    if (!request.pendingQuery) {
      return false;
    }

    // Check if this user is at the level that needs to provide response
    return request.queryLevel === userRole;
  },

  /**
   * Get the latest queries request for a request
   */
  getLatestQueryRequest(request: any): any | null {
    if (!request.history || request.history.length === 0) {
      return null;
    }

    // Find the most recent queries request
    const queryEntries = request.history
      .filter((h: any) => h.requiresClarification && h.queryRequest)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return queryEntries.length > 0 ? queryEntries[0] : null;
  },

  /**
   * Check if user can provide response for a request
   * IMPORTANT: Only REQUESTERS and DEAN (in Dean-mediated cases) can provide responses to queries
   */
  canProvideClarification(request: any, userRole: UserRole, userId: string): boolean {
    // Only requesters can provide responses to queries (except for Dean in special cases)
    if (userRole === UserRole.REQUESTER) {
      return this.isPendingClarificationForUser(request, userRole, userId);
    }
    
    // Dean can provide response only in Dean-mediated cases (above Dean level rejections)
    if (userRole === UserRole.DEAN) {
      return this.isPendingClarificationForUser(request, userRole, userId) && 
             this.isDeanMediatedClarification(request);
    }
    
    // All other roles (VP, Manager, etc.) cannot provide responses to queries
    // They can only Raise Queries, not respond to them
    return false;
  },

  /**
   * Check if this is a Dean-mediated queries process (from above Dean level)
   */
  isDeanMediatedClarification(request: any): boolean {
    if (!request.history || request.history.length === 0) return false;

    const queryEntries = request.history
      .filter((h: any) => h.action === 'REJECT_WITH_CLARIFICATION' || (h.requiresClarification && h.queryRequest))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (queryEntries.length === 0) return false;

    const aboveDeanStatuses = [
      RequestStatus.VP_APPROVAL,
      RequestStatus.HOI_APPROVAL,
      RequestStatus.CHIEF_DIRECTOR_APPROVAL,
      RequestStatus.CHAIRMAN_APPROVAL,
    ];

    for (const entry of queryEntries) {
      if (entry.isDeanMediated) {
        return true;
      }

      if (entry.previousStatus && aboveDeanStatuses.includes(entry.previousStatus)) {
        return true;
      }

      const deanForwardingRequester =
        entry.previousStatus === RequestStatus.DEAN_REVIEW && entry.newStatus === RequestStatus.SUBMITTED;

      if (deanForwardingRequester) {
        // Skip dean-forward steps so we can inspect the originating rejection entry
        continue;
      }

      break;
    }

    return false;
  },

  /**
   * Get the original rejector for Dean-mediated queries
   */
  getOriginalRejector(request: any): { role: string; name?: string } | null {
    if (!request.history || request.history.length === 0) return null;

    const latestRejection = request.history
      .filter((h: any) => h.action === 'REJECT_WITH_CLARIFICATION' || (h.requiresClarification && h.queryRequest))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestRejection || !latestRejection.previousStatus) return null;

    // Derive role string from the status that performed the rejection
    const statusToRoleMap: Record<string, string> = {
      [RequestStatus.CHAIRMAN_APPROVAL]: 'chairman',
      [RequestStatus.CHIEF_DIRECTOR_APPROVAL]: 'chief_director',
      [RequestStatus.HOI_APPROVAL]: 'head_of_institution',
      [RequestStatus.DEAN_REVIEW]: 'dean',
      [RequestStatus.VP_APPROVAL]: 'vp',
      [RequestStatus.MANAGER_REVIEW]: 'institution_manager',
      [RequestStatus.PARALLEL_VERIFICATION]: 'parallel_verification',
      [RequestStatus.SOP_VERIFICATION]: 'sop_verifier',
      [RequestStatus.BUDGET_CHECK]: 'accountant',
    };

    const role = statusToRoleMap[latestRejection.previousStatus];
    if (!role) return null;

    const roleDisplayMap: Record<string, string> = {
      'chairman': 'Chairman',
      'chief_director': 'Chief Director',
      'head_of_institution': 'Head of Institution',
      'dean': 'Dean',
      'vp': 'Vice President',
      'institution_manager': 'Institution Manager',
      'sop_verifier': 'SOP Verifier',
      'accountant': 'Accountant',
      'parallel_verification': 'Parallel Verification',
    };

    return { role, name: roleDisplayMap[role] };
  },

  /**
   * Get the status to return to after response is provided
   */
  getReturnStatus(request: any): RequestStatus | null {
    if (!request.history || request.history.length === 0) return null;

    const latestRejection = request.history
      .filter((h: any) => h.action === 'REJECT_WITH_CLARIFICATION' || (h.requiresClarification && h.queryRequest))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestRejection || !latestRejection.previousStatus) return null;

    // Return to the stage that issued the rejection
    const statusToReturnMap: Record<string, RequestStatus> = {
      [RequestStatus.CHAIRMAN_APPROVAL]: RequestStatus.CHAIRMAN_APPROVAL,
      [RequestStatus.CHIEF_DIRECTOR_APPROVAL]: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
      [RequestStatus.HOI_APPROVAL]: RequestStatus.HOI_APPROVAL,
      [RequestStatus.DEAN_REVIEW]: RequestStatus.DEAN_REVIEW,
      [RequestStatus.VP_APPROVAL]: RequestStatus.VP_APPROVAL,
      [RequestStatus.MANAGER_REVIEW]: RequestStatus.MANAGER_REVIEW,
      // Parallel verification: send back to the combined stage
      [RequestStatus.PARALLEL_VERIFICATION]: RequestStatus.PARALLEL_VERIFICATION,
      [RequestStatus.SOP_VERIFICATION]: RequestStatus.PARALLEL_VERIFICATION,
      [RequestStatus.BUDGET_CHECK]: RequestStatus.PARALLEL_VERIFICATION,
    };

    return statusToReturnMap[latestRejection.previousStatus] || null;
  }
};