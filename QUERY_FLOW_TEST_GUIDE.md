# 🧪 Query Flow Testing Guide

## 📋 Test Scenario: Hierarchical Query System

### 🎯 **Objective**
Test the complete query flow to ensure:
1. Users can only query roles below their hierarchy level
2. Query responses work correctly
3. "Queries" page shows pending queries for all roles
4. Chairman cannot receive queries

---

## 🚀 **Step-by-Step Testing**

### **Prerequisites**
- ✅ Development server running on http://localhost:3000
- ✅ Database seeded with test users (password: `password123`)

### **Test Users Available:**
- `requester@gmail.com` - Raj (Requester)
- `institution_manager@gmail.com` - Tharun (Institution Manager)
- `accountant@gmail.com` - Swathy (Accountant)
- `vp_research@gmail.com` - Dr. Vikram (VP Research)
- `vp_academic@gmail.com` - Dr. Priya (VP Academic)
- `chairman@gmail.com` - Shivakumar (Chairman)

---

## 🔄 **Test Flow**

### **Phase 1: Create Test Request**

1. **Login as Requester** (`requester@gmail.com`)
   - Go to "Create Request"
   - Fill in details:
     - Title: "Query Test - Research Equipment"
     - Purpose: "Testing hierarchical query system"
     - College: "EEC College"
     - Department: "Computer Science"
     - Cost: ₹50,000
     - Category: "Equipment"
   - Upload a test document
   - Submit request

2. **Verify Request Created**
   - Check "My Requests" page
   - Note the Request ID for tracking

---

### **Phase 2: Forward Request to VP Research**

3. **Login as Institution Manager** (`institution_manager@gmail.com`)
   - Go to "Pending Approvals"
   - Find the test request
   - Click "Process Request"
   - Select "Forward to VP Research"
   - Add notes: "Forwarding for research approval"
   - Submit

4. **Verify Forward Action**
   - Check request status changed to VP Research Approval

---

### **Phase 3: VP Research Raises Query**

5. **Login as VP Research** (`vp_research@gmail.com`)
   - Go to "Pending Approvals"
   - Find the test request
   - Click "Raise Query" button
   - **Test Dropdown Options:**
     - ✅ Should see: Requester, Institution Manager, Accountant
     - ❌ Should NOT see: VP Research (himself), VP Academic, Chairman, etc.
   - Select "Institution Manager"
   - Enter query: "Please provide detailed equipment specifications and vendor comparison"
   - Click "Send Query"

6. **Verify Query Sent**
   - Check request disappears from VP Research pending list
   - Request should show as "pending query"

---

### **Phase 4: Institution Manager Responds to Query**

7. **Login as Institution Manager** (`institution_manager@gmail.com`)
   - **Check "Queries" Page:**
     - ✅ Should see the query from VP Research
     - ✅ Should show query count badge in navigation
   - Click on the query request
   - **Verify Query Modal:**
     - ✅ Title: "Respond to Query"
     - ✅ Shows query from VP Research
     - ✅ Has response text area
     - ✅ Only "Cancel" and "Submit" buttons (no reject)
   - Enter response: "Equipment specs attached. Vendor comparison shows best value for research needs."
   - Click "Submit"

8. **Verify Query Response**
   - Query should disappear from Institution Manager's Queries page
   - Request should return to VP Research for processing

---

### **Phase 5: VP Research Queries Accountant**

9. **Login as VP Research** (`vp_research@gmail.com`)
   - Request should be back in "Pending Approvals"
   - Click "Raise Query" again
   - Select "Accountant" from dropdown
   - Enter query: "Please verify budget availability for ₹50,000 equipment purchase"
   - Send query

---

### **Phase 6: Accountant Responds**

10. **Login as Accountant** (`accountant@gmail.com`)
    - **Check "Queries" Page:**
      - ✅ Should see query from VP Research
      - ✅ Query count badge should show
    - Respond with: "Budget verified. ₹50,000 available in research allocation."
    - Submit response

---

### **Phase 7: Final Approval**

11. **Login as VP Research** (`vp_research@gmail.com`)
    - Request back in pending approvals
    - Process request normally (approve/forward as needed)

---

## ✅ **Validation Checklist**

### **Hierarchy Restrictions:**
- [ ] VP Research can query: Requester, Institution Manager, Accountant
- [ ] VP Research cannot query: Himself, other VPs, Chairman, Dean, etc.
- [ ] Institution Manager can query: Requester only
- [ ] Accountant can query: Requester only

### **Chairman Restrictions:**
- [ ] No role can select Chairman in query dropdown
- [ ] Chairman does not have "Queries" page in navigation
- [ ] API blocks any attempts to query Chairman

### **Queries Page Functionality:**
- [ ] All roles (except Chairman) have "Queries" navigation item
- [ ] Query count badges appear when queries pending
- [ ] Query modal shows correct information
- [ ] Response submission works correctly
- [ ] Queries disappear after response

### **UI/UX Verification:**
- [ ] Modal title: "Respond to Query"
- [ ] Only "Cancel" and "Submit" buttons (no reject)
- [ ] Dropdown shows only valid hierarchy targets
- [ ] Query responses update request status correctly

---

## 🚨 **Expected Errors to Test**

### **Test Invalid Queries:**
1. Try to manually send API request to query Chairman (should fail)
2. Verify higher roles cannot be selected in dropdown
3. Test that users cannot query themselves

### **Error Messages:**
- "Cannot send queries to Chairman - he is the final authority"
- "You can only send queries to roles below your level"
- "Invalid target role for queries"

---

## 📊 **Success Criteria**

✅ **All tests pass if:**
1. Hierarchical restrictions work correctly
2. Query responses flow properly through the system
3. UI shows correct options and information
4. Chairman is completely protected from queries
5. All roles (except Chairman) can use Queries page
6. Query count badges work correctly
7. Request status updates properly after query resolution

---

## 🎉 **Test Complete!**

If all steps work correctly, the hierarchical query system is functioning as designed. The system now provides:
- **Proper hierarchy enforcement**
- **Universal query handling for all roles**
- **Chairman protection**
- **Clean, simplified UI**
- **Complete audit trail of query interactions**