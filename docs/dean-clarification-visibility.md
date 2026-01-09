# Dean Clarification Visibility Enhancement

## Overview
Enhanced the workflow to provide clear visibility to the Dean when departments respond to query requests, both in the approval modal and on the dashboard.

## Problem Solved
Previously, when a Dean requested query from a department (MMA, IT, Audit, HR) and the department responded, the Dean couldn't easily see:
- Which department had responded
- When the response was received
- That the query was complete and ready for next action

## Solution Implemented

### 1. Enhanced History Tracking
**API Route Changes** (`app/api/requests/[id]/approve/route.ts`):
- Added `departmentResponse` field to history entries when departments respond
- Tracks which specific department (MMA, HR, Audit, IT) provided the response
- Links department responses to original query requests

### 2. Dean Approval Modal Enhancement
**ApprovalModal Changes** (`components/ApprovalModal.tsx`):
- **New Section**: "Clarification Completed" UI for Dean when at `dean_review` status
- **Visual Indicator**: Green success banner showing which department responded
- **Response Details**: Shows department name, response date, and original query target
- **Clear Actions**: 
  - "Proceed with Request" (continue workflow)
  - "Request Additional Clarification" (if needed)
  - "Reject" (if response is unsatisfactory)

### 3. Dashboard Visibility
**Dashboard Enhancement** (`app/dashboard/requests/page.tsx`):
- **Status Badges**: Added query status indicators next to request status
- **Pending Queries**: "⏳ Awaiting [DEPARTMENT]" badge for pending responses
- **Completed Queries**: "✓ [DEPARTMENT] Responded" badge for completed responses
- **Real-time Updates**: Status updates automatically when departments respond

## User Experience Flow

### For Dean:
1. **Request Clarification**: Dean sends query to specific department
2. **Dashboard View**: See "⏳ Awaiting [DEPARTMENT]" badge on request
3. **Department Responds**: Badge changes to "✓ [DEPARTMENT] Responded"
4. **Process Response**: Dean sees clear "Clarification Completed" UI with response details
5. **Take Action**: Dean can proceed, request more query, or reject

### For Departments:
1. **Receive Clarification**: See "Department Query Response" UI
2. **Provide Response**: Submit query response
3. **Automatic Routing**: Request returns to Dean with response tracked

## Visual Indicators

### Dashboard Badges:
- **Pending**: Orange badge "⏳ Awaiting [DEPARTMENT]"
- **Completed**: Green badge "✓ [DEPARTMENT] Responded"
- **Normal**: Standard status badge only

### Approval Modal:
- **Completed Clarification**: Green success banner with department details
- **Response Date**: Clear timestamp of when department responded
- **Action Options**: Contextual actions based on query status

## Technical Implementation

### History Tracking:
```javascript
// When department responds
historyEntry.departmentResponse = user.role; // 'mma', 'hr', 'audit', 'it'
```

### Clarification Detection:
```javascript
// Find latest Dean query
const latestClarification = history.filter(h => 
  h.action === 'clarify' && h.queryTarget && h.actor?.role === 'dean'
);

// Check for department response
const departmentResponse = history.find(h => 
  h.departmentResponse && h.timestamp > latestClarification.timestamp
);
```

## Benefits

1. **Clear Workflow Visibility**: Dean always knows query status
2. **Reduced Confusion**: No more wondering if departments have responded
3. **Faster Processing**: Clear indicators help Dean act quickly on responses
4. **Better Tracking**: Complete audit trail of query requests and responses
5. **Improved UX**: Visual indicators make status immediately apparent

## Files Modified
- `app/api/requests/[id]/approve/route.ts` - Enhanced history tracking
- `components/ApprovalModal.tsx` - Added Dean query completed UI
- `app/dashboard/requests/page.tsx` - Added query status badges

## Testing Scenarios
1. Dean requests query from MMA → Dashboard shows "⏳ Awaiting MMA"
2. MMA responds → Dashboard shows "✓ MMA Responded"
3. Dean opens request → Sees "Clarification Completed" UI with MMA response details
4. Dean can proceed with workflow or request additional query