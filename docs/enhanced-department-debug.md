# Enhanced Department Clarification Debug

## Issue
Department users still getting "Failed to process approval" error when responding to Dean queries, despite previous debugging attempts.

## Enhanced Debug Logging Added

### 1. Request Start Logging
```typescript
console.log('[DEBUG] Approval request started:', {
  requestId: params.id,
  userRole: user.role,
  userEmail: user.email
});
```
**Purpose**: Verify the request is reaching the API and user is authenticated.

### 2. Request Body Logging
```typescript
console.log('[DEBUG] Request body parsed:', {
  action,
  notes: notes ? 'provided' : 'empty',
  target,
  userRole: user.role
});
```
**Purpose**: Confirm what action is being sent from the frontend.

### 3. Action Validation Logging
```typescript
if (!['approve', 'reject', 'clarify', 'forward', 'budget_available', 'budget_not_available'].includes(action)) {
  console.log('[DEBUG] Invalid action:', action);
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```
**Purpose**: Check if the action is valid.

### 4. Request Record Logging
```typescript
console.log('[DEBUG] Request found:', {
  requestId: params.id,
  currentStatus: requestRecord.status,
  historyLength: requestRecord.history?.length || 0
});
```
**Purpose**: Verify request exists and check its current status.

### 5. Role Authorization Logging
```typescript
console.log('[DEBUG] Role authorization check:', {
  currentStatus: requestRecord.status,
  requiredApprovers,
  userRole: user.role,
  isAuthorized: requiredApprovers.includes(user.role as UserRole)
});
```
**Purpose**: Check if user is authorized for the current status.

### 6. Department Clarification Logging (Previously Added)
```typescript
console.log('[DEBUG] Department query check:', {
  userRole: user.role,
  latestClarification: latestClarification ? {
    queryTarget: latestClarification.queryTarget,
    actor: latestClarification.actor,
    timestamp: latestClarification.timestamp
  } : null,
  requestHistory: requestRecord.history.map((h: any) => ({
    action: h.action,
    queryTarget: h.queryTarget,
    timestamp: h.timestamp
  }))
});
```
**Purpose**: Check department-specific authorization.

## Expected Debug Flow

### Successful Case:
```
[DEBUG] Approval request started: { requestId: '123', userRole: 'hr', userEmail: 'hr@example.com' }
[DEBUG] Request body parsed: { action: 'forward', notes: 'provided', target: undefined, userRole: 'hr' }
[DEBUG] Request found: { requestId: '123', currentStatus: 'department_checks', historyLength: 5 }
[DEBUG] Role authorization check: { 
  currentStatus: 'department_checks', 
  requiredApprovers: ['mma', 'hr', 'audit', 'it'], 
  userRole: 'hr', 
  isAuthorized: true 
}
[DEBUG] Department query check: { 
  userRole: 'hr', 
  latestClarification: { queryTarget: 'hr', ... } 
}
```

### Failed Case Examples:

#### Invalid Action:
```
[DEBUG] Approval request started: { ... }
[DEBUG] Request body parsed: { action: 'invalid_action', ... }
[DEBUG] Invalid action: invalid_action
```

#### Authorization Failed:
```
[DEBUG] Role authorization check: { 
  requiredApprovers: ['mma', 'hr', 'audit', 'it'], 
  userRole: 'some_other_role', 
  isAuthorized: false 
}
[DEBUG] Authorization failed - user not in required approvers
```

#### Wrong Department:
```
[DEBUG] Department query check: { 
  userRole: 'mma', 
  latestClarification: { queryTarget: 'hr', ... } 
}
[DEBUG] Authorization failed: { expected: 'hr', actual: 'mma' }
```

## Troubleshooting Guide

### If No Debug Output:
- Request not reaching the API
- Network/routing issue
- Authentication failure before API

### If Stops at Action Validation:
- Frontend sending invalid action
- Action not in allowed list

### If Stops at Role Authorization:
- User doesn't have correct role
- Approval engine not returning expected roles for department_checks

### If Stops at Department Check:
- User role doesn't match query target
- Clarification target not properly stored
- Role format mismatch

## Next Steps

1. **Reproduce Error**: Have department user attempt to respond
2. **Check Console**: Look for debug output sequence
3. **Identify Failure Point**: See where the debug output stops
4. **Apply Targeted Fix**: Based on specific failure point

## Status: 🔍 COMPREHENSIVE DEBUGGING

Added extensive logging throughout the approval flow to identify the exact failure point in department query responses.