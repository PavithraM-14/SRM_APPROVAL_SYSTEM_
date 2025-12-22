import { RequestStatus, UserRole } from './types';

/**
 * Queries Engine - Handles backward flow when requests are rejected for queries
 */
export const clarificationEngine = {
  
  /**
   * Get the queries target based on rejection level
   * NEW LOGIC:
   * - Above Dean level (HOI, Chief Director, Chairman) → Dean handles queries with requester
   * - Dean and below → Direct to requester
   */
  getClarificationTarget(currentStatus: RequestStatus, currentRole: UserRole): { status: RequestStatus; role: UserRole; isDeanMediated: boolean } | null {
    
    // Roles above Dean level - only Chairman and Chief Director
    const aboveDeanRoles = [UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN];
    
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
    const target = this.getClarificationTarget(currentStatus, currentRole);
    return target ? { status: target.status, role: target.role } : null;
  },

  /**
   * Check if a request is pending response for a specific user
   */
  isPendingClarificationForUser(request: any, userRole: UserRole, userId: string): boolean {
    if (!request.pendingClarification) {
      return false;
    }

    // Check if this user is at the level that needs to provide response
    return request.clarificationLevel === userRole;
  },

  /**
   * Get the latest queries request for a request
   */
  getLatestClarificationRequest(request: any): any | null {
    if (!request.history || request.history.length === 0) {
      return null;
    }

    // Find the most recent queries request
    const clarificationEntries = request.history
      .filter((h: any) => h.requiresClarification && h.clarificationRequest)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return clarificationEntries.length > 0 ? clarificationEntries[0] : null;
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
    
    const latestRejection = request.history
      .filter((h: any) => h.action === 'REJECT_WITH_CLARIFICATION')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestRejection) return false;
    
    // Check if rejection came from above Dean level - only Chairman and Chief Director
    const aboveDeanRoles = ['chief_director', 'chairman'];
    return latestRejection.actor?.role && aboveDeanRoles.includes(latestRejection.actor.role);
  },

  /**
   * Get the original rejector for Dean-mediated queries
   */
  getOriginalRejector(request: any): any | null {
    if (!request.history || request.history.length === 0) return null;
    
    const latestRejection = request.history
      .filter((h: any) => h.action === 'REJECT_WITH_CLARIFICATION')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    return latestRejection?.actor || null;
  },

  /**
   * Get the status to return to after response is provided
   */
  getReturnStatus(request: any): RequestStatus | null {
    const originalRejector = this.getOriginalRejector(request);
    if (!originalRejector) return null;
    
    // Map rejector roles to their corresponding statuses
    const roleToStatusMap: Record<string, RequestStatus> = {
      'chairman': RequestStatus.CHAIRMAN_APPROVAL,
      'chief_director': RequestStatus.CHIEF_DIRECTOR_APPROVAL,
      'head_of_institution': RequestStatus.HOI_APPROVAL,
      'dean': RequestStatus.DEAN_REVIEW,
      'vp': RequestStatus.VP_APPROVAL,
      'institution_manager': RequestStatus.MANAGER_REVIEW,
      'sop_verifier': RequestStatus.PARALLEL_VERIFICATION,
      'accountant': RequestStatus.PARALLEL_VERIFICATION
    };
    
    return roleToStatusMap[originalRejector.role] || null;
  }
};