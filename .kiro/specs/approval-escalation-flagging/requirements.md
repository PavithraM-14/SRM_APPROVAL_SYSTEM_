# Requirements Document

## Introduction

This feature introduces an automatic escalation and flagging mechanism for approval requests that stall at any role in the workflow. When a request sits unprocessed for 8 hours, the assigned approver receives a reminder email. If the request remains unprocessed for 2 more hours (10 hours total), it is automatically flagged. Flagged requests become visible to all roles above the stalled role in a dedicated "Flagged Requests" page accessible from the navigation sidebar. Higher roles can act on flagged requests as if they had received the request at the next logical step in the workflow — skipping the stalled role and continuing the approval chain from that point forward.

## Glossary

- **Escalation_Service**: The background service responsible for monitoring request timestamps, sending reminder emails, and triggering flag transitions.
- **Flagged_Request**: A request that has been automatically marked as flagged after remaining unprocessed for 10 hours at a given role.
- **Stalled_Role**: The role at which a request has been sitting unprocessed and has triggered the escalation/flagging logic.
- **Higher_Role**: Any role that appears later (higher authority) in the approval workflow hierarchy relative to the Stalled_Role.
- **Escalation_Window**: The 8-hour period after a request is forwarded to a role, after which a reminder email is sent.
- **Flag_Window**: The 2-hour period after the reminder email is sent (10 hours total) after which the request is flagged.
- **Flagged_Requests_Page**: A dedicated UI page accessible from the navigation sidebar that displays all flagged requests visible to the currently authenticated user.
- **Workflow_Hierarchy**: The ordered sequence of roles in the approval chain: Institution_Manager → VP → HOI → Dean → Chief_Director → Chairman. (Accountant and department roles are intermediary steps and are excluded from escalation logic.)
- **Next_Valid_Action**: The set of actions a Higher_Role can perform on a flagged request, equivalent to the actions they would have been able to take had the request arrived at their step normally.
- **Escalated_Past_Message**: The message "This request has been escalated past you" shown to a Stalled_Role (or any lower role in the chain) once a Higher_Role has already acted on the flagged request, indicating that the role can no longer take action.

## Requirements

### Requirement 1: Reminder Email at 8 Hours

**User Story:** As a system administrator, I want the system to automatically notify approvers who have not acted on a request within 8 hours, so that approvers are reminded before a request gets flagged.

#### Acceptance Criteria

1. WHEN a request has been in a pending state at a role for exactly 8 hours without any action, THE Escalation_Service SHALL send a reminder email to the user assigned to that role.
2. THE reminder email SHALL include the request title, the time elapsed since the request was forwarded, and a warning that the request will be flagged in 2 hours if no action is taken.
3. IF the Escalation_Service fails to send the reminder email, THEN THE Escalation_Service SHALL log the failure with the request ID, target role, and timestamp, and SHALL retry the email delivery.
4. WHEN a request is acted upon before the 8-hour threshold is reached, THE Escalation_Service SHALL NOT send a reminder email for that request at that role.

---

### Requirement 2: Automatic Flagging at 10 Hours

**User Story:** As a system administrator, I want requests that remain unprocessed for 10 hours to be automatically flagged, so that higher roles can intervene and prevent workflow bottlenecks.

#### Acceptance Criteria

1. WHEN a request has been in a pending state at a role for exactly 10 hours without any action, THE Escalation_Service SHALL transition the request to a flagged state.
2. WHEN a request is flagged, THE Escalation_Service SHALL record the flagging event in the request's approval history, including the Stalled_Role, the timestamp, and the reason (timeout).
3. WHEN a request is acted upon before the 10-hour threshold is reached, THE Escalation_Service SHALL NOT flag the request.
4. THE Escalation_Service SHALL evaluate pending requests at a polling interval of no greater than 1 minute to detect requests that have crossed the 8-hour or 10-hour thresholds.

---

### Requirement 3: Flagged Requests Visibility

**User Story:** As any role in the approval chain, I want to see when a request assigned to me (or below me) has been flagged, so that I am aware of the escalation status and can act if no higher role has intervened yet.

#### Acceptance Criteria

1. WHEN a request is flagged at a given Stalled_Role, THE System SHALL make that request visible to the Stalled_Role itself AND to all Higher_Roles above the Stalled_Role in the Workflow_Hierarchy.
2. THE System SHALL expose a "Flagged Requests" page accessible from the navigation sidebar to any authenticated user whose role is VP, HOI, Dean, Chief_Director, or Chairman and who has at least one flagged request visible to their role. Institution_Manager SHALL NOT have access to the Flagged_Requests_Page via the sidebar; instead, the flagged status SHALL be surfaced to Institution_Manager only on the individual request detail page.
3. WHILE a user is viewing the Flagged_Requests_Page, THE System SHALL display only the flagged requests that are visible to that user's role.
4. WHEN a flagged request is viewed by the Stalled_Role and no Higher_Role has yet acted on it, THE System SHALL allow the Stalled_Role to take action on the request as normal.
5. WHEN a Higher_Role has acted on a flagged request, THE System SHALL display the Escalated_Past_Message to the Stalled_Role and to any other roles lower than the acting Higher_Role in the Workflow_Hierarchy, and THE System SHALL prevent those roles from taking any further action on that request.
6. IF a flagged request is acted upon by any Higher_Role, THEN THE System SHALL remove that request from the active (actionable) view on the Flagged_Requests_Page for all roles that have been superseded, replacing it with the Escalated_Past_Message entry.
7. THE Flagged_Requests_Page SHALL display for each request: the request title, the Stalled_Role, the time elapsed since flagging, the requester name, and the college and department.
8. WHEN a request is fully resolved (approved or rejected), THE System SHALL remove that request from the Flagged_Requests_Page for all roles.

