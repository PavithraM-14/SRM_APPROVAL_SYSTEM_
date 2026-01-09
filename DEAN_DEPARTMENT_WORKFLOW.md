# Dean to Department Verification Workflow

## Summary

Implemented a new workflow where Dean can send requests to HR/IT/AUDIT/MMA departments for verification. After department verification, the request returns to Dean for final verification before proceeding to Chief Director.

## New Workflow Flow

**Enhanced Dean Workflow:**
1. **Dean Review** → Dean can choose to:
   - Approve directly to Chief Director
   - Send to Department for Verification (HR/IT/AUDIT/MMA)
   - Reject
   - Raise Queries

2. **Department Verification** → Selected department verifies and returns to Dean

3. **Dean Verification** → Dean reviews department feedback and approves to Chief Director

## Implementation Details

### 1. **Updated Approval Engine** (`lib/approval-engine.ts`)

#### **New Transitions:**
```typescript
// Dean can send to department verification
{ from: RequestStatus.DEAN_REVIEW, to: RequestStatus.DEPARTMENT_CHECKS, requiredRole: UserRole.DEAN },

// Dean can also go to dean_verification status
{ from: RequestStatus.DEAN_REVIEW, to: RequestStatus.DEAN_VERIFICATION, requiredRole: UserRole.DEAN },

// Departments return to dean_verification (not dean_review)
{
  from: RequestStatus.DEPARTMENT_CHECKS,
  to: RequestStatus.DEAN_VERIFICATION,
  requiredRole: [UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT],
},

// Dean approves from dean_verification to Chief Director
{ from: RequestStatus.DEAN_VERIFICATION, to: RequestStatus.CHIEF_DIRECTOR_APPROVAL, requiredRole: UserRole.DEAN },
```

#### **Updated Logic:**
- Dean in `DEAN_REVIEW` can approve directly to Chief Director OR send to department
- Dean in `DEAN_VERIFICATION` (after department feedback) approves to Chief Director
- Departments forward from `DEPARTMENT_CHECKS` to `DEAN_VERIFICATION`

### 2. **Enhanced ApprovalModal** (`components/ApprovalModal.tsx`)

#### **Dean-Specific Interface:**
```typescript
// Different options based on Dean status
{request.status === 'dean_review' ? (
  <>
    <option value="approve">Approve to Chief Director</option>
    <option value="clarify">Send to Department for Verification</option>
    <option value="reject">Reject</option>
    <option value="reject_with_query">Raise Queries</option>
  </>
) : (
  // dean_verification status - after department verification
  <>
    <option value="approve">Approve to Chief Director</option>
    <option value="reject">Reject</option>
    <option value="reject_with_query">Raise Queries</option>
  </>
)}
```

#### **Department Selection:**
When Dean selects "Send to Department for Verification":
```typescript
<select value={target || ''} onChange={(e) => setTarget(e.target.value)}>
  <option value="">Choose department...</option>
  <option value="hr">HR Department</option>
  <option value="it">IT Department</option>
  <option value="audit">Audit Department</option>
  <option value="mma">MMA Department</option>
</select>
```

#### **Visual Feedback:**
- **Green box**: "Approve to Chief Director"
- **Blue box**: "Send to Department for Verification" with department selection
- **Red box**: "Reject"
- **Orange box**: "Raise Queries"

### 3. **Updated Request Details Page** (`app/dashboard/requests/[id]/page.tsx`)

#### **New Handler Function:**
```typescript
const handleClarify = async (notes: string, attachments: string[], target?: string) => {
  // Sends POST request with action: 'clarify' and target department
  // Routes to department verification
}
```

#### **Updated ApprovalModal Props:**
```typescript
<ApprovalModal
  // ... existing props
  onClarify={handleClarify}  // New prop for Dean department routing
/>
```

### 4. **Updated API Route** (`app/api/requests/[id]/approve/route.ts`)

#### **Enhanced Clarify Action:**
```typescript
case 'clarify':
  if (user.role === UserRole.DEAN && target) {
    nextStatus = RequestStatus.DEPARTMENT_CHECKS;
  } else {
    nextStatus = RequestStatus.CLARIFICATION_REQUIRED;
  }
  actionType = ActionType.CLARIFY;
  break;
```

#### **Department Response Handling:**
```typescript
// Handle department responses to Dean queries
if ([UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(user.role as UserRole) && 
    requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
  nextStatus = RequestStatus.DEAN_VERIFICATION; // Changed from DEAN_REVIEW
}
```

