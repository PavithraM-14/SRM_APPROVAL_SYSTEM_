# Institution Manager Interface Update

## Summary

Updated the Institution Manager interface to show specific actions when processing requests in `manager_review` status, matching the exact workflow requirements.

## New Institution Manager Interface

### **When Status = `manager_review`**

```
┌─────────────────────────────────────────────────┐
│ Process Request                                 │
│ Current status: manager_review                  │
├─────────────────────────────────────────────────┤
│ Document Attachments                            │
│ [Upload File] [Add URL]                         │
├─────────────────────────────────────────────────┤
│ Action                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ Send to SOP & Budget Verification         ▼ │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ✓ Send for Parallel Verification            │ │
│ │   This will send the request to both SOP    │ │
│ │   Verifier and Accountant simultaneously    │ │
│ │   for parallel processing.                  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Comments (Optional)                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ Add any instructions for SOP and budget     │ │
│ │ verifiers...                                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Submit]                               │
└─────────────────────────────────────────────────┘
```

### **Dropdown Options:**
1. **Send to SOP & Budget Verification** (default)
   - Green box with checkmark
   - "This will send the request to both SOP Verifier and Accountant simultaneously for parallel processing."

2. **Reject**
   - Red box with X icon
   - "Permanently reject this request"

3. **Request Clarification**
   - Orange box with warning icon
   - "Request additional information from the requester"

## Changes Made

### 1. **ApprovalModal Component** (`components/ApprovalModal.tsx`)

#### **Conditional Interface Logic:**
```typescript
userRole === 'institution_manager' && request.status === 'manager_review'
```

#### **Special Dropdown Options:**
- **Send to SOP & Budget Verification** (forward action)
- **Reject** 
- **Request Clarification**

#### **Default Action:**
- Institution Manager in `manager_review`: **"forward"**
- All other roles: **"approve"**

#### **Visual Feedback:**
- **Green box** for "Send for Parallel Verification"
- **Red box** for "Reject"  
- **Orange box** for "Request Clarification"

### 2. **Request Details Page** (`app/dashboard/requests/[id]/page.tsx`)

#### **New Handler Function:**
```typescript
const handleForward = async (notes: string, attachments: string[]) => {
  // Sends POST request with action: 'forward'
  // Routes to parallel verification
}
```

#### **Updated ApprovalModal Props:**
```typescript
<ApprovalModal
  // ... existing props
  onForward={handleForward}  // New prop
/>
```

### 3. **Enhanced Validation**

#### **Submit Button Logic:**
- Institution Manager: Enabled when action is selected
- Notes are optional for forward action
- Standard validation for reject/query actions

#### **Action Handling:**
```typescript
// Institution Manager forward action
if (userRole === 'institution_manager' && request.status === 'manager_review' && action === 'forward') {
  onForward(notes, attachments);
  return;
}
```

## Workflow Integration

### **Complete Flow:**
1. **Institution Manager** → Opens request in `manager_review` status
2. **Sees Interface** → "Send to SOP & Budget Verification" (default selected)
3. **Adds Notes** → Optional instructions for verifiers
4. **Clicks Submit** → Request sent to `parallel_verification` status
5. **SOP & Accountant** → Work simultaneously on verification
6. **After Both Complete** → Request returns to Institution Manager
7. **Institution Manager** → Final approval → Sends to VP Admin

### **Alternative Actions:**
- **Reject** → Request permanently rejected
- **Request Clarification** → Sent back to requester for more info

## Benefits

1. **Clear Actions**: Institution Manager sees exactly what they can do
2. **Default Forward**: Most common action (send to verification) is pre-selected
3. **Visual Clarity**: Color-coded feedback boxes explain each action
4. **Workflow Alignment**: Interface matches the actual workflow process
5. **Optional Notes**: Can add instructions without requirement
6. **Consistent UX**: Same modal structure as other roles but with role-specific options

## API Integration

### **Forward Action:**
- **Endpoint**: `POST /api/requests/[id]/approve`
- **Body**: `{ action: 'forward', notes, attachments }`
- **Result**: Status changes to `parallel_verification`

### **Existing Actions:**
- **Reject**: `{ action: 'reject', notes }`
- **Clarification**: `{ action: 'reject_with_query', notes, attachments }`

## Status: ✅ IMPLEMENTED

The Institution Manager interface now shows:
- ✅ **Send to SOP & Budget Verification** (default option)
- ✅ **Reject** option
- ✅ **Request Clarification** option
- ✅ **Visual feedback** for each action type
- ✅ **Optional notes** field
- ✅ **Proper API integration** with forward action

Ready for testing at `http://localhost:3002`!