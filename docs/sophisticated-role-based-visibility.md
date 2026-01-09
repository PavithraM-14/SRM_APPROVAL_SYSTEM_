# Sophisticated Role-Based Request Visibility System

## Overview
Implemented a comprehensive role-based visibility system where users only see requests that have been properly forwarded to them through the workflow, with clear categorization of their involvement.

## Core Principle
**"Each role only sees requests that have reached their level through proper workflow progression"**

## Visibility Categories

### For Each User, Requests are Categorized as:

1. **Pending** - Requests waiting for the user's approval action
2. **Approved** - Requests the user has approved (or system-approved requests for requesters)
3. **In Progress** - Requests the user has been involved with but are now at other stages
4. **Completed** - Requests that are fully completed (approved/rejected)

## Implementation

### 1. Request Visibility Analysis (`lib/request-visibility.ts`)

**Core Function**: `analyzeRequestVisibility(request, userRole, userId)`

**Logic Flow**:
1. **Requesters**: Can always see their own requests
2. **Approvers**: Must have been involved OR request must have reached their level
3. **Categorization**: Based on current status and user's historical involvement

**Key Features**:
- Analyzes request history to determine user involvement
- Checks if request has reached user's approval level through proper workflow
- Categorizes requests based on user's action status
- Provides clear reasoning for visibility decisions

### 2. Enhanced APIs

#### Dashboard Stats API (`/app/api/dashboard/stats/route.ts`)
- Uses sophisticated visibility filtering
- Shows stats based on user's involvement categories
- **Pending**: Requests awaiting user's approval
- **Approved**: Requests user has approved + system approved requests

#### Requests API (`/app/api/requests/route.ts`)
- Applies visibility filtering to all requests
- Supports status filtering based on visibility categories
- Maintains pagination and search functionality

#### Approvals API (`/app/api/approvals/route.ts`)
- Shows only requests in 'pending' category
- Ensures users only see requests requiring their action

### 3. Enhanced UI Display

#### Request Lists Show:
- **User's Involvement Badge**: 
  - "⏳ Pending Your Action" (yellow)
  - "✓ You Approved" (green)
  - "❓ You Clarified" (blue)
  - "👁️ Visible" (gray)

- **Current Workflow Stage**: Shows actual request status
- **Clear Action Indicators**: What the user needs to do

## User Experience by Role

### Requesters
- See all their own requests
- **Pending**: Requests in progress (not approved/rejected)
- **Approved**: Successfully approved requests
- **Rejected**: Rejected requests

### Institution Managers
- See requests that have been submitted and reached manager level
- **Pending**: Requests needing manager review or routing decisions
- **In Progress**: Requests they've processed, now at verification/approval stages
- **Approved**: Requests they've approved that completed successfully

### SOP Verifiers & Accountants
- See requests sent for parallel verification
- **Pending**: Requests needing their verification
- **In Progress**: Requests they've verified, now with other verifiers or managers
- **Approved**: Requests they verified that got approved

### Higher Level Approvers (VP, HOI, Dean, etc.)
- See requests that have completed lower-level approvals
- **Pending**: Requests at their approval level
- **In Progress**: Requests they've approved, now at higher levels
- **Approved**: Requests they approved that completed

### Department Users (MMA, HR, Audit, IT)
- See only requests where Dean specifically requested their query
- **Pending**: Clarification requests directed to them
- **In Progress**: Queries they've provided

## Security & Workflow Integrity

### Maintained Security
- Users cannot see requests that haven't reached their level
- Proper workflow progression is enforced
- Historical involvement is tracked and verified

### Workflow Integrity
- Requests must follow proper approval chain
- No "jumping" levels without proper forwarding
- Clear audit trail of all user interactions

## Benefits

### 1. Clear Workflow Understanding
- Users see exactly what requires their attention
- Clear indication of their involvement in each request
- Understanding of current workflow stage

### 2. Improved Productivity
- No confusion about which requests need action
- Clear categorization reduces cognitive load
- Focused attention on pending items

### 3. Better System Transparency
- Users understand their role in the process
- Clear visibility into workflow progression
- Historical involvement tracking

### 4. Enhanced Accountability
- Clear record of who approved what
- Transparent workflow progression
- Audit trail of all decisions

## Technical Features

### Sophisticated History Analysis
- Tracks all user actions on requests
- Determines involvement level and type
- Categorizes based on current status vs user actions

### Efficient Filtering
- Single query gets all requests
- Client-side filtering for performance
- Maintains pagination and search

### Flexible Categorization
- Adapts to different workflow stages
- Handles parallel verification scenarios
- Supports query workflows

## Files Created/Modified

### New Files
1. **lib/request-visibility.ts** - Core visibility analysis logic

### Modified Files
1. **app/api/dashboard/stats/route.ts** - Uses new visibility system
2. **app/api/requests/route.ts** - Enhanced with visibility filtering
3. **app/api/approvals/route.ts** - Shows only pending requests
4. **app/dashboard/requests/page.tsx** - Shows involvement badges
5. **app/dashboard/approvals/page.tsx** - Enhanced approval indicators

## Future Enhancements

1. **Advanced Filtering**: Filter by involvement type
2. **Workflow Analytics**: Time spent at each stage
3. **Notification System**: Alert users of pending actions
4. **Bulk Actions**: Process multiple requests at once
5. **Delegation**: Temporary approval delegation

## Testing Scenarios

1. **Request Creation**: Requester creates → Manager sees in pending
2. **Manager Approval**: Manager approves → SOP/Accountant see in pending
3. **Verification**: SOP verifies → Shows in manager's "in progress"
4. **Final Approval**: VP approves → Shows in everyone's involvement as completed
5. **Clarification**: Dean requests query → Department sees in pending

This system ensures that every user has a clear, accurate view of their role in the approval process while maintaining security and workflow integrity.