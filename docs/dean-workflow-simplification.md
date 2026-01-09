# Dean Workflow Simplification

## Issue
The Dean had to approve twice to move a request forward:
1. **First Approval**: `dean_review` → `dean_verification`
2. **Second Approval**: `dean_verification` → `chief_director_approval`

This created unnecessary friction and confusion, requiring the Dean to process the same request twice.

## Solution
Simplified the Dean workflow to a single approval step:
- **Single Approval**: `dean_review` → `chief_director_approval`

## Changes Made

### 1. Approval Engine Updates
**File**: `lib/approval-engine.ts`

**Before**:
```typescript
if (currentStatus === RequestStatus.DEAN_REVIEW) {
  if (action === ActionType.FORWARD) {
    return RequestStatus.DEAN_VERIFICATION; // Two-step process
  }
}
if (currentStatus === RequestStatus.DEAN_VERIFICATION) {
  return RequestStatus.CHIEF_DIRECTOR_APPROVAL;
}
```

**After**:
```typescript
if (currentStatus === RequestStatus.DEAN_REVIEW) {
  if (action === ActionType.FORWARD || action === ActionType.APPROVE) {
    return RequestStatus.CHIEF_DIRECTOR_APPROVAL; // Direct to chief director
  }
}
```

### 2. Transition Updates
**Updated Transitions**:
- `DEAN_REVIEW` → `CHIEF_DIRECTOR_APPROVAL` (new direct path)
- Kept `DEAN_VERIFICATION` → `CHIEF_DIRECTOR_APPROVAL` for backward compatibility

### 3. UI Updates
**File**: `components/ApprovalModal.tsx`

**Action Text Updated**:
- **Before**: "Forward/Approve"
- **After**: "Approve & Send to Chief Director"

This makes it clear that the Dean's approval will send the request directly to the Chief Director.

## Workflow Comparison

### Before (Two Steps):
1. Dean at `dean_review` → clicks "Forward" → goes to `dean_verification`
2. Dean at `dean_verification` → clicks "Approve" → goes to `chief_director_approval`

### After (One Step):
1. Dean at `dean_review` → clicks "Approve & Send to Chief Director" → goes to `chief_director_approval`

## Benefits

1. **Reduced Friction**: Dean only needs to approve once instead of twice
2. **Faster Processing**: Eliminates unnecessary intermediate step
3. **Clearer Intent**: UI clearly shows the request goes to Chief Director
4. **Better UX**: Less confusion about why Dean needs to approve twice
5. **Maintained Functionality**: All Dean capabilities (query, rejection) preserved

## Backward Compatibility

The system maintains backward compatibility:
- Existing requests at `dean_verification` status can still be processed
- Old transition `DEAN_VERIFICATION` → `CHIEF_DIRECTOR_APPROVAL` still works
- No data migration required

## Dean Capabilities Preserved

The Dean can still:
- **Request Clarification**: Send to departments (MMA, HR, Audit, IT)
- **Reject Requests**: Stop the workflow
- **Approve Requests**: Now goes directly to Chief Director
- **View Clarification Status**: See department responses clearly

## Files Modified
- `lib/approval-engine.ts` - Updated Dean workflow logic and transitions
- `components/ApprovalModal.tsx` - Updated action text for clarity

## Testing
1. Dean should see "Approve & Send to Chief Director" option
2. Selecting this option should move request directly to `chief_director_approval` status
3. Chief Director should receive the request for processing
4. No intermediate `dean_verification` step should occur