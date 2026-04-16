import { UserRole } from './types';

// Define the hierarchy from lowest to highest authority
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.REQUESTER,
  UserRole.ACCOUNTANT,
  UserRole.INSTITUTION_MANAGER,
  UserRole.VP_RESEARCH,
  UserRole.VP_ACADEMIC,
  UserRole.VP_ADMIN,
  UserRole.RESEARCH_DIRECTOR,
  UserRole.HEAD_OF_INSTITUTION,
  UserRole.DEAN,
  UserRole.MMA,
  UserRole.HR,
  UserRole.AUDIT,
  UserRole.IT,
  UserRole.CHIEF_DIRECTOR,
  UserRole.CHAIRMAN,
];

// Get roles that a user can send queries to (below their level only, excluding themselves and Chairman)
export function getQueryableRoles(currentUserRole: UserRole): UserRole[] {
  const currentIndex = ROLE_HIERARCHY.indexOf(currentUserRole);
  
  if (currentIndex === -1) {
    return [UserRole.REQUESTER]; // Default fallback
  }
  
  // Return all roles below current level (excluding current user's role and Chairman)
  const availableRoles = ROLE_HIERARCHY.slice(0, currentIndex);
  
  // Remove Chairman from queryable roles - no one can query Chairman
  return availableRoles.filter(role => role !== UserRole.CHAIRMAN);
}

// Get display name for roles
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.REQUESTER]: 'Requester',
    [UserRole.INSTITUTION_MANAGER]: 'Institution Manager',
    [UserRole.ACCOUNTANT]: 'Accountant',
    [UserRole.VP_RESEARCH]: 'VP Research',
    [UserRole.VP_ACADEMIC]: 'VP Academic',
    [UserRole.VP_ADMIN]: 'VP Admin',
    [UserRole.RESEARCH_DIRECTOR]: 'Research Director',
    [UserRole.HEAD_OF_INSTITUTION]: 'Head of Institution',
    [UserRole.DEAN]: 'Dean',
    [UserRole.MMA]: 'MMA',
    [UserRole.HR]: 'HR',
    [UserRole.AUDIT]: 'Audit',
    [UserRole.IT]: 'IT',
    [UserRole.CHIEF_DIRECTOR]: 'Chief Director',
    [UserRole.CHAIRMAN]: 'Chairman',
  };
  
  return roleNames[role] || role;
}

// Check if a user can send query to a specific role (must be below sender's level and not Chairman)
export function canSendQueryTo(senderRole: UserRole, targetRole: UserRole): boolean {
  const senderIndex = ROLE_HIERARCHY.indexOf(senderRole);
  const targetIndex = ROLE_HIERARCHY.indexOf(targetRole);
  
  // Cannot send queries to Chairman - he's the final authority
  if (targetRole === UserRole.CHAIRMAN) {
    return false;
  }
  
  // Can only send to roles below sender's level (not same level or above)
  return senderIndex > targetIndex;
}