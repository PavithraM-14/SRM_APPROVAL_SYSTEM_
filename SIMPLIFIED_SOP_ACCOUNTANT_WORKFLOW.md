# Simplified SOP and Accountant Workflow

## Summary of Changes

Simplified the SOP Verifier and Accountant interfaces to remove reject and query options. They now have a streamlined workflow focused only on their verification tasks.

## New Workflow Rules

### **SOP Verifier**
- ✅ **Can**: Enter SOP reference number or select "not available"
- ✅ **Can**: Add optional comments/notes
- ✅ **Can**: Complete verification (approve only)
- ❌ **Cannot**: Reject requests
- ❌ **Cannot**: Request queries

### **Accountant**
- ✅ **Can**: Select "Budget Available" or "Budget Not Available"
- ✅ **Can**: Add optional comments/notes
- ✅ **Can**: Complete verification (approve only)
- ❌ **Cannot**: Reject requests
- ❌ **Cannot**: Request queries

### **Institution Manager**
- ✅ **Can**: Send requests for query to SOP and Accountant
- ✅ **Can**: Reject requests
- ✅ **Can**: Handle all query workflows
- ✅ **Can**: Verify and send to VP after SOP/Accountant completion

## Interface Changes

### **SOP Verifier Interface**
```
┌─────────────────────────────────────┐
│ SOP Verification                    │
├─────────────────────────────────────┤
│ ○ Yes, reference available          │
│ ○ No, not available                 │
│                                     │
│ [SOP Reference Number Field]        │
│                                     │
│ Action: Complete SOP Verification   │
│ ✓ Complete SOP verification and     │
│   forward to next step              │
│                                     │
│ Comments (Optional):                │
│ [Text area for optional notes]      │
│                                     │
│ [Cancel] [Submit]                   │
└─────────────────────────────────────┘
```

### **Accountant Interface**
```
┌─────────────────────────────────────┐
│ Budget Verification                 │
├─────────────────────────────────────┤
│ Budget Status for ₹50,000           │
│ ○ Budget Available                  │
│ ○ Budget Not Available              │
│                                     │
│ [Visual feedback box]               │
│                                     │
│ Action: Complete Budget Verification│
│ ✓ Complete budget verification and  │
│   forward to next step              │
│                                     │
│ Comments (Optional):                │
│ [Text area for optional notes]      │
│                                     │
│ [Cancel] [Submit]                   │
└─────────────────────────────────────┘
```

### **Other Roles Interface** (Unchanged)
```
┌─────────────────────────────────────┐
│ Process Request                     │
├─────────────────────────────────────┤
│ Action: [Dropdown]                  │
│ ○ Approve                           │
│ ○ Reject                            │
│ ○ Request Clarification             │
│                                     │
│ [Action feedback box]               │
│                                     │
│ Notes: [Required for reject/clarify]│
│ [Text area]                         │
│                                     │
│ [Cancel] [Submit]                   │
└─────────────────────────────────────┘
```

## Validation Rules

### **SOP Verifier**
- ✅ Must select reference availability (required)
- ✅ Must enter reference number if "available" selected (required)
- ✅ Comments are optional
- ✅ Can only submit "approve" action

### **Accountant**
- ✅ Must select budget status (required)
- ✅ Comments are optional
- ✅ Can only submit "approve" action

### **Other Roles**
- ✅ Notes required for reject and query actions
- ✅ Notes optional for approve actions
- ✅ All actions available (approve, reject, clarify)

## Workflow Flow

### **Complete Process**
1. **Institution Manager** → Sends to `PARALLEL_VERIFICATION`
2. **SOP Verifier** → Completes verification with reference/not available
3. **Accountant** → Completes verification with budget status
4. **Institution Manager** → Reviews both verifications, can request queries if needed
5. **Institution Manager** → Final approval → Sends to VP Admin

### **Clarification Flow** (Institution Manager Only)
1. **Institution Manager** → Can request query from SOP/Accountant
2. **SOP/Accountant** → Receives query request
3. **SOP/Accountant** → Provides query and re-verifies
4. **Institution Manager** → Reviews query and proceeds

## Benefits

1. **Simplified Interface**: SOP and Accountant see only relevant options
2. **Clear Responsibilities**: Each role has specific, focused tasks
3. **Reduced Confusion**: No unnecessary reject/clarify options for verifiers
4. **Streamlined Process**: Faster verification with clear requirements
5. **Centralized Control**: Institution Manager handles all exceptions
6. **Optional Comments**: Flexibility to add notes without requirement
7. **Better UX**: Role-appropriate interfaces reduce cognitive load

## Technical Implementation

### **Frontend Changes**
- **ApprovalModal.tsx**: Conditional interface based on user role
- **Simplified Actions**: Only approve action for SOP/Accountant
- **Enhanced Validation**: Role-specific validation rules
- **Optional Notes**: Clear indication that comments are optional

### **Backend Compatibility**
- **API Routes**: Unchanged, still handle all parameters
- **Database**: Same storage for SOP reference and budget status
- **History**: Complete audit trail maintained
- **Workflow**: Same approval engine logic

## Status: ✅ IMPLEMENTED

The simplified workflow is now active:
- SOP Verifiers see streamlined SOP verification interface
- Accountants see streamlined budget verification interface
- Institution Managers retain full control over queries and rejections
- All other roles maintain existing functionality
- Complete audit trail and history preserved