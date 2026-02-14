import { z } from 'zod';

export enum UserRole {
  REQUESTER = 'requester',
  INSTITUTION_MANAGER = 'institution_manager',
  SOP_VERIFIER = 'sop_verifier',
  ACCOUNTANT = 'accountant',
  VP = 'vp',
  HEAD_OF_INSTITUTION = 'head_of_institution',
  DEAN = 'dean',
  MMA = 'mma',
  HR = 'hr',
  AUDIT = 'audit',
  IT = 'it',
  CHIEF_DIRECTOR = 'chief_director',
  CHAIRMAN = 'chairman',
}

export enum RequestStatus {
  SUBMITTED = 'submitted',
  MANAGER_REVIEW = 'manager_review',
  // Parallel verification statuses
  PARALLEL_VERIFICATION = 'parallel_verification', // Both SOP and Budget verification in progress
  SOP_VERIFICATION = 'sop_verification',
  BUDGET_CHECK = 'budget_check',
  SOP_COMPLETED = 'sop_completed', // SOP verification done, waiting for budget
  BUDGET_COMPLETED = 'budget_completed', // Budget verification done, waiting for SOP
  INSTITUTION_VERIFIED = 'institution_verified', // Both verifications complete
  VP_APPROVAL = 'vp_approval',
  HOI_APPROVAL = 'hoi_approval',
  DEAN_REVIEW = 'dean_review',
  DEPARTMENT_CHECKS = 'department_checks',
  DEAN_VERIFICATION = 'dean_verification',
  CHIEF_DIRECTOR_APPROVAL = 'chief_director_approval',
  CHAIRMAN_APPROVAL = 'chairman_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLARIFICATION_REQUIRED = 'query_required',
  DEPARTMENT_CLARIFICATION = 'department_query', // For Dean's queries to MMA, HR, Audit, IT
}

export enum ActionType {
  CREATE = 'create',
  APPROVE = 'approve',
  REJECT = 'reject',
  CLARIFY = 'clarify',
  FORWARD = 'forward',
  REJECT_WITH_CLARIFICATION = 'reject_with_clarification', // Reject and send back for clarification
  CLARIFY_AND_REAPPROVE = 'clarify_and_reapprove', // Provide clarification and re-approve
}

export const CreateRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  college: z.string().min(1, 'College is required'),
  department: z.string().min(1, 'Department is required'),
  costEstimate: z.number().optional(),
  expenseCategory: z.string().optional().or(z.literal('')),
  sopReference: z.string().optional(),
  attachments: z.array(z.string()).min(1, 'At least one document is required'),
});

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  college?: string;
  department?: string;
  createdAt: Date;
}

export interface Request {
  _id: string;
  title: string;
  purpose: string;
  college: string;
  department: string;
  costEstimate: number;
  expenseCategory: string;
  sopReference?: string;
  attachments: string[];
  requester: User;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  history: ApprovalHistory[];
}

export interface ApprovalHistory {
  _id: string;
  action: ActionType;
  actor: User;
  notes?: string;
  budgetAvailable?: boolean;
  forwardedMessage?: string;
  attachments?: string[];
  previousStatus?: RequestStatus;
  newStatus?: RequestStatus;
  target?: 'sop' | 'budget'; // For query: which step to clarify
  queryRequest?: string; // Question/note when rejecting for query
  queryResponse?: string; // Response from lower level user
  queryAttachments?: string[]; // Attachments for query response
  requiresClarification?: boolean; // Flag to indicate this is a query request
  originalRejector?: User | string;
  isDeanMediated?: boolean;
  isDeanReapproval?: boolean;
  departmentResponse?: string;
  timestamp: Date;
}

export interface BudgetRecord {
  _id: string;
  college: string;
  department: string;
  category: string;
  allocated: number;
  spent: number;
  available: number;
  fiscalYear: string;
}

export interface SOPRecord {
  _id: string;
  code: string;
  title: string;
  description: string;
  college: string;
  department?: string;
  requiresBudgetCheck: boolean;
  minimumAmount?: number;
  isActive: boolean;
}

export interface AuditLog {
  _id: string;
  requestId: string;
  userId: string;
  action: string;
  details: any;
  timestamp: Date;
  ipAddress?: string;
}