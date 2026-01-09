# Debug Send to Dean Issue

## 🔧 Changes Made to Debug

### 1. Fixed Action State Type
**File**: `components/ApprovalModal.tsx`
**Issue**: Action state didn't include 'send_to_dean' and 'send_to_vp' types
**Fix**: Added missing action types and set default to 'send_to_dean' for institution_manager in institution_verified status

```typescript
// Before
const [action, setAction] = useState<'approve' | 'reject' | 'reject_with_clarification' | 'forward' | 'clarify'>

// After  
const [action, setAction] = useState<'approve' | 'reject' | 'reject_with_clarification' | 'forward' | 'clarify' | 'send_to_dean' | 'send_to_vp'>
```

### 2. Added Debug Logging
**File**: `app/api/requests/[id]/approve/route.ts`
**Added**: Comprehensive debug logging to track the flow

```typescript
console.log('[DEBUG] Send to Dean action:', {
  userRole: user.role,
  currentStatus: requestRecord.status,
  nextStatus,
  sentDirectlyToDean: true
});
```

**File**: `app/dashboard/requests/[id]/page.tsx`
**Added**: Debug logging in handleSendToDean function

```typescript
console.log('[DEBUG] handleSendToDean called:', {
  requestId: params.id,
  requestStatus: request.status,
  userRole: currentUser?.role,
  notes,
  attachments
});
```

## 🧪 Testing Steps

1. **Login as Institution Manager**
2. **Find request in `institution_verified` status**
3. **Click "Approve/Reject" button**
4. **Should see "Send to Dean" as default option**
5. **Click Submit**
6. **Check browser console for debug logs**
7. **Verify request status changes to `dean_review`**

## 🔍 Debug Information to Check

### Browser Console (Frontend)
- `[DEBUG] handleSendToDean called:` - Should show request details
- `[DEBUG] API response status:` - Should be 200
- `[DEBUG] API success response:` - Should show updated request

### Server Console (Backend)
- `[DEBUG] Processing approval request:` - Should show action: 'send_to_dean'
- `[DEBUG] Send to Dean action:` - Should show nextStatus: 'dean_review'
- `[DEBUG] After switch statement:` - Should show statusChanged: true
- `[DEBUG] About to update request with:` - Should show updateData with status change

## 🎯 Expected Flow

1. **Institution Manager** clicks "Send to Dean"
2. **Frontend** calls handleSendToDean()
3. **API** receives action: 'send_to_dean'
4. **API** sets nextStatus = 'dean_review'
5. **API** sets sentDirectlyToDean = true
6. **Database** updates request status
7. **Dean** can see request in pending approvals
8. **Dean** approves → goes to Chairman

## ⚠️ Potential Issues to Check

1. **User Role Mismatch**: Verify currentUser.role === 'institution_manager'
2. **Request Status**: Verify request.status === 'institution_verified'
3. **API Validation**: Check if 'send_to_dean' is in allowed actions list
4. **Database Update**: Verify updateData.$set is properly formed
5. **Status Constants**: Verify RequestStatus.DEAN_REVIEW is correct value

## 🚀 Next Steps

If issue persists after testing:
1. Check browser console for frontend errors
2. Check server console for backend errors  
3. Verify database is actually updated
4. Check if Dean can see the request
5. Verify request history shows the action

The debug logging should help identify exactly where the issue is occurring.