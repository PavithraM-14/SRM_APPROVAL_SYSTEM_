# Parallel Verification Workflow Implementation

## Overview
Implemented a complete parallel verification system where Institution Manager sends requests to both SOP Verifier and Accountant simultaneously, waits for both verifications, then routes based on budget availability.

## New Workflow Design

### Parallel Verification Process:
1. **Institution Manager** → Sends to **Parallel Verification** (both SOP & Accountant simultaneously)
2. **SOP Verifier** & **Accountant** → Work independently and complete their verifications
3. **Institution Manager** → Routes based on budget availability:
   - **Budget Available** → VP Approval → HOI Approval → Dean Review
   - **Budget Not Available** → Dean Review (skips VP/HOI)

## New Status Definitions

### Added Statuses:
- `PARALLEL_VERIFICATION`: Both SOP and Budget verification in progress
- `SOP_COMPLETED`: SOP verification done, waiting for budget completion
- `BUDGET_COMPLETED`: Budget verification done, waiting for SOP completion

### Complete Workflow:
1. `SUBMITTED` → `MANAGER_REVIEW` (Institution Manager)
2. `MANAGER_REVIEW` → `PARALLEL_VERIFICATION` (Institution Manager sends to both)
3. `PARALLEL_VERIFICATION` → `SOP_COMPLETED` (SOP Verifier completes)
4. `PARALLEL_VERIFICATION` → `BUDGET_COMPLETED` (Accountant completes)
5. `SOP_COMPLETED` + `BUDGET_COMPLETED` → `INSTITUTION_VERIFIED` (Both complete)
6. `INSTITUTION_VERIFIED` → `VP_APPROVAL` OR `DEAN_REVIEW` (Manager routes by budget)
7. Continue with existing workflow...

## Technical Implementation

### 1. Enhanced Approval Engine (`lib/approval-engine.ts`)
- **New Transitions**: Added parallel verification state transitions
- **Smart Routing**: Institution Manager routes based on budget availability
- **Completion Logic**: Helper method to check if both verifications are complete
- **Role-Based Logic**: Each role has specific actions for their workflow stage

### 2. Updated Approval API (`app/api/requests/[id]/approve/route.ts`)
- **New Actions**: Added `budget_available` and `budget_not_available` actions
- **Parallel Handling**: Manages simultaneous SOP and Budget verifications
- **Completion Detection**: Automatically moves to `INSTITUTION_VERIFIED` when both complete
- **Enhanced Validation**: Proper role and status checking for new workflow

### 3. Redesigned Approval Modal (`components/ApprovalModal.tsx`)
- **Institution Manager UI**: 
  - Manager Review: "Send to SOP & Budget Verification"
  - Institution Verified: Choose routing based on budget availability
- **Parallel Verification UI**: Clear status for SOP/Accountant during parallel work
- **Context-Aware Actions**: Different UI based on current status and user role

### 4. Enhanced Workflow Component (`components/ApprovalWorkflow.tsx`)
- **Parallel Status Display**: Visual indicators for parallel verification progress
- **Status Descriptions**: Clear explanations of parallel verification states
- **Progress Tracking**: Updated workflow steps to reflect new process

## User Experience

### Institution Manager:
1. **Manager Review Stage**: 
   - Single action: "Send to SOP & Budget Verification"
   - Sends to both verifiers simultaneously
2. **Institution Verified Stage**:
   - Choose: "Budget Available → VP Approval" or "Budget Not Available → Dean Review"
   - Clear routing decision with explanations

### SOP Verifier:
- Works independently during parallel verification
- Can complete verification or request query
- Clear status showing parallel work in progress

### Accountant:
- Works independently during parallel verification  
- Can complete verification or request query
- Clear status showing parallel work in progress

### Other Roles:
- Dean department query flow remains unchanged
- All other workflow stages work as before

## Workflow Benefits

### 1. **Efficiency**:
- SOP and Budget verification happen simultaneously (not sequential)
- Reduces overall approval time by ~50% for verification stage
- No waiting for one verifier to finish before the other starts

### 2. **Smart Routing**:
- Budget availability determines the approval path
- Skips VP/HOI approval when budget not available
- Streamlined process based on actual budget status

### 3. **Clear Process**:
- Visual indicators show parallel work in progress
- Users understand when both verifications are needed
- Transparent routing decisions with explanations

## Clarification Flows

### During Parallel Verification:
- **SOP Clarification**: `PARALLEL_VERIFICATION` → `SOP_CLARIFICATION` → `MANAGER_REVIEW`
- **Budget Clarification**: `PARALLEL_VERIFICATION` → `BUDGET_CLARIFICATION` → `MANAGER_REVIEW`

### After Clarification:
- Manager resolves query and resends to `PARALLEL_VERIFICATION`
- Process continues with parallel verification

## Security & Validation

### Enhanced Checks:
- Only authorized roles can perform specific actions
- Proper validation for budget routing decisions
- Department query targeting remains secure
- Complete audit trail for all parallel verification steps

### Error Handling:
- Clear error messages for invalid actions
- Proper role-based access control
- Validation for completion states

## Testing Scenarios

### 1. **Parallel Verification**:
- Manager sends to parallel verification
- SOP completes first, then Accountant
- Accountant completes first, then SOP
- Both complete simultaneously

### 2. **Budget Routing**:
- Budget available → VP approval path
- Budget not available → Dean review path
- Proper routing decision tracking

### 3. **Clarification Handling**:
- SOP requests query during parallel verification
- Accountant requests query during parallel verification
- Manager resolves and resends to parallel verification

### 4. **End-to-End**:
- Complete workflow with parallel verification
- All routing scenarios (budget available/not available)
- Proper status transitions and history tracking

## Migration & Compatibility

### Backward Compatibility:
- Existing requests continue with current workflow
- New requests use parallel verification
- No database migration required
- All existing statuses remain valid

### Deployment:
- Zero-downtime deployment
- Gradual rollout possible
- Existing approvals not affected