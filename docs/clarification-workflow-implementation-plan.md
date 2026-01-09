# Clarification Workflow Implementation Plan

## Overview
This document outlines the implementation plan for the query/feedback workflow when requests are rejected.

## Feature Requirements

### 1. Rejection with Clarification
- When a user rejects a request, they MUST provide a note/question
- This note explains what needs to be clarified
- Optional: Attach files for reference

### 2. Backward Flow
- Request goes back to the previous level in the workflow
- Previous level user sees it in their "Pending Approvals"
- Special indicator (alarm symbol) shows it requires query

### 3. Clarification Modal
- When user opens the request details, a modal automatically appears
- Modal shows:
  - The rejection note/question from upper level
  - Any attached files
  - Input field for query response
  - File upload for query attachments

### 4. Response Options
**Option A: Provide Clarification and Re-approve**
- User provides query note
- Optional: Attach supporting files
- Click "Approve with Clarification"
- Request goes back to the upper level user who requested query

**Option B: Unable to Clarify - Reject Further**
- User cannot provide satisfactory query
- Click "Reject" with their own note
- Request goes to an even lower level (one step back in workflow)
- Same query process repeats

## Implementation Steps

### Phase 1: Data Model Updates ✅ COMPLETED
- [x] Add new ActionType values
- [x] Add query fields to ApprovalHistory
- [x] Add query tracking to Request model

### Phase 2: Approval Engine Updates
- [ ] Add logic to determine previous level in workflow
- [ ] Handle REJECT_WITH_CLARIFICATION action
- [ ] Handle CLARIFY_AND_REAPPROVE action
- [ ] Update status transitions for query flow

### Phase 3: API Updates
- [ ] Update approvals API to handle query actions
- [ ] Add validation for query notes (required)
- [ ] Add file upload handling for query attachments
- [ ] Update request visibility to show query indicator

### Phase 4: UI Components
- [ ] Create QueryModal component
- [ ] Add alarm/indicator icon for query requests
- [ ] Update ApprovalModal to support query actions
- [ ] Add query response form
- [ ] Add file upload for query attachments

### Phase 5: Request Details Page
- [ ] Auto-open query modal when request has pending query
- [ ] Show query history in request timeline
- [ ] Display query notes and responses

### Phase 6: Dashboard Updates
- [ ] Add query indicator to pending requests
- [ ] Update request cards to show query status
- [ ] Add filter for query requests

## Workflow Hierarchy (for backward flow)

```
1. Requester (lowest)
2. Institution Manager
3. SOP Verifier / Accountant (parallel)
4. Institution Manager (routing)
5. VP (if budget available)
6. HOI (if budget available)
7. Dean
8. Department (MMA/HR/AUDIT/IT) - if Dean requests
9. Chief Director
10. Chairman (highest)
```

## Clarification Flow Examples

### Example 1: VP rejects for query
1. VP sees request at VP_APPROVAL
2. VP clicks "Reject with Clarification"
3. VP provides note: "Please clarify the budget allocation breakdown"
4. Request goes back to Institution Manager (previous level)
5. Manager sees request with alarm indicator
6. Manager opens request → Modal shows VP's question
7. Manager provides query and re-approves
8. Request goes back to VP_APPROVAL

### Example 2: Manager cannot clarify, rejects further
1. Manager receives query request from VP
2. Manager realizes they cannot clarify
3. Manager clicks "Reject" with note: "Need more details from requester"
4. Request goes back to Requester
5. Requester sees request with alarm indicator
6. Requester can update request and resubmit

### Example 3: Dean rejects for query after HOI approval
1. Dean sees request at DEAN_REVIEW
2. Dean clicks "Reject with Clarification"
3. Dean provides note: "Please explain the long-term maintenance costs"
4. Request goes back to HOI (previous level)
5. HOI sees request with alarm indicator
6. HOI provides query and re-approves
7. Request goes back to DEAN_REVIEW

## Database Schema Changes

### Request Model
```typescript
{
  pendingQuery: Boolean,
  queryLevel: String, // Role that needs to provide query
}
```

### ApprovalHistory
```typescript
{
  queryRequest: String, // Question from upper level
  queryResponse: String, // Response from lower level
  queryAttachments: [String], // Files attached to query
  requiresClarification: Boolean, // Flag for this entry
}
```

## API Endpoints to Update

### POST /api/approvals (existing)
Add support for:
- `action: 'reject_with_query'`
- `queryRequest: string` (required)
- `attachments: string[]` (optional)

### POST /api/approvals (existing)
Add support for:
- `action: 'query_and_reapprove'`
- `queryResponse: string` (required)
- `queryAttachments: string[]` (optional)

## UI Components to Create/Update

### 1. QueryModal.tsx
- Shows query request from upper level
- Input field for query response
- File upload component
- Two action buttons: "Approve with Clarification" and "Reject"

### 2. ApprovalModal.tsx (update)
- Add "Reject with Clarification" button
- Add query note input field
- Validate query note is provided

### 3. RequestCard.tsx (update)
- Add alarm icon indicator for query requests
- Show "Needs Clarification" badge

### 4. Request Details Page (update)
- Auto-detect if request has pending query
- Auto-open QueryModal
- Show query history in timeline

## Testing Scenarios

### Test 1: VP Clarification Flow
1. Login as VP
2. Reject request with query note
3. Login as Manager
4. Verify alarm indicator appears
5. Open request → verify modal appears
6. Provide query and re-approve
7. Login as VP
8. Verify request is back at VP level
9. Verify query response is visible

### Test 2: Cascading Rejection
1. Login as Dean
2. Reject request with query
3. Login as HOI
4. Cannot clarify, reject further
5. Login as VP
6. Verify request is at VP level with query indicator
7. Provide query and re-approve
8. Verify request goes back to HOI

### Test 3: Multiple Clarification Rounds
1. VP requests query
2. Manager provides query
3. VP still not satisfied, requests query again
4. Manager provides additional query
5. VP approves

## Security Considerations

1. **Authorization**: Only users at the correct level can respond to queries
2. **Validation**: Clarification notes must be provided (not empty)
3. **Audit Trail**: All query requests and responses logged in history
4. **File Security**: Validate file uploads, check file types and sizes

## Performance Considerations

1. **Modal Loading**: Lazy load query modal
2. **File Uploads**: Implement chunked uploads for large files
3. **History Display**: Paginate query history if too many entries

## Rollout Plan

1. **Phase 1**: Deploy data model changes (backward compatible)
2. **Phase 2**: Deploy API updates with feature flag
3. **Phase 3**: Deploy UI components (hidden behind feature flag)
4. **Phase 4**: Enable feature for testing users
5. **Phase 5**: Full rollout after testing

## Notes

- This is a MAJOR feature that affects the core approval workflow
- Requires careful testing before deployment
- Should be implemented incrementally with feature flags
- Need to update all existing documentation
- Training materials needed for users

## Status

- **Current**: Planning phase
- **Next**: Implement Phase 2 (Approval Engine Updates)
- **Blocked**: None
- **Risk**: High complexity, potential for breaking existing workflow
