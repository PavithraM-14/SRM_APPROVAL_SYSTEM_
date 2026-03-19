# Implementation Plan: Approval Escalation & Flagging

## Overview

Implement automatic escalation and flagging for stalled approval requests. The work proceeds in dependency order: data model first, then pure logic helpers, then API routes, then UI, then property-based tests woven in close to each component.

## Tasks

- [x] 1. Extend data model and types
  - [x] 1.1 Add escalation subdocument to `models/Request.ts`
    - Add `escalationSchema` with fields: `reminderSent`, `reminderSentAt`, `flagged`, `flaggedAt`, `stalledRole`, `actedByHigherRole`, `actedByHigherRoleAt`
    - Add `escalation: { type: escalationSchema, default: () => ({}) }` to `requestSchema`
    - _Requirements: 2.1, 2.2, 4.3_

  - [x] 1.2 Add new `ActionType` values to `lib/types.ts`
    - Add `ESCALATION_REMINDER = 'escalation_reminder'`
    - Add `ESCALATION_FLAGGED = 'escalation_flagged'`
    - Add `ESCALATION_ACTION = 'escalation_action'`
    - Add `skippedRole` optional field to `ApprovalHistory` interface
    - Update `approvalHistorySchema` in `models/Request.ts` to include `skippedRole: { type: String }` and the new enum values
    - _Requirements: 2.2, 4.3_

- [x] 2. Create `lib/escalation-hierarchy.ts` module
  - [x] 2.1 Implement hierarchy constants and pure helper functions
    - Export `ESCALATION_HIERARCHY: UserRole[]` ordered array
    - Export `ESCALATABLE_STATUSES: RequestStatus[]`
    - Implement `isHigherRole(roleA, roleB): boolean`
    - Implement `getHigherRoles(role): UserRole[]`
    - Implement `getEscalationReferenceTime(request): Date | null` — returns timestamp of most recent history entry whose `newStatus` equals `request.status`
    - Implement `getActionsForHigherRole(actingRole, stalledRole, request): string[]` — returns permitted action strings for the acting role
    - Implement `canActOnFlaggedRequest(actingRole, stalledRole): boolean`
    - _Requirements: 3.1, 4.1, 4.4–4.8, 6.1, 6.3, 7.1_

  - [ ]* 2.2 Write property test: `getEscalationReferenceTime` returns last status-setting timestamp
    - **Property 13: Escalation timer reference is the last status-setting history timestamp**
    - **Validates: Requirements 6.1, 6.3**
    - Use `fast-check` to generate random history arrays with multiple status-setting entries

  - [ ]* 2.3 Write property test: `isHigherRole` / hierarchy ordering
    - **Property 6: Flagged request visibility follows hierarchy**
    - **Validates: Requirements 3.1, 3.3**
    - Generate random pairs of roles; verify `isHigherRole` is consistent with `ESCALATION_HIERARCHY` index ordering

  - [ ]* 2.4 Write property test: escalation only applies to escalatable statuses
    - **Property 5: Escalation only applies to escalatable statuses**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Generate requests with non-escalatable statuses and any elapsed time; verify `ESCALATABLE_STATUSES` excludes them

- [x] 3. Add escalation reminder email template to `lib/email.ts`
  - [x] 3.1 Implement `sendEscalationReminderEmail` function
    - Parameters: `toEmail`, `toName`, `requestTitle`, `requestId`, `elapsedHours`, `stalledRole`
    - HTML body includes: request title, elapsed time, stalled role, warning that request will be flagged in `(10 - elapsedHours)` hours
    - Follow existing `sendEmail` / `sendEmailWithSmtp` pattern
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 3.2 Write property test: reminder email contains required fields
    - **Property 2: Reminder email contains required fields**
    - **Validates: Requirements 1.2**
    - Generate random `requestTitle`, `elapsedHours`, `stalledRole` values; verify the produced HTML string contains all three