### 5. **Updated Request Visibility** (`lib/request-visibility.ts`)

#### **Dean Status Access:**
```typescript
[UserRole.DEAN]: [RequestStatus.DEAN_REVIEW, RequestStatus.DEAN_VERIFICATION],
```

Dean can now see and act on both `DEAN_REVIEW` and `DEAN_VERIFICATION` statuses.

## User Experience

### **Dean Workflow (dean_review status):**
1. **Opens approval modal** → sees "Send to Department for Verification" as an option
2. **Selects department** → chooses HR, IT, AUDIT, or MMA from dropdown
3. **Adds instructions** → optional notes for the department
4. **Submits** → request goes to `DEPARTMENT_CHECKS` with `queryTarget` set

### **Department Workflow (department_checks status):**
1. **Receives request** → only the targeted department can see it
2. **Reviews and responds** → adds verification notes and attachments
3. **Forwards back** → request goes to `DEAN_VERIFICATION` status

### **Dean Verification (dean_verification status):**
1. **Receives request back** → sees department feedback in history
2. **Reviews verification** → can see department notes and attachments
3. **Final approval** → approves to Chief Director or rejects/queries

### **Alternative Paths:**
- **Direct Approval**: Dean can approve directly to Chief Director without department verification
- **Reject**: Dean can reject at any stage
- **Raise Queries**: Dean can send queries to requester at any stage

## Benefits

1. **Flexible Routing**: Dean can choose whether to involve departments or approve directly
2. **Targeted Verification**: Only the selected department sees and responds to the request
3. **Clear Workflow**: Separate statuses for initial review vs. post-department verification
4. **Audit Trail**: Complete history of department interactions and Dean decisions
5. **Consistent UX**: Same modal structure with role-specific options

## API Integration

### **Dean Send to Department:**
- **Endpoint**: `POST /api/requests/[id]/approve`
- **Body**: `{ action: 'clarify', notes, attachments, target: 'hr|it|audit|mma' }`
- **Result**: Status changes to `department_checks` with `queryTarget` field

### **Department Response:**
- **Endpoint**: `POST /api/requests/[id]/approve`
- **Body**: `{ action: 'forward', notes, attachments }`
- **Result**: Status changes to `dean_verification`

### **Dean Final Approval:**
- **Endpoint**: `POST /api/requests/[id]/approve`
- **Body**: `{ action: 'approve', notes, attachments }`
- **Result**: Status changes to `chief_director_approval`

## Status Flow

```
DEAN_REVIEW
    ├── approve → CHIEF_DIRECTOR_APPROVAL (direct)
    ├── clarify → DEPARTMENT_CHECKS (with target)
    ├── reject → REJECTED
    └── reject_with_query → SUBMITTED (queries)

DEPARTMENT_CHECKS
    └── forward → DEAN_VERIFICATION

DEAN_VERIFICATION
    ├── approve → CHIEF_DIRECTOR_APPROVAL
    ├── reject → REJECTED
    └── reject_with_query → SUBMITTED (queries)
```

## Status: ✅ IMPLEMENTED & FIXED

The Dean to Department verification workflow is now fully implemented and ready for testing:

- ✅ **Dean can send to departments** (HR/IT/AUDIT/MMA)
- ✅ **Department verification and response** - FIXED: Department users now see correct "Forward" interface
- ✅ **Dean final verification after department feedback**
- ✅ **Proper status transitions** (DEAN_REVIEW → DEPARTMENT_CHECKS → DEAN_VERIFICATION → CHIEF_DIRECTOR_APPROVAL)
- ✅ **Role-specific interfaces** with clear action options
- ✅ **Complete audit trail** of all interactions
- ✅ **Targeted visibility** (only selected department can see the request)

### **Recent Fix Applied:**
- **Issue**: HR/IT/AUDIT/MMA users were seeing "Approve" action instead of "Forward"
- **Solution**: Added department-specific interface and logic in ApprovalModal
- **Enhancement**: Department users now have full action options (Complete Verification, Reject, Raise Queries)
- **Result**: Department users see proper interface with optional notes for verification, required notes for rejection

### **Department User Interface:**
- **Complete Verification & Send to Dean** (default) - Notes optional
- **Reject** - Notes required
- **Raise Queries** - Notes required
- **Visual feedback** with color-coded action boxes
- **Smart validation** - notes only required for reject actions

Ready for testing at `http://localhost:3002`!