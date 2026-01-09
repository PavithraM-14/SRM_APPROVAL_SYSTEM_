# Complete Workflow Testing Guide

## Overview
This guide provides comprehensive testing scenarios for the entire approval workflow to ensure all forward and backward directions work correctly.

## Test Scenarios

### 1. **Complete Forward Flow - Budget Available Path**

#### Test Steps:
1. **Requester** creates request → Status: `SUBMITTED`
2. **Institution Manager** reviews → Status: `MANAGER_REVIEW`
3. **Institution Manager** sends to parallel verification → Status: `PARALLEL_VERIFICATION`
4. **SOP Verifier** completes verification (with reference) → Status: `SOP_COMPLETED`
5. **Accountant** completes verification (with budget) → Status: `INSTITUTION_VERIFIED`
6. **Institution Manager** routes "Budget Available" → Status: `VP_APPROVAL`
7. **VP** approves → Status: `HOI_APPROVAL`
8. **HOI** approves → Status: `DEAN_REVIEW`
9. **Dean** forwards → Status: `DEAN_VERIFICATION`
10. **Dean** approves → Status: `CHIEF_DIRECTOR_APPROVAL`
11. **Chief Director** approves → Status: `CHAIRMAN_APPROVAL`
12. **Chairman** approves → Status: `APPROVED`

#### Expected Results:
- Each transition should work smoothly
- Proper UI for each role at each stage
- Complete audit trail in history
- SOP reference and budget data stored correctly

### 2. **Complete Forward Flow - Budget Not Available Path**

#### Test Steps:
1-5. Same as above through `INSTITUTION_VERIFIED`
6. **Institution Manager** routes "Budget Not Available" → Status: `DEAN_REVIEW`
7. **Dean** forwards → Status: `DEAN_VERIFICATION`
8. **Dean** approves → Status: `CHIEF_DIRECTOR_APPROVAL`
9. **Chief Director** approves → Status: `CHAIRMAN_APPROVAL`
10. **Chairman** approves → Status: `APPROVED`

#### Expected Results:
- VP and HOI steps are skipped
- Direct routing to Dean Review
- All other functionality works correctly

### 3. **Parallel Verification - Different Completion Orders**

#### Test 3a: SOP Completes First
1. **Institution Manager** → `PARALLEL_VERIFICATION`
2. **SOP Verifier** completes → Status: `SOP_COMPLETED`
3. **Accountant** sees "SOP verification complete" message
4. **Accountant** completes → Status: `INSTITUTION_VERIFIED`

#### Test 3b: Accountant Completes First
1. **Institution Manager** → `PARALLEL_VERIFICATION`
2. **Accountant** completes → Status: `BUDGET_COMPLETED`
3. **SOP Verifier** sees "Budget verification complete" message
4. **SOP Verifier** completes → Status: `INSTITUTION_VERIFIED`

#### Test 3c: Simultaneous Completion
1. Both complete at nearly the same time
2. System should handle race conditions gracefully
3. Final status should be `INSTITUTION_VERIFIED`

### 4. **Clarification Flows (Backward Direction)**

#### Test 4a: SOP Clarification
1. **Institution Manager** → `PARALLEL_VERIFICATION`
2. **SOP Verifier** requests query → Status: `SOP_CLARIFICATION`
3. **Institution Manager** resolves query → Status: `MANAGER_REVIEW`
4. **Institution Manager** resends → Status: `PARALLEL_VERIFICATION`
5. Continue normal flow

#### Test 4b: Budget Clarification
1. **Institution Manager** → `PARALLEL_VERIFICATION`
2. **Accountant** requests query → Status: `BUDGET_CLARIFICATION`
3. **Institution Manager** resolves query → Status: `MANAGER_REVIEW`
4. **Institution Manager** resends → Status: `PARALLEL_VERIFICATION`
5. Continue normal flow

#### Test 4c: Dean Department Clarification
1. Reach `DEAN_REVIEW` status
2. **Dean** requests query from MMA → Status: `DEPARTMENT_CHECKS`
3. **MMA** responds → Status: `DEAN_REVIEW`
4. **Dean** continues normal flow

