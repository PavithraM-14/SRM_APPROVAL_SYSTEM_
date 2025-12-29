# Budget Availability Flow Implementation

## ✅ UPDATED LOGIC - ACCOUNTANT DECIDES BUDGET AVAILABILITY

### Normal Flow (Budget Available)
**Institution Manager → SOP & Accountant Verification → Institution Manager → VP → HOI → Dean → Chief Director → (Chairman if cost > ₹50,000)**

1. Institution Manager sends to parallel verification (SOP + Accountant)
2. **Accountant marks "Budget Available"** during verification
3. Institution Manager sees budget is available → Sends to VP
4. Continues: VP → HOI → Dean → Chief Director
5. At Chief Director:
   - If cost > ₹50,000 → Continue to Chairman
   - If cost ≤ ₹50,000 → APPROVED (stop here)

### Budget Not Available Flow  
**Institution Manager → SOP & Accountant Verification → Institution Manager → Dean → Chairman → APPROVED**

1. Institution Manager sends to parallel verification (SOP + Accountant)
2. **Accountant marks "Budget Not Available"** during verification
3. Institution Manager sees budget not available → Sends directly to Dean (bypasses VP, HOI)
4. Dean always forwards to Chairman (regardless of cost)
5. Chairman makes final approval decision

## Key Changes

### 🔄 **WHO DECIDES BUDGET AVAILABILITY**
- **Before**: Institution Manager decided budget availability
- **After**: **Accountant** decides during verification process

### 🔄 **INSTITUTION MANAGER ROLE**
- **Before**: Made budget decision and routing choice
- **After**: Reviews accountant's budget decision and routes accordingly
  - Budget Available → Send to VP (normal flow)
  - Budget Not Available → Send to Dean (bypass VP/HOI)

### 🔄 **WORKFLOW TRIGGER**
- **Before**: Institution Manager had "Budget Available" / "Budget Not Available" buttons
- **After**: Institution Manager sees accountant's decision and approves with automatic routing

## Code Implementation

### Approval Engine (`lib/approval-engine.ts`)

```typescript
case UserRole.INSTITUTION_MANAGER:
  if (currentStatus === RequestStatus.INSTITUTION_VERIFIED && action === ActionType.APPROVE) {
    // Check if accountant marked budget as not available
    const budgetNotAvailable = context?.budgetNotAvailable;
    if (budgetNotAvailable) {
      // Budget not available → Send directly to Dean (bypass VP/HOI)
      return RequestStatus.DEAN_REVIEW;
    }
    // Normal flow → Send to VP
    return RequestStatus.VP_APPROVAL;
  }
  break;
```

### API Route (`app/api/requests/[id]/approve/route.ts`)

```typescript
} else if (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED && user.role === UserRole.INSTITUTION_MANAGER) {
  // Institution Manager approves after both SOP and Accountant verification
  // Check if accountant marked budget as not available
  const accountantBudgetDecision = requestRecord.history
    .filter((h: any) => h.actor && h.budgetAvailable !== undefined)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  const budgetNotAvailable = accountantBudgetDecision?.budgetAvailable === false;
  
  if (budgetNotAvailable) {
    // Budget not available → Send directly to Dean (bypass VP/HOI)
    nextStatus = RequestStatus.DEAN_REVIEW;
    // Mark this request as coming from budget not available path
    if (!updateData.$set) updateData.$set = {};
    updateData.$set.budgetNotAvailable = true;
  } else {
    // Normal flow → Send to VP
    nextStatus = RequestStatus.VP_APPROVAL;
  }
}
```

### Institution Manager Interface (`components/ApprovalModal.tsx`)

**New Interface for `institution_verified` status:**
- Shows accountant's budget decision prominently
- Visual feedback about routing implications
- Single "Approve" button with context-aware text:
  - "Send to VP (Normal Flow)" if budget available
  - "Send to Dean (Budget Not Available)" if budget not available

## Test Scenarios

### Budget Available - High Cost (₹75,000)
- **Flow**: Manager → SOP/Accountant → Manager → VP → HOI → Dean → Chief Director → Chairman → APPROVED
- **Reason**: Accountant marked budget available, cost > ₹50,000 so Chief Director sends to Chairman

### Budget Available - Low Cost (₹35,000)  
- **Flow**: Manager → SOP/Accountant → Manager → VP → HOI → Dean → Chief Director → APPROVED
- **Reason**: Accountant marked budget available, cost ≤ ₹50,000 so Chief Director approves (stops here)

### Budget Not Available - Any Cost
- **Flow**: Manager → SOP/Accountant → Manager → Dean → Chairman → APPROVED  
- **Reason**: Accountant marked budget not available, so Manager sends directly to Dean, Dean always sends to Chairman

## Summary

✅ **Budget Available**: Normal flow with cost-based decision at Chief Director
- Accountant marks "Budget Available" → Manager → VP → HOI → Dean → Chief Director
- Cost ≤ ₹50,000 → Stop at Chief Director  
- Cost > ₹50,000 → Continue to Chairman

✅ **Budget Not Available**: Special flow bypasses VP/HOI and Chief Director
- Accountant marks "Budget Not Available" → Manager → Dean → Chairman (always, regardless of cost)

✅ **Institution Manager**: Now acts as router based on accountant's decision, not decision maker