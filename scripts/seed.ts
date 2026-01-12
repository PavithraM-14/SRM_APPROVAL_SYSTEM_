import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Request from '../models/Request';
import BudgetRecord from '../models/BudgetRecord';
import SOPRecord from '../models/SOPRecord';
import { UserRole, RequestStatus, ActionType } from '../lib/types';


// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const colleges = ['Engineering', 'Medicine', 'Business'];
const departments = ['Computer Science', 'Mechanical', 'Electrical', 'Civil'];
const expenseCategories = ['Equipment', 'Software', 'Travel', 'Training', 'Infrastructure'];

// Helper function to generate unique 6-digit request IDs
function generateRequestId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function seed() {
  try {
    // Check if MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.error('Please check your .env.local file');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await User.deleteMany({});
    await Request.deleteMany({});
    await BudgetRecord.deleteMany({});
    await SOPRecord.deleteMany({});

    // Create users for each role
    const users = [];
    let contactCounter = 9876543210;
    
    for (const role of Object.values(UserRole)) {
      // Use plain password - the User model will hash it automatically
      const plainPassword = 'password123'; // Default password for all users
      
      const user = await User.create({
        // Match README: requester@srmrmp.edu.in, institution_manager@srmrmp.edu.in, etc.
        email: `${role}@gmail.com`,
        name: getRoleDisplayName(role),
        empId: `EMP${role.toUpperCase()}`, // Add employee ID
        contactNo: `+91 ${contactCounter.toString().slice(-10)}`, // Format contact number correctly
        password: plainPassword, // Pass plain password - model will hash it
        role,
        college: colleges[0],
        department: departments[0],
      });
      users.push(user);
      contactCounter++; // Increment for next user
    }

    console.log(`✅ Created ${users.length} users`);

    // Create budget records
    const budgetRecords = [];
    for (const college of colleges) {
      for (const department of departments) {
        for (const category of expenseCategories) {
          const budgetRecord = await BudgetRecord.create({
            college,
            department,
            category,
            allocated: Math.floor(Math.random() * 1000000) + 100000,
            spent: Math.floor(Math.random() * 50000),
            available: Math.floor(Math.random() * 950000) + 50000,
            fiscalYear: '2024-25',
          });
          budgetRecords.push(budgetRecord);
        }
      }
    }

    console.log(`✅ Created ${budgetRecords.length} budget records`);

    // Create SOP records
    const sopRecords = [];
    const sopCodes = ['SOP-001', 'SOP-002', 'SOP-003', 'SOP-004', 'SOP-005'];
    
    for (let i = 0; i < sopCodes.length; i++) {
      const sopRecord = await SOPRecord.create({
        code: sopCodes[i],
        title: `Standard Operating Procedure ${i + 1}`,
        description: `This SOP covers the procedures for ${expenseCategories[i]} requests.`,
        college: colleges[i % colleges.length],
        department: i < 2 ? departments[0] : undefined,
        requiresBudgetCheck: true,
        minimumAmount: (i + 1) * 10000,
        isActive: true,
      });
      sopRecords.push(sopRecord);
    }

    console.log(`✅ Created ${sopRecords.length} SOP records`);

    // Create sample requests with realistic workflow scenarios
    const requester = users.find(u => u.role === UserRole.REQUESTER);
    const manager = users.find(u => u.role === UserRole.INSTITUTION_MANAGER);
    const sopVerifier = users.find(u => u.role === UserRole.SOP_VERIFIER);
    const accountant = users.find(u => u.role === UserRole.ACCOUNTANT);
    const vp = users.find(u => u.role === UserRole.VP);
    const hoi = users.find(u => u.role === UserRole.HEAD_OF_INSTITUTION);
    const dean = users.find(u => u.role === UserRole.DEAN);
    const chiefDirector = users.find(u => u.role === UserRole.CHIEF_DIRECTOR);
    const chairman = users.find(u => u.role === UserRole.CHAIRMAN);
    
    if (requester && manager && sopVerifier && accountant && vp && dean && chairman) {
      const requests = [];
      
      // Scenario 1: Fully approved request (Chairman approved)
      const approvedRequest = await Request.create({
        requestId: generateRequestId(),
        requestId: generateRequestId(),
        title: 'New Laboratory Equipment Purchase',
        purpose: 'Purchase of advanced laboratory equipment for Computer Science department to enhance research capabilities and student learning experience.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 250000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.APPROVED,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed, returning to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Budget available, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.APPROVE,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Chief Director approved, forwarded to Chairman'
          },
          {
            action: ActionType.APPROVE,
            actor: chairman._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.APPROVED,
            notes: 'Final approval granted by Chairman'
          }
        ]
      });
      requests.push(approvedRequest);

      // Scenario 2: Request rejected by VP (after manager and verifiers approved)
      const rejectedByVP = await Request.create({
        requestId: generateRequestId(),
        title: 'Software License Renewal',
        purpose: 'Annual renewal of software licenses for development tools used in Computer Science curriculum.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 150000,
        expenseCategory: 'Software',
        sopReference: sopRecords[1].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.REJECTED,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Forwarded to VP for approval'
          },
          {
            action: ActionType.REJECT,
            actor: vp._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.REJECTED,
            notes: 'Request rejected due to budget constraints and alternative solutions available'
          }
        ]
      });
      requests.push(rejectedByVP);

      // Scenario 3: Request rejected by Dean (after VP and HOI approved)
      const rejectedByDean = await Request.create({
        requestId: generateRequestId(),
        title: 'Conference Travel Request',
        purpose: 'Travel expenses for attending international conference on Machine Learning and AI.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 180000,
        expenseCategory: 'Travel',
        sopReference: sopRecords[2].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.REJECTED,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Budget available, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.REJECT,
            actor: dean._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.REJECTED,
            notes: 'Travel request rejected due to current travel restrictions and budget limitations'
          }
        ]
      });
      requests.push(rejectedByDean);

      // Scenario 4: Currently pending at manager level
      const pendingAtManager = await Request.create({
        requestId: generateRequestId(),
        title: 'Infrastructure Upgrade Project',
        purpose: 'Upgrade of network infrastructure in Engineering building to support increased bandwidth requirements.',
        college: colleges[0],
        department: departments[1],
        costEstimate: 500000,
        expenseCategory: 'Infrastructure',
        sopReference: sopRecords[3].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.MANAGER_REVIEW,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager for review'
          }
        ]
      });
      requests.push(pendingAtManager);

      // Scenario 5: Currently in parallel verification
      const inParallelVerification = await Request.create({
        requestId: generateRequestId(),
        title: 'Training Program for Faculty',
        purpose: 'Professional development training program for faculty members on latest teaching methodologies.',
        college: colleges[1],
        department: departments[2],
        costEstimate: 120000,
        expenseCategory: 'Training',
        sopReference: sopRecords[4].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.PARALLEL_VERIFICATION,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Manager approved, forwarded for parallel verification'
          }
        ]
      });
      requests.push(inParallelVerification);

      // Scenario 6: Manager approved, now at VP level
      const atVPLevel = await Request.create({
        requestId: generateRequestId(),
        title: 'Research Equipment Purchase',
        purpose: 'Purchase of specialized research equipment for advanced materials testing laboratory.',
        college: colleges[1],
        department: departments[1],
        costEstimate: 350000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.VP_APPROVAL,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Budget available, forwarded to VP for approval'
          }
        ]
      });
      requests.push(atVPLevel);

      // Scenario 7: At Dean level
      const atDeanLevel = await Request.create({
        requestId: generateRequestId(),
        title: 'Library Book Collection Expansion',
        purpose: 'Purchase of new books and digital resources for the central library to support curriculum updates.',
        college: colleges[2],
        department: departments[3],
        costEstimate: 80000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[1].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.DEAN_REVIEW,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'Budget not available, forwarded directly to Dean'
          }
        ]
      });
      requests.push(atDeanLevel);

      // Scenario 8: Another fully approved request
      const anotherApproved = await Request.create({
        requestId: generateRequestId(),
        title: 'Student Lab Setup',
        purpose: 'Setup of new student laboratory with modern equipment for hands-on learning experience.',
        college: colleges[1],
        department: departments[0],
        costEstimate: 200000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[2].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.APPROVED,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'Budget not available, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.APPROVE,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Chief Director approved, forwarded to Chairman'
          },
          {
            action: ActionType.APPROVE,
            actor: chairman._id,
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.APPROVED,
            notes: 'Final approval granted by Chairman'
          }
        ]
      });
      requests.push(anotherApproved);

      // Scenario 9: Chairman rejected, Dean needs to handle (NEW WORKFLOW)
      const chairmanRejectedToDean = await Request.create({
        requestId: generateRequestId(),
        title: 'Expensive Equipment Purchase',
        purpose: 'Purchase of high-end research equipment for advanced studies.',
        college: colleges[1],
        department: departments[1],
        costEstimate: 1500000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[3].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.DEAN_REVIEW,
        pendingQuery: true,
        queryLevel: UserRole.DEAN,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'High value request, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.APPROVE,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Chief Director approved, forwarded to Chairman'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: chairman._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.CHAIRMAN_APPROVAL,
            newStatus: RequestStatus.DEAN_REVIEW,
            queryRequest: 'Please provide additional justification for this high-cost equipment purchase. Include detailed cost-benefit analysis, alternative options considered, and expected ROI timeline.',
            requiresClarification: true,
            originalRejector: chairman._id,
            isDeanMediated: true,
            notes: 'Chairman rejected - Dean to handle query with requester'
          }
        ]
      });
      requests.push(chairmanRejectedToDean);

      // Scenario 10: Request rejected at manager level
      const rejectedByManager = await Request.create({
        requestId: generateRequestId(),
        title: 'Unnecessary Equipment Purchase',
        purpose: 'Purchase of equipment that duplicates existing functionality in the department.',
        college: colleges[0],
        department: departments[2],
        costEstimate: 75000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[4].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.REJECTED,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.REJECT,
            actor: manager._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.REJECTED,
            notes: 'Request rejected as similar equipment already exists and is underutilized'
          }
        ]
      });
      requests.push(rejectedByManager);

      // Scenario 11: Manager rejected, requester needs to clarify (NEW WORKFLOW - Below Dean)
      const managerRejectedToRequester = await Request.create({
        requestId: generateRequestId(),
        title: 'Manager Rejected Request',
        purpose: 'This request was rejected by manager and sent directly to requester for query.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 100000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.SUBMITTED,
        pendingQuery: true,
        queryLevel: UserRole.REQUESTER,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: manager._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.MANAGER_REVIEW,
            newStatus: RequestStatus.SUBMITTED,
            queryRequest: 'Please provide more detailed budget breakdown and justification for this equipment purchase. Also clarify the expected ROI and usage frequency.',
            requiresClarification: true,
            notes: 'Manager rejected - requesting query from requester'
          }
        ]
      });
      requests.push(managerRejectedToRequester);

      // Scenario 11b: Requester provided query, back to VP for review (NEW WORKFLOW)
      const requesterClarifiedToVP = await Request.create({
        requestId: generateRequestId(),
        title: 'VP Rejected - Requester Clarified',
        purpose: 'This request was rejected by VP, requester provided query, now back to VP for review.',
        college: colleges[1],
        department: departments[2],
        costEstimate: 180000,
        expenseCategory: 'Training',
        sopReference: sopRecords[1].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.VP_APPROVAL,
        pendingQuery: false, // Clarification completed, now pending VP review
        queryLevel: null,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Manager approved, forwarded to VP'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: vp._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.VP_APPROVAL,
            newStatus: RequestStatus.SUBMITTED,
            queryRequest: 'The training program seems expensive. Please provide: 1) Detailed curriculum breakdown, 2) Number of participants, 3) Alternative training options considered, 4) Expected skill improvement metrics.',
            requiresClarification: true,
            notes: 'VP rejected - requesting query from requester'
          },
          {
            action: ActionType.CLARIFY_AND_REAPPROVE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.SUBMITTED,
            newStatus: RequestStatus.VP_APPROVAL,
            queryResponse: 'Thank you for the questions. Here are the details: 1) Curriculum: Advanced project management (40%), Leadership skills (30%), Technical training (30%), 2) Participants: 15 senior staff members, 3) Alternatives: Online training (₹50k less but 60% less effective), In-house training (₹80k less but lacks certification), 4) Metrics: 25% improvement in project delivery time, 90% certification rate expected. This training is critical for our upcoming major projects.',
            notes: 'Requester provided detailed query as requested'
          }
        ]
      });
      requests.push(requesterClarifiedToVP);

      // Scenario 12: HOI rejected, requester needs to clarify (NEW WORKFLOW - Below Dean)
      const hoiRejectedToRequester = await Request.create({
        requestId: generateRequestId(),
        title: 'HOI Rejected - Direct to Requester',
        purpose: 'This request was rejected by HOI and sent directly to requester for query (HOI is below Dean level).',
        college: colleges[2],
        department: departments[1],
        costEstimate: 300000,
        expenseCategory: 'Infrastructure',
        sopReference: sopRecords[2].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.SUBMITTED,
        pendingQuery: true,
        queryLevel: UserRole.REQUESTER,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Manager approved, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.HOI_APPROVAL,
            newStatus: RequestStatus.SUBMITTED,
            queryRequest: 'The infrastructure upgrade scope seems too broad. Please provide: 1) Detailed breakdown of systems to be upgraded, 2) Priority ranking of upgrades, 3) Phased implementation plan, 4) Cost justification for each phase.',
            requiresClarification: true,
            notes: 'HOI rejected - sent directly to requester for query (HOI is below Dean level)'
          }
        ]
      });
      requests.push(hoiRejectedToRequester);

      // Scenario 13: Chief Director rejected, Dean reviewing requester's query (Above Dean Level)
      const chiefDirectorRejectedDeanReviewing = await Request.create({
        requestId: generateRequestId(),
        title: 'Chief Director Rejected - Dean Reviewing',
        purpose: 'This request was rejected by Chief Director, sent to Dean, then to requester, and requester has provided query. Now Dean is reviewing.',
        college: colleges[1],
        department: departments[3],
        costEstimate: 800000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[3].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.DEAN_REVIEW,
        pendingQuery: true,
        queryLevel: UserRole.DEAN,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Manager approved, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            newStatus: RequestStatus.DEAN_REVIEW,
            queryRequest: 'This high-value equipment purchase needs more justification. Please provide detailed cost-benefit analysis and alternative options.',
            requiresClarification: true,
            originalRejector: chiefDirector._id,
            isDeanMediated: true,
            notes: 'Chief Director rejected - Dean to handle query (above Dean level)'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: dean._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.DEAN_REVIEW,
            newStatus: RequestStatus.SUBMITTED,
            queryRequest: 'The Chief Director needs more justification for this equipment purchase. Please provide: 1) Detailed cost-benefit analysis, 2) Alternative equipment options considered, 3) Expected ROI timeline, 4) Usage projections.',
            requiresClarification: true,
            notes: 'Dean forwarding Chief Director concerns to requester'
          },
          {
            action: ActionType.CLARIFY_AND_REAPPROVE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.SUBMITTED,
            newStatus: RequestStatus.DEAN_REVIEW,
            queryResponse: 'Thank you for the opportunity to clarify. Cost-benefit analysis: Equipment cost ₹800k, expected savings ₹200k/year through efficiency gains. ROI: 4 years. Alternatives considered: Leasing (₹150k/year - more expensive long-term), Refurbished equipment (₹500k but 50% shorter lifespan). Usage: 8 hours/day, 250 days/year. This equipment is essential for our new research projects and will serve 50+ researchers.',
            notes: 'Requester provided comprehensive query as requested'
          }
        ]
      });
      requests.push(chiefDirectorRejectedDeanReviewing);

      // Scenario 14: Currently at Chairman level
      const atChairmanLevel = await Request.create({
        requestId: generateRequestId(),
        title: 'Major Infrastructure Overhaul',
        purpose: 'Complete overhaul of campus infrastructure including electrical, plumbing, and network systems.',
        college: colleges[2],
        department: departments[2],
        costEstimate: 2000000,
        expenseCategory: 'Infrastructure',
        sopReference: sopRecords[4].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.CHAIRMAN_APPROVAL,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.PARALLEL_VERIFICATION,
            notes: 'Forwarded for parallel verification'
          },
          {
            action: ActionType.APPROVE,
            actor: sopVerifier._id,
            timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.SOP_COMPLETED,
            notes: 'SOP verification completed'
          },
          {
            action: ActionType.APPROVE,
            actor: accountant._id,
            timestamp: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Budget verification completed'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'High value request, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.APPROVE,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Chief Director approved, awaiting final Chairman approval'
          }
        ]
      });
      requests.push(atChairmanLevel);

      // ===== LEAVE REQUEST SCENARIOS (Bypass Manager, Go Directly to VP) =====
      
      // Leave Request 1: Pending at VP level
      const leaveRequestPendingVP = await Request.create({
        requestId: generateRequestId(),
        title: 'Annual Leave Request - 10 Days',
        purpose: 'Annual vacation leave for family trip to Kerala from March 15-25, 2024.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 0, // Leave requests typically have no cost
        expenseCategory: 'Leave',
        sopReference: 'SOP-LEAVE-001',
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.VP_APPROVAL, // Directly at VP level
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Leave request created and forwarded directly to VP for approval'
          }
        ]
      });
      requests.push(leaveRequestPendingVP);

      // Leave Request 2: Approved by VP, now at HOI
      const leaveRequestAtHOI = await Request.create({
        requestId: generateRequestId(),
        title: 'Medical Leave Request - 5 Days',
        purpose: 'Medical leave for surgery and recovery period from February 20-25, 2024.',
        college: colleges[1],
        department: departments[1],
        costEstimate: 0,
        expenseCategory: 'Leave',
        sopReference: 'SOP-LEAVE-002',
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.HOI_APPROVAL,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Leave request created and forwarded directly to VP for approval'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved medical leave, forwarded to HOI'
          }
        ]
      });
      requests.push(leaveRequestAtHOI);

      // Leave Request 3: Fully approved
      const leaveRequestApproved = await Request.create({
        requestId: generateRequestId(),
        title: 'Emergency Leave Request - 2 Days',
        purpose: 'Emergency leave due to family emergency - immediate departure required.',
        college: colleges[2],
        department: departments[2],
        costEstimate: 0,
        expenseCategory: 'Leave',
        sopReference: 'SOP-LEAVE-003',
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.APPROVED,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Emergency leave request created and forwarded directly to VP for approval'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved emergency leave, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved emergency leave, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.APPROVED,
            notes: 'Dean approved emergency leave - request completed'
          }
        ]
      });
      requests.push(leaveRequestApproved);

      // Leave Request 4: Mixed case title test
      const leaveRequestMixedCase = await Request.create({
        requestId: generateRequestId(),
        title: 'Maternity LEAVE Application - 90 Days',
        purpose: 'Maternity leave application for 90 days starting from April 1, 2024.',
        college: colleges[0],
        department: departments[3],
        costEstimate: 0,
        expenseCategory: 'Leave',
        sopReference: 'SOP-LEAVE-004',
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.VP_APPROVAL,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Maternity leave request created and forwarded directly to VP for approval'
          }
        ]
      });
      requests.push(leaveRequestMixedCase);

      // ===== COST-BASED APPROVAL TESTING SCENARIOS =====
      
      // Low Cost Request 1: ₹30,000 - Should stop at Chief Director
      const lowCostRequest1 = await Request.create({
        requestId: generateRequestId(),
        title: 'Office Supplies Purchase',
        purpose: 'Purchase of basic office supplies including stationery, printer cartridges, and desk accessories.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 30000, // ≤ ₹50,000 - Should stop at Chief Director
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Manager approved, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          }
        ]
      });
      requests.push(lowCostRequest1);

      // Low Cost Request 2: ₹45,000 - Should stop at Chief Director
      const lowCostRequest2 = await Request.create({
        requestId: generateRequestId(),
        title: 'Minor Equipment Repair',
        purpose: 'Repair and maintenance of existing laboratory equipment including calibration and parts replacement.',
        college: colleges[1],
        department: departments[1],
        costEstimate: 45000, // ≤ ₹50,000 - Should stop at Chief Director
        expenseCategory: 'Equipment',
        sopReference: sopRecords[1].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.APPROVED, // Already approved by Chief Director (cost ≤ ₹50,000)
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Manager approved, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.APPROVE,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.APPROVED,
            notes: 'Chief Director approved - Final approval (cost ≤ ₹50,000, no Chairman required)'
          }
        ]
      });
      requests.push(lowCostRequest2);

      // Boundary Test: ₹50,000 exactly - Should stop at Chief Director
      const boundaryCostRequest = await Request.create({
        requestId: generateRequestId(),
        title: 'Software License - Boundary Test',
        purpose: 'Purchase of software license for department use - exactly at ₹50,000 boundary.',
        college: colleges[2],
        department: departments[2],
        costEstimate: 50000, // = ₹50,000 - Should stop at Chief Director
        expenseCategory: 'Software',
        sopReference: sopRecords[2].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.APPROVED, // Already approved by Chief Director (cost ≤ ₹50,000)
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.VP_APPROVAL,
            notes: 'Manager approved, forwarded to VP'
          },
          {
            action: ActionType.APPROVE,
            actor: vp._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.HOI_APPROVAL,
            notes: 'VP approved, forwarded to HOI'
          },
          {
            action: ActionType.APPROVE,
            actor: hoi._id,
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'HOI approved, forwarded to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
            notes: 'Dean approved, forwarded to Chief Director'
          },
          {
            action: ActionType.APPROVE,
            actor: chiefDirector._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.APPROVED,
            notes: 'Chief Director approved - Final approval (cost = ₹50,000, no Chairman required)'
          }
        ]
      });
      requests.push(boundaryCostRequest);

      // ===== BUDGET NOT AVAILABLE FLOW TEST SCENARIOS =====
      
      // Budget Not Available 1: High cost (₹75,000) - Should go Dean → Chairman
      const budgetNotAvailableHighCost = await Request.create({
        requestId: generateRequestId(),
        title: 'High Cost Equipment - Budget Not Available',
        purpose: 'Purchase of specialized equipment when budget is not available - should go to Chairman due to high cost.',
        college: colleges[0],
        department: departments[1],
        costEstimate: 75000, // > ₹50,000 - Should go Dean → Chairman
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.CHAIRMAN_APPROVAL,
        budgetNotAvailable: true, // Flag indicating budget not available path
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'Budget not available, forwarded directly to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Dean approved - High cost (₹75,000) with no budget, forwarded to Chairman'
          }
        ]
      });
      requests.push(budgetNotAvailableHighCost);

      // Budget Not Available 2: Low cost (₹35,000) - Should go Dean → Chairman
      const budgetNotAvailableLowCost = await Request.create({
        requestId: generateRequestId(),
        title: 'Low Cost Supplies - Budget Not Available',
        purpose: 'Purchase of office supplies when budget is not available - should go to Chairman regardless of cost.',
        college: colleges[1],
        department: departments[2],
        costEstimate: 35000, // ≤ ₹50,000 - But still goes Dean → Chairman (budget not available)
        expenseCategory: 'Equipment',
        sopReference: sopRecords[1].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.APPROVED, // Already approved by Chairman
        budgetNotAvailable: true, // Flag indicating budget not available path
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'Budget not available, forwarded directly to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Dean approved - Budget not available, forwarded to Chairman'
          },
          {
            action: ActionType.APPROVE,
            actor: chairman._id,
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.APPROVED,
            notes: 'Chairman approved - Final approval for budget not available request'
          }
        ]
      });
      requests.push(budgetNotAvailableLowCost);

      // Budget Not Available 3: No cost (₹0) - Should go Dean → Chairman
      const budgetNotAvailableNoCost = await Request.create({
        requestId: generateRequestId(),
        title: 'No Cost Request - Budget Not Available',
        purpose: 'Administrative request with no cost when budget is not available - should go to Chairman regardless of cost.',
        college: colleges[2],
        department: departments[0],
        costEstimate: 0, // No cost - But still goes Dean → Chairman (budget not available)
        expenseCategory: 'Administrative',
        sopReference: sopRecords[2].code,
        attachments: ['sample-document.pdf'],
        requester: requester._id,
        status: RequestStatus.CHAIRMAN_APPROVAL, // Pending at Chairman
        budgetNotAvailable: true, // Flag indicating budget not available path
        history: [
          {
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.MANAGER_REVIEW,
            notes: 'Request created and forwarded to manager'
          },
          {
            action: ActionType.FORWARD,
            actor: manager._id,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.DEAN_REVIEW,
            notes: 'Budget not available, forwarded directly to Dean'
          },
          {
            action: ActionType.APPROVE,
            actor: dean._id,
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            newStatus: RequestStatus.CHAIRMAN_APPROVAL,
            notes: 'Dean approved - Budget not available, forwarded to Chairman'
          }
        ]
      });
      requests.push(budgetNotAvailableNoCost);

      console.log(`✅ Created ${requests.length} sample requests with realistic workflow scenarios`);
      console.log('📊 Request scenarios created:');
      console.log('   • 3 Fully approved requests (Chairman approved)');
      console.log('   • 3 Rejected requests (at different stages)');
      console.log('   • 4 In-progress requests (at various approval stages)');
      console.log('   • 4 LEAVE REQUESTS (bypass manager, go directly to VP):');
      console.log('     - Annual leave (pending at VP)');
      console.log('     - Medical leave (approved by VP, at HOI)');
      console.log('     - Emergency leave (fully approved)');
      console.log('     - Maternity leave (pending at VP, mixed case title)');
      console.log('   • 5 CORRECTED CLARIFICATION WORKFLOW scenarios:');
      console.log('     - Chairman rejected → Dean handling (Above Dean)');
      console.log('     - Manager rejected → Requester clarifying (Below Dean)');
      console.log('     - VP rejected → Requester clarified → VP reviewing (Below Dean)');
      console.log('     - HOI rejected → Requester clarifying (Below Dean)');
      console.log('     - Chief Director → Dean → Requester → Dean reviewing (Above Dean)');
      console.log('   • 3 COST-BASED APPROVAL TEST scenarios:');
      console.log('     - ₹30,000 request (pending at Chief Director - should stop here)');
      console.log('     - ₹45,000 request (approved by Chief Director - stopped correctly)');
      console.log('     - ₹50,000 request (approved by Chief Director - boundary test)');
      console.log('   • 3 BUDGET NOT AVAILABLE FLOW scenarios:');
      console.log('     - ₹75,000 request (Manager → Dean → Chairman - high cost)');
      console.log('     - ₹35,000 request (Manager → Dean → Chief Director - low cost)');
      console.log('     - ₹0 request (Manager → Dean → Chief Director - no cost)');
    }

    console.log('🎉 Database seeded successfully!');
    console.log('\n👥 Login Credentials:');
    console.log('Password for all users: password123\n');
    
    users.forEach(user => {
      console.log(`${user.email}`);
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    [UserRole.REQUESTER]: 'Requester',
    [UserRole.INSTITUTION_MANAGER]: 'Institution Manager',
    [UserRole.SOP_VERIFIER]: 'SOP Verifier',
    [UserRole.ACCOUNTANT]: 'Accountant',
    [UserRole.VP]: 'VP Admin',
    [UserRole.HEAD_OF_INSTITUTION]: 'Head of Institution',
    [UserRole.DEAN]: 'Dean',
    [UserRole.MMA]: 'MMA Department',
    [UserRole.HR]: 'HR Department',
    [UserRole.AUDIT]: 'Audit Department',
    [UserRole.IT]: 'IT Department',
    [UserRole.CHIEF_DIRECTOR]: 'Chief Director',
    [UserRole.CHAIRMAN]: 'Chairman',
  };
  return roleNames[role] || role;
}



// Run the seed function
if (require.main === module) {
  seed();
}

export default seed;