- [x] 4. Implement `/api/escalation/run` POST route
  - [x] 4.1 Create `app/api/escalation/run/route.ts`
    - Validate `x-escalation-secret` header against `ESCALATION_SECRET` env var; return 401 if missing/wrong
    - Query MongoDB for all requests with `status` in `ESCALATABLE_STATUSES`
    - For each request: compute `elapsedMs` using `getEscalationReferenceTime`
    - If `elapsedMs >= 8h` and `escalation.reminderSent === false`: call `sendEscalationReminderEmail`, set `escalation.reminderSent = true` and `escalation.reminderSentAt`; on email failure log and skip setting `reminderSent` so next poll retries
    - If `elapsedMs >= 10h` and `escalation.flagged === false`: set `escalation.flagged = true`, `escalation.flaggedAt`, `escalation.stalledRole`; push history entry with `action: ESCALATION_FLAGGED`
    - Return `{ processed, reminded, flagged, errors[] }` summary
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [ ]* 4.2 Write property test: reminder triggers only at 8-hour threshold
    - **Property 1: Reminder triggers only at the 8-hour threshold**
    - **Validates: Requirements 1.1, 1.4**
    - Generate requests with varying elapsed times and `reminderSent` states; verify reminder triggers iff elapsed >= 8h and `reminderSent` is false

  - [ ]* 4.3 Write property test: flagging triggers only at 10-hour threshold
    - **Property 3: Flagging triggers only at the 10-hour threshold**
    - **Validates: Requirements 2.1, 2.3**
    - Generate requests with varying elapsed times and `flagged` states; verify flagging triggers iff elapsed >= 10h and `flagged` is false

  - [ ]* 4.4 Write property test: flagging records a complete history entry
    - **Property 4: Flagging records a complete history entry**
    - **Validates: Requirements 2.2**
    - Generate random requests, run the flagging logic, verify the history entry has `action = 'escalation_flagged'`, non-null `stalledRole`, non-null `timestamp`, and a reason field

- [x] 5. Checkpoint — core escalation logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `/api/requests/flagged` GET route
  - [x] 6.1 Create `app/api/requests/flagged/route.ts`
    - Authenticate user; return 401 if unauthenticated
    - Return 403 if user role is `INSTITUTION_MANAGER` or any non-hierarchy role
    - Query requests where `escalation.flagged === true` and `status` not in `[APPROVED, REJECTED]`
    - Filter results using `getHigherRoles` + stalled-role equality check (Property 6 predicate)
    - Support `?countOnly=true` query param — return `{ count: N }` for badge
    - Return full response shape per design: `_id`, `requestId`, `title`, `college`, `department`, `requester`, `status`, `escalation`, `timeSinceFlagged`
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 Write property test: flagged request visibility follows hierarchy
    - **Property 6: Flagged request visibility follows hierarchy** (API-level)
    - **Validates: Requirements 3.1, 3.3**
    - Generate random flagged requests with random `stalledRole`; for each role in hierarchy verify filter includes/excludes correctly

  - [ ]* 6.3 Write property test: flagged API response contains all required display fields
    - **Property 7: Flagged requests API response contains all required display fields**
    - **Validates: Requirements 3.7**
    - Generate random flagged requests; verify response objects contain `title`, `escalation.stalledRole`, `escalation.flaggedAt`, `requester.name`, `college`, `department`

  - [ ]* 6.4 Write property test: resolved requests excluded from flagged view
    - **Property 8: Resolved requests are excluded from flagged view**
    - **Validates: Requirements 3.8**
    - Generate requests with `status = APPROVED` or `REJECTED` and `escalation.flagged = true`; verify they are excluded

  - [ ]* 6.5 Write property test: badge count equals actionable flagged requests
    - **Property 14: Badge count equals number of actionable flagged requests for the user's role**
    - **Validates: Requirements 5.2**
    - Generate random sets of flagged requests and a user role; verify `countOnly` result equals count of requests where role can see it AND `actedByHigherRole` is not set AND status is not terminal