### 5. **Rejection Flows (Backward Direction)**

#### Test 5a: Early Rejection
1. **Institution Manager** rejects at `MANAGER_REVIEW` → Status: `REJECTED`
2. **SOP Verifier** rejects at `PARALLEL_VERIFICATION` → Status: `REJECTED`
3. **Accountant** rejects at `PARALLEL_VERIFICATION` → Status: `REJECTED`

#### Test 5b: Late Rejection
1. **VP** rejects at `VP_APPROVAL` → Status: `REJECTED`
2. **Dean** rejects at `DEAN_REVIEW` → Status: `REJECTED`
3. **Chairman** rejects at `CHAIRMAN_APPROVAL` → Status: `REJECTED`

### 6. **Role-Based Access Control**

#### Test 6a: Unauthorized Access
1. **SOP Verifier** tries to act on `VP_APPROVAL` → Should get 403 error
2. **Accountant** tries to act on `DEAN_REVIEW` → Should get 403 error
3. **Dean** tries to act on `PARALLEL_VERIFICATION` → Should get 403 error

#### Test 6b: Department Clarification Access
1. **Dean** sends query to MMA
2. **HR** tries to respond → Should get error "sent to MMA, not HR"
3. **MMA** responds → Should work correctly

### 7. **Data Validation**

#### Test 7a: SOP Reference Validation
1. **SOP Verifier** tries to approve without reference → Should show error
2. **SOP Verifier** marks "Not Available" → Should work
3. **SOP Verifier** enters reference → Should work

#### Test 7b: Budget Validation
1. **Accountant** tries to approve with 0 allocated → Should show error
2. **Accountant** enters negative spent → Should show error
3. **Accountant** enters valid budget → Should work

### 8. **UI State Management**

#### Test 8a: Modal Display
1. Each role should see appropriate UI for their status
2. Action options should be relevant to role and status
3. Required fields should be clearly marked

#### Test 8b: Workflow Display
1. Workflow component should show current status correctly
2. Parallel verification should show appropriate messages
3. Clarification statuses should display properly

## Expected Behaviors

### Forward Direction:
- ✅ Smooth progression through all statuses
- ✅ Proper role-based UI at each stage
- ✅ Data validation and storage
- ✅ Audit trail maintenance

### Backward Direction:
- ✅ Clarification flows return to appropriate status
- ✅ Rejection terminates workflow properly
- ✅ Error handling for unauthorized actions
- ✅ Data integrity maintained

### Parallel Processing:
- ✅ Both verifiers can work simultaneously
- ✅ Completion order doesn't matter
- ✅ Proper status transitions regardless of order
- ✅ Clear UI indicators for parallel work

## Common Issues to Watch For

### 1. **Status Transition Issues**
- Status not updating after approval
- Wrong next status calculated
- Missing transitions in approval engine

### 2. **UI Issues**
- Wrong modal content for role/status
- Missing action options
- Validation not working

### 3. **Data Issues**
- SOP reference not saved
- Budget data not stored
- History entries missing information

### 4. **Permission Issues**
- Users able to act on wrong statuses
- Department query access not restricted
- Role validation not working

## Debugging Tips

### 1. **Check Browser Console**
- Look for JavaScript errors
- Check network requests for API errors
- Verify data being sent to API

### 2. **Check Server Logs**
- API endpoint errors
- Database connection issues
- Validation failures

### 3. **Verify Database State**
- Request status in database
- History entries structure
- User role assignments

### 4. **Test API Directly**
- Use tools like Postman to test API endpoints
- Verify request/response structure
- Test edge cases and error conditions

## Success Criteria

### ✅ **Complete Workflow**
- All roles can perform their actions
- All statuses transition correctly
- Both budget paths work (available/not available)
- Parallel verification works in all orders

### ✅ **Error Handling**
- Proper validation messages
- Unauthorized access blocked
- Graceful error recovery

### ✅ **Data Integrity**
- All approvals logged in history
- SOP references stored correctly
- Budget information maintained
- Audit trail complete

### ✅ **User Experience**
- Clear UI for each role/status
- Helpful error messages
- Intuitive workflow progression
- Proper visual feedback