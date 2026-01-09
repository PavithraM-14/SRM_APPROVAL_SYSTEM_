# Role-Based Request Visibility System

## Overview
Implemented comprehensive role-based request visibility to ensure users only see requests that are relevant to their role and current workflow status. No user can see requests that haven't been forwarded to their approval level.

## Problem Solved
Previously, all users could see all requests regardless of their role or workflow status. This created security and workflow issues where users could see requests they shouldn't have access to.

## Solution Implemented

### 1. Role-Based Request Filtering

#### **Requester (REQUESTER)**
- **Can See**: Only their own submitted requests
- **Dashboard Stats**: Based on their own requests only
- **Pending Approvals**: None (requesters don't approve requests)

#### **Institution Manager (INSTITUTION_MANAGER)**
- **Can See**: 
  - Requests at `submitted` status (new requests)
  - Requests at `manager_review` status (awaiting their action)
  - Requests at `sop_query` and `budget_query` (returned for review)
  - Requests at `institution_verified` (both verifications complete, awaiting routing)
- **Pending Approvals**: Requests at `manager_review` status only

#### **SOP Verifier (SOP_VERIFIER)**
- **Can See**:
  - Requests at `sop_verification` status
  - Requests at `parallel_verification` status (parallel SOP/budget verification)
  - Requests at `budget_completed` status (budget done, awaiting SOP completion)
  - Requests they've previously worked on (`sop_completed`, `sop_query`)
- **Pending Approvals**: Active SOP verification requests only

#### **Accountant (ACCOUNTANT)**
- **Can See**:
  - Requests at `budget_check` status (legacy workflow)
  - Requests at `parallel_verification` status (parallel SOP/budget verification)
  - Requests at `sop_completed` status (SOP done, awaiting budget completion)
  - Requests they've previously worked on (`budget_completed`, `budget_query`)
- **Pending Approvals**: Active budget verification requests only

#### **Vice President (VP)**
- **Can See**:
  - Requests at `vp_approval` status (forwarded to VP)
  - Requests they've approved that moved to `hoi_approval`
- **Pending Approvals**: Requests at `vp_approval` status only

#### **Head of Institution (HOI)**
- **Can See**:
  - Requests at `hoi_approval` status (forwarded from VP)
  - Requests they've approved that moved to `dean_review`
- **Pending Approvals**: Requests at `hoi_approval` status only

#### **Dean (DEAN)**
- **Can See**:
  - Requests at `dean_review` status (forwarded from HOI or budget-unavailable path)
  - Requests at `dean_verification` status (legacy)
  - Requests at `department_checks` status (sent for query)
  - Requests they've approved that moved to `chief_director_approval`
- **Pending Approvals**: Requests at `dean_review` and `dean_verification` status

#### **Department Users (MMA, HR, AUDIT, IT)**
- **Can See**: 
  - **Only requests where they were specifically asked for query**
  - Requests at `department_checks` status where `queryTarget` matches their role
  - Requests they've previously responded to
- **Pending Approvals**: Requests at `department_checks` status targeted to them only
- **Special Filtering**: Additional post-processing to verify query target

#### **Chief Director (CHIEF_DIRECTOR)**
- **Can See**:
  - Requests at `chief_director_approval` status (forwarded from Dean)
  - Requests they've approved that moved to `chairman_approval`
- **Pending Approvals**: Requests at `chief_director_approval` status only

#### **Chairman (CHAIRMAN)**
- **Can See**:
  - Requests at `chairman_approval` status (final approval stage)
  - Requests they've approved (final `approved` status)
- **Pending Approvals**: Requests at `chairman_approval` status only

### 2. API Implementation

#### **Requests API (`/api/requests`)**
- **Role-Based Filtering**: `getRoleBasedFilter()` function determines visible requests
- **Department Filtering**: Additional post-processing for department users
- **Status Filtering**: Supports status-based filtering within role permissions
- **Pagination**: Maintains pagination while respecting role filters

#### **Dashboard Stats API (`/api/dashboard/stats`)**
- **Role-Based Stats**: Statistics calculated only from visible requests
- **Consistent Filtering**: Uses same `getRoleBasedFilter()` logic
- **Department Handling**: Special filtering for department users

#### **Approvals API (`/api/approvals`)**
- **Pending Only**: Shows only requests awaiting user's approval
- **Role Verification**: Double-checks with approval engine
- **Department Targeting**: Filters by query target for department users

### 3. Frontend Implementation

#### **Dashboard (`/dashboard`)**
- **Role-Based Stats**: Shows statistics for visible requests only
- **Recent Requests**: Displays only requests user can see
- **Navigation**: Role-based navigation menu

#### **Requests Page (`/dashboard/requests`)**
- **Filtered Lists**: Shows only requests user has access to
- **Status Filters**: Work within role permissions
- **Search/Filter**: Respects role-based visibility

#### **Approvals Page (`/dashboard/approvals`)**
- **Pending Only**: Shows requests awaiting user's action
- **Role-Specific**: Tailored to user's approval responsibilities
- **Clear Actions**: Direct links to process requests

### 4. Security Features

#### **Authorization Layers**
1. **API Level**: Server-side filtering in all endpoints
2. **Database Level**: Query filters prevent unauthorized data access
3. **Frontend Level**: UI elements respect user permissions
4. **Workflow Level**: Approval engine validates user actions

#### **Department Security**
- **Clarification Targeting**: Department users only see requests specifically sent to them
- **History Verification**: Checks query history for access rights
- **Response Tracking**: Tracks which department responded to which query

#### **Audit Trail**
- **Access Logging**: All request access attempts logged
- **Role Verification**: User role checked on every request
- **Workflow Integrity**: Ensures requests follow proper approval path

### 5. Workflow Integrity

#### **Sequential Approval**
- Users only see requests at their approval level
- No "jumping ahead" in the workflow
- Proper handoff between approval stages

#### **Clarification Handling**
- Department users only see targeted queries
- Clarification responses properly routed back
- Clear visibility of query status

#### **Status Transitions**
- Role-based status filtering ensures proper workflow
- Users can't see requests not yet forwarded to them
- Historical visibility for requests they've worked on

## Implementation Files

### **Backend APIs**
- `app/api/requests/route.ts` - Main requests API with role filtering
- `app/api/dashboard/stats/route.ts` - Role-based dashboard statistics
- `app/api/approvals/route.ts` - Pending approvals for user's role

### **Frontend Pages**
- `app/dashboard/page.tsx` - Dashboard with role-based stats
- `app/dashboard/requests/page.tsx` - Filtered requests list
- `app/dashboard/approvals/page.tsx` - Role-specific pending approvals

### **Shared Logic**
- `getRoleBasedFilter()` - Core filtering logic used across APIs
- Department-specific filtering for query targeting
- Approval engine integration for role verification

## Benefits

### **Security**
- ✅ Users only see requests they're authorized to view
- ✅ No unauthorized access to workflow stages
- ✅ Department users only see targeted queries
- ✅ Complete audit trail of access and actions

### **Workflow Integrity**
- ✅ Proper sequential approval process
- ✅ No bypassing of approval stages
- ✅ Clear handoff between roles
- ✅ Accurate pending approvals for each role

### **User Experience**
- ✅ Clean, relevant dashboard for each role
- ✅ No confusion from irrelevant requests
- ✅ Clear pending actions for each user
- ✅ Role-appropriate navigation and features

### **Performance**
- ✅ Efficient database queries with proper filtering
- ✅ Reduced data transfer (only relevant requests)
- ✅ Faster page loads with smaller datasets
- ✅ Optimized statistics calculations

## Testing Scenarios

### **Role Isolation**
1. **Requester**: Should only see own requests
2. **Manager**: Should only see requests at manager level
3. **SOP/Accountant**: Should only see verification requests
4. **Department**: Should only see targeted queries
5. **Executives**: Should only see requests at their approval level

### **Workflow Progression**
1. **New Request**: Only visible to requester and manager
2. **After Manager**: Visible to SOP verifier and accountant
3. **After Verification**: Visible to manager for routing
4. **After Routing**: Visible to appropriate executive level
5. **Department Clarification**: Only visible to targeted department

### **Security Validation**
1. **Direct URL Access**: Users can't access unauthorized request details
2. **API Calls**: All endpoints respect role-based filtering
3. **Dashboard Stats**: Statistics reflect only visible requests
4. **Navigation**: Menu items appropriate for user role