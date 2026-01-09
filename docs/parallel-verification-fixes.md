# Parallel Verification UI Fixes

## Issues Fixed

### 1. SOP Verifier Unable to Submit with Reference Number
**Problem**: SOP Verifier was forced to use 'clarify' action instead of 'approve' when completing verification.

**Solution**:
- Fixed approval modal to allow SOP to choose 'approve' action during parallel verification
- Added proper SOP reference number input field for parallel verification
- Added validation to require SOP reference when approving
- Separate UI sections for different SOP statuses (parallel_verification, budget_completed)

### 2. Accountant Unable to Approve with Budget Information
**Problem**: Accountant UI was only showing for budget query, not for parallel verification.

**Solution**:
- Added dedicated accountant UI for parallel verification status
- Added budget input fields (allocated, spent, available) for parallel verification
- Added validation for budget fields when accountant is approving
- Separate UI sections for different accountant statuses (parallel_verification, sop_completed, budget_query)

## Technical Changes

### 1. Enhanced Approval Modal (`components/ApprovalModal.tsx`)

#### SOP Verifier UI:
- **Parallel Verification**: Complete SOP verification with reference number
- **Budget Completed**: Complete SOP verification after budget is done
- **Other Statuses**: Standard SOP verification flow

#### Accountant UI:
- **Parallel Verification**: Complete budget verification with budget fields
- **SOP Completed**: Complete budget verification after SOP is done  
- **Budget Clarification**: Standard budget query flow

#### Validation:
- SOP reference required when SOP approves (can mark as "Not Available")
- Budget allocated must be > 0 when accountant approves
- Budget spent cannot be negative

### 2. Enhanced API Integration (`app/api/requests/[id]/approve/route.ts`)
- Added SOP reference to history entry for audit trail
- Proper handling of budget fields during parallel verification
- Maintained existing SOP reference storage in request document

## User Experience Improvements

### SOP Verifier:
1. **Parallel Verification**:
   - Clear status: "Complete SOP verification. Budget verification is happening in parallel."
   - Action options: Complete SOP Verification, Request Clarification, Reject
   - Required SOP reference number input
   - Optional verification notes

2. **After Budget Complete**:
   - Clear status: "Budget verification is complete. Complete your SOP verification to finalize."
   - SOP reference number input
   - Verification notes

### Accountant:
1. **Parallel Verification**:
   - Clear status: "Complete budget verification. SOP verification is happening in parallel."
   - Action options: Complete Budget Verification, Request Clarification, Reject
   - Budget input fields: Allocated, Spent, Available (auto-calculated)
   - Optional verification notes

2. **After SOP Complete**:
   - Clear status: "SOP verification is complete. Complete your budget verification to finalize."
   - Budget input fields with validation
   - Verification notes

## Workflow States Handled

### SOP Verifier Can Act On:
- `parallel_verification` → `sop_completed` (with reference number)
- `budget_completed` → `institution_verified` (with reference number)
- Can request query from either state

### Accountant Can Act On:
- `parallel_verification` → `budget_completed` (with budget info)
- `sop_completed` → `institution_verified` (with budget info)
- Can request query from either state

## Validation Rules

### SOP Verifier:
- Must provide reference number OR mark as "Not Available" when approving
- Notes are optional but recommended
- Can reject or request query without reference number

### Accountant:
- Must provide valid budget allocated amount (> 0) when approving
- Budget spent cannot be negative
- Available budget calculated automatically (Allocated - Spent)
- Notes are optional but recommended

## Error Handling

### Clear Error Messages:
- "Please enter SOP reference number or mark 'Not Available'."
- "Please enter a valid budget allocated amount."
- "Budget spent cannot be negative."

### Graceful Fallbacks:
- Form validation prevents submission with invalid data
- Clear visual indicators for required fields
- Helpful placeholder text and instructions

## Testing Scenarios

### SOP Verifier:
1. **Parallel Verification**:
   - Complete with reference number
   - Complete with "Not Available" reference
   - Request query
   - Reject request

2. **After Budget Complete**:
   - Complete SOP verification to finalize
   - Add verification notes

### Accountant:
1. **Parallel Verification**:
   - Complete with valid budget information
   - Try to submit with invalid budget (should show error)
   - Request query
   - Reject request

2. **After SOP Complete**:
   - Complete budget verification to finalize
   - Add verification notes

### Integration:
1. Both complete simultaneously → Institution Verified
2. SOP completes first → Budget completes → Institution Verified  
3. Budget completes first → SOP completes → Institution Verified
4. Either requests query → Back to Manager Review

## Security & Audit

### Enhanced Tracking:
- SOP reference stored in both request document and history
- Budget information stored in both request document and history
- Complete audit trail of all verification steps
- Proper role-based access control maintained

### Data Integrity:
- Budget calculations validated on both client and server
- SOP reference requirements enforced
- Proper status transitions maintained