import { RequestStatus, ActionType, UserRole } from "./types";

type Transition = {
  from: RequestStatus;
  to: RequestStatus;
  requiredRole: UserRole | UserRole[];
};

export const approvalEngine = {
  transitions: <Transition[]>[
    { from: RequestStatus.MANAGER_REVIEW, to: RequestStatus.PARALLEL_VERIFICATION, requiredRole: UserRole.INSTITUTION_MANAGER },

    { from: RequestStatus.PARALLEL_VERIFICATION, to: RequestStatus.SOP_COMPLETED, requiredRole: UserRole.SOP_VERIFIER },
    { from: RequestStatus.PARALLEL_VERIFICATION, to: RequestStatus.BUDGET_COMPLETED, requiredRole: UserRole.ACCOUNTANT },

    { from: RequestStatus.SOP_COMPLETED, to: RequestStatus.MANAGER_REVIEW, requiredRole: UserRole.ACCOUNTANT },
    { from: RequestStatus.BUDGET_COMPLETED, to: RequestStatus.MANAGER_REVIEW, requiredRole: UserRole.SOP_VERIFIER },

    { from: RequestStatus.MANAGER_REVIEW, to: RequestStatus.VP_APPROVAL, requiredRole: UserRole.INSTITUTION_MANAGER },
    { from: RequestStatus.MANAGER_REVIEW, to: RequestStatus.DEAN_REVIEW, requiredRole: UserRole.INSTITUTION_MANAGER },

    { from: RequestStatus.VP_APPROVAL, to: RequestStatus.HOI_APPROVAL, requiredRole: UserRole.VP },
    { from: RequestStatus.HOI_APPROVAL, to: RequestStatus.DEAN_REVIEW, requiredRole: UserRole.HEAD_OF_INSTITUTION },

    { from: RequestStatus.DEAN_REVIEW, to: RequestStatus.DEPARTMENT_CHECKS, requiredRole: UserRole.DEAN },
    { from: RequestStatus.DEAN_REVIEW, to: RequestStatus.CHIEF_DIRECTOR_APPROVAL, requiredRole: UserRole.DEAN },

    {
      from: RequestStatus.DEPARTMENT_CHECKS,
      to: RequestStatus.DEAN_REVIEW,
      requiredRole: [UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT],
    },

    { from: RequestStatus.CHIEF_DIRECTOR_APPROVAL, to: RequestStatus.CHAIRMAN_APPROVAL, requiredRole: UserRole.CHIEF_DIRECTOR },
    { from: RequestStatus.CHAIRMAN_APPROVAL, to: RequestStatus.APPROVED, requiredRole: UserRole.CHAIRMAN },

    // Rejections
    { from: RequestStatus.MANAGER_REVIEW, to: RequestStatus.REJECTED, requiredRole: UserRole.INSTITUTION_MANAGER },
    { from: RequestStatus.PARALLEL_VERIFICATION, to: RequestStatus.REJECTED, requiredRole: [UserRole.SOP_VERIFIER, UserRole.ACCOUNTANT] },
    { from: RequestStatus.VP_APPROVAL, to: RequestStatus.REJECTED, requiredRole: UserRole.VP },
    { from: RequestStatus.HOI_APPROVAL, to: RequestStatus.REJECTED, requiredRole: UserRole.HEAD_OF_INSTITUTION },
    { from: RequestStatus.DEAN_REVIEW, to: RequestStatus.REJECTED, requiredRole: UserRole.DEAN },
    { from: RequestStatus.CHIEF_DIRECTOR_APPROVAL, to: RequestStatus.REJECTED, requiredRole: UserRole.CHIEF_DIRECTOR },
    { from: RequestStatus.CHAIRMAN_APPROVAL, to: RequestStatus.REJECTED, requiredRole: UserRole.CHAIRMAN },
  ],

  getRequiredApprover(status: RequestStatus): UserRole[] {
    return [
      ...new Set(
        this.transitions
          .filter(t => t.from === status)
          .flatMap(t => Array.isArray(t.requiredRole) ? t.requiredRole : [t.requiredRole])
      )
    ];
  },

  getNextStatus(
    currentStatus: RequestStatus,
    action: ActionType,
    role: UserRole,
    context?: any
  ): RequestStatus | null {

    if (action === ActionType.REJECT) {
      return RequestStatus.REJECTED;
    }

    const cost = Number(context?.costEstimate || 0);

    switch (role) {

      case UserRole.INSTITUTION_MANAGER:
        if (currentStatus === RequestStatus.MANAGER_REVIEW && action === ActionType.FORWARD) {
          return RequestStatus.PARALLEL_VERIFICATION;
        }
        break;

      case UserRole.SOP_VERIFIER:
        if (currentStatus === RequestStatus.PARALLEL_VERIFICATION) {
          return RequestStatus.SOP_COMPLETED;
        }
        if (currentStatus === RequestStatus.BUDGET_COMPLETED) {
          return RequestStatus.MANAGER_REVIEW;
        }
        break;

      case UserRole.ACCOUNTANT:
        if (currentStatus === RequestStatus.PARALLEL_VERIFICATION) {
          return RequestStatus.BUDGET_COMPLETED;
        }
        if (currentStatus === RequestStatus.SOP_COMPLETED) {
          return RequestStatus.MANAGER_REVIEW;
        }
        break;

      case UserRole.VP:
        if (currentStatus === RequestStatus.VP_APPROVAL) {
          return RequestStatus.HOI_APPROVAL;
        }
        break;

      case UserRole.HEAD_OF_INSTITUTION:
        if (currentStatus === RequestStatus.HOI_APPROVAL) {
          return RequestStatus.DEAN_REVIEW;
        }
        break;

      case UserRole.DEAN:
        if (currentStatus === RequestStatus.DEAN_REVIEW && action !== ActionType.CLARIFY) {
          return RequestStatus.CHIEF_DIRECTOR_APPROVAL;
        }
        break;

      case UserRole.CHIEF_DIRECTOR:
        if (currentStatus === RequestStatus.CHIEF_DIRECTOR_APPROVAL) {
          // ✅ COST BASED DECISION
          if (cost > 50000) {
            return RequestStatus.CHAIRMAN_APPROVAL;
          }
          return RequestStatus.APPROVED; // 🔥 STOP HERE
        }
        break;

      case UserRole.CHAIRMAN:
        if (currentStatus === RequestStatus.CHAIRMAN_APPROVAL) {
          return RequestStatus.APPROVED;
        }
        break;
    }

    return null;
  },
};
