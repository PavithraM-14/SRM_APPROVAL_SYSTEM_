# New Approval Workflow

## Overview
The approval workflow has been completely redesigned to follow a more structured, sequential process.

## Workflow Steps

### 1. Request Raiser (HOD / Faculty)
- **Status**: `submitted`
- **Action**: Initial request creation and submission

### 2. Institution Manager(s)
- **Status**: `manager_review`
- **Action**: Review and approve to forward to SOP verification

### 3. SOP Verification (Material Check)
- **Status**: `sop_verification`
- **Roles**: MMA, HR, Audit, IT (any of these can approve)
- **Action**: Verify Standard Operating Procedures and material requirements

### 4. Accountant Verify (Budget Check)
- **Status**: `budget_check`
- **Role**: Accountant
- **Action**: Verify budget availability and constraints

### 5. Institution Verified (Manager Approval Done)
- **Status**: `institution_verified`
- **Role**: Institution Manager
- **Decision Point**: Budget availability determines next path

#### Path A: Budget Available
- **Next Step**: VP Approval → HOI Approval → Dean Review → Department Checks → Dean Verification → Chief Director → Chairman

#### Path B: Budget NOT Available
- **Next Step**: Dean Admin → Chairman Approval (direct path)

### 6. Vice President (VP) - Only if Budget Available
- **Status**: `vp_approval`
- **Role**: VP

### 7. Head of Institution (HOI) - Only if Budget Available
- **Status**: `hoi_approval`
- **Role**: Head of Institution

### 8. Dean (Admin)
- **Status**: `dean_review`
- **Role**: Dean
- **Options**: 
  - Route to Department Checks (normal flow)
  - Direct to Chairman (if budget not available)

### 9. Department Checks - Multiple departments
- **Status**: `department_checks`
- **Roles**: MMA, HR, Audit, IT (any can approve to proceed)

### 10. Dean Verification
- **Status**: `dean_verification`
- **Role**: Dean

### 11. Chief Director (CD)
- **Status**: `chief_director_approval`
- **Role**: Chief Director

### 12. Chairman / BoD
- **Status**: `chairman_approval`
- **Role**: Chairman
- **Final Step**: Leads to approval or rejection

### 13. Final States
- **Status**: `approved` - Request approved
- **Status**: `rejected` - Request rejected
- **Status**: `query_required` - Additional information needed

## Key Changes Made

1. **Added new statuses**:
   - `sop_verification`: For SOP/material verification step
   - `institution_verified`: Decision point after budget check

2. **Restructured workflow logic**:
   - SOP verification now comes before budget check
   - Institution Manager makes budget availability decision
   - Clear branching logic for budget available/not available paths

3. **Updated approval engine**:
   - Modified rules to follow the new sequential flow
   - Added conditional logic for budget-based routing
   - Updated status progression order

4. **Updated UI components**:
   - ApprovalWorkflow component shows new steps
   - ApprovalHistory component handles new status names
   - Status display names updated throughout

## Implementation Notes

- The workflow maintains backward compatibility with existing requests
- Budget availability is determined by the Institution Manager at the `institution_verified` stage
- Department checks (MMA, HR, Audit, IT) can be performed by any of the designated roles
- The system supports both budget available and budget not available paths

## Testing Recommendations

1. Test the complete budget available path
2. Test the budget not available direct path to Chairman
3. Verify SOP verification step works correctly
4. Ensure UI displays new status names properly
5. Test approval engine routing logic