- [x] 7. Extend `/api/requests/[id]/approve` for flagged request actions
  - [x] 7.1 Add flagged-request handling branch to `app/api/requests/[id]/approve/route.ts`
    - After fetching `requestRecord`, check `escalation.flagged === true`
    - If flagged: validate acting user is strictly higher than `escalation.stalledRole` using `isHigherRole`; return 403 with `"Not authorized to act on this flagged request"` if not
    - Validate `action` is in `getActionsForHigherRole(actingRole, stalledRole, request)`; return 400 with `"Action not permitted for your role on this flagged request"` if not
    - On success: set `escalation.actedByHigherRole` and `escalation.actedByHigherRoleAt`; add history entry with `action: ESCALATION_ACTION` and `skippedRole: stalledRole`
    - Use existing `approvalEngine.getNextStatus` with the acting role for status transition
    - Add `'escalation_action'` to the valid actions list at the top of the route
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 7.2 Write property test: higher role action produces correct next status
    - **Property 10: Higher role action produces correct next status**
    - **Validates: Requirements 4.1, 4.2, 4.4–4.8**
    - Generate random flagged requests and valid higher-role/action combinations; verify resulting status matches `approvalEngine.getNextStatus` output

  - [ ]* 7.3 Write property test: escalation action history records skipped role
    - **Property 11: Escalation action history records skipped role**
    - **Validates: Requirements 4.3**
    - Generate random flagged requests and higher-role actions; verify history entry has `action = 'escalation_action'` and `skippedRole = stalledRole`

  - [ ]* 7.4 Write property test: invalid higher-role actions rejected without state change
    - **Property 12: Invalid higher-role actions are rejected without state change**
    - **Validates: Requirements 4.9**
    - Generate random flagged requests and invalid action strings; verify API returns error and request fields are unchanged

  - [ ]* 7.5 Write property test: higher role lockout after escalation action
    - **Property 9: Higher role lockout after escalation action**
    - **Validates: Requirements 3.5, 3.6**
    - Generate flagged requests with `actedByHigherRole` set; verify roles at or below acting role are denied and receive `Escalated_Past_Message`

- [x] 8. Checkpoint — API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update sidebar navigation in `app/dashboard/layout.tsx`
  - [x] 9.1 Add `FlagIcon` import from `@heroicons/react/24/outline`
  - [x] 9.2 Add `flaggedCount` state and fetch logic mirroring existing `queryCount` pattern
    - Fetch from `/api/requests/flagged?countOnly=true` on mount and every 30 seconds
    - Only fetch when user role is in `[VP, HEAD_OF_INSTITUTION, DEAN, CHIEF_DIRECTOR, CHAIRMAN]`
  - [x] 9.3 Add "Flagged Requests" nav item to `navigation` array
    - `href: '/dashboard/flagged'`, `icon: FlagIcon`
    - `roles: [UserRole.VP, UserRole.HEAD_OF_INSTITUTION, UserRole.DEAN, UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN]`
  - [x] 9.4 Render badge on "Flagged Requests" link when `flaggedCount > 0`, styled consistently with existing `queryCount` badge
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. Create `/dashboard/flagged` page
  - [x] 10.1 Create `app/dashboard/flagged/page.tsx`
    - Fetch from `/api/requests/flagged` on mount
    - Display table with columns: request title, stalled role, time since flagging, requester name, college, department
    - For each row where `escalation.actedByHigherRole` is not set and user is a higher role: show action buttons (approve/reject/forward as appropriate per `getActionsForHigherRole`)
    - For each row where `escalation.actedByHigherRole` is set: show inline `"This request has been escalated past you"` message in place of action buttons
    - Show empty state when no flagged requests
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.7, 4.1_

- [x] 11. Update request detail page to show escalation state
  - [x] 11.1 Update `app/dashboard/requests/[id]/page.tsx`
    - If `escalation.flagged === true` and viewer is the stalled role: render a yellow "Flagged" banner above the action area
    - If `escalation.actedByHigherRole` is set and viewer's role is at or below `stalledRole` in hierarchy: render the `Escalated_Past_Message` and disable all action buttons
    - _Requirements: 3.4, 3.5_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Each property test file should include the tag comment: `// Feature: approval-escalation-flagging, Property N: <property_text>`
- The escalation route must be invoked by an external cron (Vercel Cron, GitHub Actions, or system cron) at ≤1-minute intervals — no in-process scheduler is needed
- `ESCALATION_SECRET` env var must be added to `.env.example`
