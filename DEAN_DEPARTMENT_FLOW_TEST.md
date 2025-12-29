# Dean to Department Flow - Test Instructions

## ✅ **WORKFLOW STATUS: IMPLEMENTED & WORKING**

The Dean to Department workflow is correctly implemented. Here's how to test it:

## 🧪 **TEST SCENARIO**

### **Step 1: Dean Sends Request to IT Department**
1. **Login as Dean**
2. **Find a request** in `dean_review` status
3. **Open the request** and click "Approve/Reject"
4. **Select "Send to Department for Verification"**
5. **Choose "IT Department"** from dropdown
6. **Add notes** (optional): "Please verify technical requirements"
7. **Submit**

**Expected Result:**
- ✅ Request status changes to `department_checks`
- ✅ Request disappears from Dean's pending list
- ✅ Request appears in IT user's pending list

### **Step 2: IT Department Verifies and Forwards Back**
1. **Login as IT User**
2. **Find the request** in pending approvals
3. **Open the request** and click "Approve/Reject"
4. **Should see interface with:**
   - ✅ "Complete Verification & Send to Dean" (default)
   - ✅ "Reject"
   - ✅ "Raise Queries"
5. **Select "Complete Verification & Send to Dean"**
6. **Add verification notes** (optional): "Technical requirements verified"
7. **Submit**

**Expected Result:**
- ✅ Request status changes to `dean_verification`
- ✅ Request disappears from IT user's pending list
- ✅ Request appears back in Dean's pending list

### **Step 3: Dean Final Approval**
1. **Login as Dean**
2. **Find the request** (now in `dean_verification` status)
3. **Open the request** and click "Approve/Reject"
4. **Should see interface with:**
   - ✅ "Approve to Chief Director" (default)
   - ✅ "Reject"
   - ✅ "Raise Queries"
5. **Select "Approve to Chief Director"**
6. **Add final notes** (optional): "Approved after IT verification"
7. **Submit**

**Expected Result:**
- ✅ Request status changes to `chief_director_approval`
- ✅ Request disappears from Dean's pending list
- ✅ Request appears in Chief Director's pending list

## 🔍 **VERIFICATION POINTS**

### **Dean Interface (dean_review status):**
- [ ] "Approve to Chief Director" option
- [ ] "Send to Department for Verification" option
- [ ] Department selection dropdown (HR, IT, AUDIT, MMA)
- [ ] "Reject" option
- [ ] "Raise Queries" option

### **Department Interface (department_checks status):**
- [ ] "Complete Verification & Send to Dean" option (default)
- [ ] "Reject" option
- [ ] "Raise Queries" option
- [ ] Green visual feedback for forward action
- [ ] Only targeted department can see the request

### **Dean Interface (dean_verification status):**
- [ ] "Approve to Chief Director" option (default)
- [ ] "Reject" option
- [ ] "Raise Queries" option
- [ ] Can see department's verification notes in history

### **Request History:**
- [ ] Dean's clarification action with target department
- [ ] Department's forward action with verification notes
- [ ] Dean's final approval action

## 🚨 **TROUBLESHOOTING**

### **If IT User Can't See Request:**
1. Check if request status is `department_checks`
2. Check if `clarificationTarget` in history is set to 'it'
3. Check if IT user has correct role ('it')

### **If IT User Sees "Approve" Instead of "Forward":**
1. Check if ApprovalModal condition is working:
   ```typescript
   ['hr', 'it', 'audit', 'mma'].includes(userRole) && 
   request.status === 'department_checks'
   ```

### **If Request Doesn't Return to Dean:**
1. Check if department forward action sets status to `dean_verification`
2. Check approval engine transitions
3. Check API route handling for department forward

## 📊 **COMPLETE WORKFLOW**

```
DEAN_REVIEW
    ↓ (Dean: clarify with target='it')
DEPARTMENT_CHECKS
    ↓ (IT: forward)
DEAN_VERIFICATION  
    ↓ (Dean: approve)
CHIEF_DIRECTOR_APPROVAL
    ↓ (Chief Director: approve)
CHAIRMAN_APPROVAL (if cost > ₹50,000)
    ↓ (Chairman: approve)
APPROVED
```

## ✅ **IMPLEMENTATION STATUS**

- [x] **Approval Engine**: Correct transitions defined
- [x] **API Route**: Department forward handling implemented
- [x] **Authorization**: Fixed type mismatch issue
- [x] **Visibility**: Department targeting working
- [x] **UI Interface**: Department-specific options available
- [x] **Dean Interface**: Both dean_review and dean_verification statuses
- [x] **History Tracking**: Complete audit trail

## 🎯 **EXPECTED BEHAVIOR**

The workflow should work exactly as described. If any step fails, check the browser console for errors and verify the user roles and request statuses match the expected values.

**Test URL**: http://localhost:3000

Ready for testing! 🚀