---

### Requirement 4: Flagged Request Actions for Higher Roles

**User Story:** As a higher-authority role, I want to act on a flagged request as if I had received it at the next step in the workflow, so that the approval chain can continue without the stalled role's involvement.

#### Acceptance Criteria

1. WHEN a Higher_Role accesses a flagged request, THE System SHALL present only the actions that role would have been able to perform had the request arrived at their step in the workflow normally.
2. WHEN a Higher_Role performs an action on a flagged request, THE System SHALL advance the request to the next status in the Workflow_Hierarchy as if the Stalled_Role had forwarded it, skipping the Stalled_Role entirely.
3. THE System SHALL record in the approval history that the action was taken by a Higher_Role on a flagged request, including which role was skipped.
4. WHEN a VP acts on a flagged request that stalled at Institution_Manager, THE System SHALL allow the VP to forward the request to HOI — equivalent to the VP's normal action.
5. WHEN a HOI acts on a flagged request that stalled at VP, THE System SHALL allow the HOI to forward the request to Dean — equivalent to HOI's normal action.
6. WHEN a Dean acts on a flagged request that stalled at HOI or VP, THE System SHALL allow the Dean to perform the same actions Dean would normally take upon receiving the request.
7. WHEN a Chief_Director acts on a flagged request that stalled at Dean or above, THE System SHALL allow the Chief_Director to perform the same actions Chief_Director would normally take.
8. WHEN a Chairman acts on a flagged request that stalled at any lower role, THE System SHALL allow the Chairman to approve or reject the request.
9. IF a Higher_Role attempts to perform an action not permitted for their role on a flagged request, THEN THE System SHALL return an error and SHALL NOT modify the request status.

---

### Requirement 5: Flagged Requests Navigation Entry

**User Story:** As any user whose request has stalled or who has authority over a stalled request, I want a dedicated sidebar navigation entry for flagged requests, so that I can quickly access requests that need attention.

#### Acceptance Criteria

1. THE Navigation_Sidebar SHALL display a "Flagged Requests" link to any authenticated user whose role is VP, HOI, Dean, Chief_Director, or Chairman.
2. WHILE there are one or more flagged requests visible to the authenticated user, THE Navigation_Sidebar SHALL display a badge or count indicator on the "Flagged Requests" link showing the number of pending flagged requests.
3. WHEN there are no flagged requests visible to the authenticated user, THE Navigation_Sidebar SHALL display the "Flagged Requests" link without a badge.
4. WHEN the authenticated user's role is Institution_Manager, Accountant, Requester, or a department role (MMA, HR, Audit, IT), THE Navigation_Sidebar SHALL NOT display the "Flagged Requests" link.

---

### Requirement 6: Escalation Timer Reset on Action

**User Story:** As a system administrator, I want escalation timers to reset correctly when a request moves between roles, so that each role gets a fair 8-hour window before escalation begins.

#### Acceptance Criteria

1. WHEN a request is forwarded to a new role, THE Escalation_Service SHALL start a new escalation timer for that role beginning at the time of forwarding.
2. WHEN a request is acted upon at any role (forwarded, approved, or rejected), THE Escalation_Service SHALL cancel any pending escalation timers for the previous role.
3. THE Escalation_Service SHALL use the timestamp recorded in the approval history entry for the forwarding action as the reference time for the escalation timer.

---

### Requirement 7: Flagging Exclusions

**User Story:** As a system administrator, I want escalation and flagging to apply only to the primary approval roles, so that intermediary steps like budget checks and department verifications are not incorrectly flagged.

#### Acceptance Criteria

1. THE Escalation_Service SHALL apply escalation and flagging logic only to requests in the following statuses: MANAGER_REVIEW, VP_APPROVAL, HOI_APPROVAL, DEAN_REVIEW, CHIEF_DIRECTOR_APPROVAL, and CHAIRMAN_APPROVAL.
2. THE Escalation_Service SHALL NOT apply escalation or flagging logic to requests in BUDGET_CHECK, INSTITUTION_VERIFIED, DEPARTMENT_CHECKS, DEAN_VERIFICATION, APPROVED, REJECTED, CLARIFICATION_REQUIRED, or DEPARTMENT_CLARIFICATION statuses.
3. WHEN a request is in APPROVED or REJECTED status, THE Escalation_Service SHALL NOT send reminder emails or flag the request.
