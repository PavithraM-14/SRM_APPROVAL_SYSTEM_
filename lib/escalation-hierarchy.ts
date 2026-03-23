import { UserRole, RequestStatus } from "./types";

export const ESCALATION_HIERARCHY: UserRole[] = [
  UserRole.INSTITUTION_MANAGER,
  UserRole.HEAD_OF_INSTITUTION,
  UserRole.DEAN,
  UserRole.CHIEF_DIRECTOR,
  UserRole.CHAIRMAN,
];

export const ESCALATABLE_STATUSES: RequestStatus[] = [
  RequestStatus.MANAGER_REVIEW,
  RequestStatus.HOI_APPROVAL,
  RequestStatus.DEAN_REVIEW,
  RequestStatus.CHIEF_DIRECTOR_APPROVAL,
  RequestStatus.CHAIRMAN_APPROVAL,
];

export const STATUS_TO_ROLE: Record<RequestStatus, UserRole> = {
  [RequestStatus.MANAGER_REVIEW]: UserRole.INSTITUTION_MANAGER,
  [RequestStatus.HOI_APPROVAL]: UserRole.HEAD_OF_INSTITUTION,
  [RequestStatus.DEAN_REVIEW]: UserRole.DEAN,
  [RequestStatus.CHIEF_DIRECTOR_APPROVAL]: UserRole.CHIEF_DIRECTOR,
  [RequestStatus.CHAIRMAN_APPROVAL]: UserRole.CHAIRMAN,
} as Record<RequestStatus, UserRole>;

export function isHigherRole(roleA: UserRole, roleB: UserRole): boolean {
  const indexA = ESCALATION_HIERARCHY.indexOf(roleA);
  const indexB = ESCALATION_HIERARCHY.indexOf(roleB);
  if (indexA === -1 || indexB === -1) return false;
  return indexA > indexB;
}

export function getHigherRoles(role: UserRole): UserRole[] {
  const index = ESCALATION_HIERARCHY.indexOf(role);
  if (index === -1) return [];
  return ESCALATION_HIERARCHY.slice(index + 1);
}

export function getEscalationReferenceTime(request: any): Date | null {
  const history: any[] = request?.history ?? [];
  const currentStatus = request?.status;
  if (!currentStatus || history.length === 0) return null;

  // Find the most recent history entry whose newStatus equals the current status
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].newStatus === currentStatus) {
      return history[i].timestamp ? new Date(history[i].timestamp) : null;
    }
  }
  return null;
}

export function canActOnFlaggedRequest(actingRole: UserRole, stalledRole: UserRole): boolean {
  return actingRole === stalledRole || isHigherRole(actingRole, stalledRole);
}

// Actions available when a higher role bypasses the stalled role
const HIGHER_ROLE_ACTIONS: Partial<Record<UserRole, string[]>> = {
  [UserRole.HEAD_OF_INSTITUTION]: ["forward"],
  [UserRole.DEAN]: ["forward", "approve", "reject"],
  [UserRole.CHIEF_DIRECTOR]: ["forward", "approve", "reject"],
  [UserRole.CHAIRMAN]: ["approve", "reject"],
};

// The stalled role itself can always forward, approve, or reject their own flagged request
const STALLED_ROLE_ACTIONS = ["forward", "approve", "reject"];

export function getActionsForHigherRole(actingRole: UserRole, stalledRole: UserRole): string[] {
  if (actingRole === stalledRole) return STALLED_ROLE_ACTIONS;
  if (!isHigherRole(actingRole, stalledRole)) return [];
  return HIGHER_ROLE_ACTIONS[actingRole] ?? [];
}
