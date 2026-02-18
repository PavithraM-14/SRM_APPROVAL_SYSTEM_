# SOP and Accountant Interface Changes

## Summary

Updated the approval interface for SOP Verifier and Accountant roles to include specific verification requirements:

- **SOP Verifier**: Must enter SOP reference number or select "not available"
- **Accountant**: Must select "budget available" or "budget not available"

## Changes Made

### 1. Updated ApprovalModal Component (`components/ApprovalModal.tsx`)

#### SOP Verifier Interface:
- **SOP Reference Section**: Blue-themed section for SOP verification
- **Radio Buttons**: "Yes, reference available" or "No, not available"
- **Reference Input**: Text field for SOP reference number (required if "Yes" selected)
- **Validation**: Ensures SOP reference is provided when "available" is selected
- **Visual Feedback**: Shows note when "not available" is selected

#### Accountant Interface:
- **Budget Verification Section**: Green-themed section for budget verification
- **Radio Buttons**: "Budget Available" or "Budget Not Available"
- **Visual Feedback**: 
  - Green box for "Budget Available" with success message
  - Red box for "Budget Not Available" with warning about Dean pathway
- **Validation**: Ensures budget status is selected before approval

#### Enhanced Features:
- **Role-Specific Headers**: "SOP Verification" for SOP users, "Budget Verification" for Accountant users
- **Contextual Action Labels**: "Complete SOP Verification" / "Complete Budget Verification"
- **Default Action**: Changed from "reject" to "approve" for better UX
- **Improved Validation**: Specific error messages for missing required fields

### 2. Updated Request Details Page (`app/dashboard/requests/[id]/page.tsx`)

- **Enhanced handleApprove Function**: Now accepts `sopReference` and `budgetAvailable` parameters
- **API Integration**: Passes SOP reference and budget availability to the approval API

### 3. Updated API Route (`app/api/requests/[id]/approve/route.ts`)

- **Parameter Handling**: Accepts `sopReference` and `budgetAvailable` from request body
- **History Storage**: Stores SOP reference and budget availability in approval history
- **Request Update**: Updates request document with SOP reference when provided

### 4. Updated ApprovalHistory Component (`components/ApprovalHistory.tsx`)

- **SOP Reference Display**: Shows SOP reference number in history entries
- **Budget Status Display**: Shows budget availability status with color coding
- **Enhanced History**: Both fields are displayed in the approval timeline

## User Experience

### SOP Verifier Workflow:
1. Opens approval modal → sees "SOP Verification" interface
2. Selects whether SOP reference is available
3. If available: enters reference number (e.g., "SOP-2024-001")
4. If not available: sees confirmation note
5. Completes verification → reference stored in history

### Accountant Workflow:
1. Opens approval modal → sees "Budget Verification" interface
2. Reviews cost estimate displayed prominently
3. Selects "Budget Available" or "Budget Not Available"
4. Sees visual feedback about workflow implications
5. Completes verification → budget status stored in history

### History Display:
- **SOP Reference**: Displayed as `SOP Reference: SOP-2024-001` in blue monospace font
- **Budget Status**: Displayed as `Budget Available: Yes/No` with green/red color coding
- **Timeline**: Both fields appear in chronological approval history

## Validation Rules

### SOP Verifier:
- Must select availability status (required)
- Must enter reference number if "available" is selected
- Reference number field is disabled if "not available" is selected

### Accountant:
- Must select budget status (required)
- Cannot proceed without making a selection
- Visual feedback shows workflow implications

## Technical Implementation

### Data Flow:
1. **Frontend**: ApprovalModal collects SOP/budget data
2. **API**: Processes and validates the data
3. **Database**: Stores in both request document and history
4. **Display**: Shows in ApprovalHistory component

### Database Storage:
- **Request Document**: `sopReference` field updated for SOP verifiers
- **History Entry**: Both `sopReference` and `budgetAvailable` stored in history
- **Backward Compatibility**: Existing requests continue to work

## Benefits

1. **Clear Requirements**: Users know exactly what information to provide
2. **Validation**: Prevents incomplete verifications
3. **Audit Trail**: Complete history of SOP references and budget decisions
4. **Visual Clarity**: Role-specific interfaces reduce confusion
5. **Workflow Transparency**: Clear indication of budget pathway implications

## Status: ✅ IMPLEMENTED

All changes have been implemented and are ready for testing. The interface now provides:
- Specialized SOP verification with reference tracking
- Comprehensive budget verification with pathway indication
- Enhanced approval history with complete audit trail
- Improved user experience with role-specific interfaces