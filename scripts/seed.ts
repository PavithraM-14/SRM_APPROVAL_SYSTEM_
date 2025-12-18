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
        email: `${role}@srmrmp.edu.in`, // Updated to use correct domain
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
        title: 'New Laboratory Equipment Purchase',
        purpose: 'Purchase of advanced laboratory equipment for Computer Science department to enhance research capabilities and student learning experience.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 250000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: [],
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
        title: 'Software License Renewal',
        purpose: 'Annual renewal of software licenses for development tools used in Computer Science curriculum.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 150000,
        expenseCategory: 'Software',
        sopReference: sopRecords[1].code,
        attachments: [],
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
        title: 'Conference Travel Request',
        purpose: 'Travel expenses for attending international conference on Machine Learning and AI.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 180000,
        expenseCategory: 'Travel',
        sopReference: sopRecords[2].code,
        attachments: [],
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
        title: 'Infrastructure Upgrade Project',
        purpose: 'Upgrade of network infrastructure in Engineering building to support increased bandwidth requirements.',
        college: colleges[0],
        department: departments[1],
        costEstimate: 500000,
        expenseCategory: 'Infrastructure',
        sopReference: sopRecords[3].code,
        attachments: [],
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
        title: 'Training Program for Faculty',
        purpose: 'Professional development training program for faculty members on latest teaching methodologies.',
        college: colleges[1],
        department: departments[2],
        costEstimate: 120000,
        expenseCategory: 'Training',
        sopReference: sopRecords[4].code,
        attachments: [],
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
        title: 'Research Equipment Purchase',
        purpose: 'Purchase of specialized research equipment for advanced materials testing laboratory.',
        college: colleges[1],
        department: departments[1],
        costEstimate: 350000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: [],
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
        title: 'Library Book Collection Expansion',
        purpose: 'Purchase of new books and digital resources for the central library to support curriculum updates.',
        college: colleges[2],
        department: departments[3],
        costEstimate: 80000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[1].code,
        attachments: [],
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
        title: 'Student Lab Setup',
        purpose: 'Setup of new student laboratory with modern equipment for hands-on learning experience.',
        college: colleges[1],
        department: departments[0],
        costEstimate: 200000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[2].code,
        attachments: [],
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
        title: 'Expensive Equipment Purchase',
        purpose: 'Purchase of high-end research equipment for advanced studies.',
        college: colleges[1],
        department: departments[1],
        costEstimate: 1500000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[3].code,
        attachments: [],
        requester: requester._id,
        status: RequestStatus.DEAN_REVIEW,
        pendingClarification: true,
        clarificationLevel: UserRole.DEAN,
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
            clarificationRequest: 'Please provide additional justification for this high-cost equipment purchase. Include detailed cost-benefit analysis, alternative options considered, and expected ROI timeline.',
            requiresClarification: true,
            originalRejector: chairman._id,
            isDeanMediated: true,
            notes: 'Chairman rejected - Dean to handle clarification with requester'
          }
        ]
      });
      requests.push(chairmanRejectedToDean);

      // Scenario 10: Request rejected at manager level
      const rejectedByManager = await Request.create({
        title: 'Unnecessary Equipment Purchase',
        purpose: 'Purchase of equipment that duplicates existing functionality in the department.',
        college: colleges[0],
        department: departments[2],
        costEstimate: 75000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[4].code,
        attachments: [],
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
        title: 'Manager Rejected Request',
        purpose: 'This request was rejected by manager and sent directly to requester for clarification.',
        college: colleges[0],
        department: departments[0],
        costEstimate: 100000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[0].code,
        attachments: [],
        requester: requester._id,
        status: RequestStatus.SUBMITTED,
        pendingClarification: true,
        clarificationLevel: UserRole.REQUESTER,
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
            clarificationRequest: 'Please provide more detailed budget breakdown and justification for this equipment purchase. Also clarify the expected ROI and usage frequency.',
            requiresClarification: true,
            notes: 'Manager rejected - requesting clarification from requester'
          }
        ]
      });
      requests.push(managerRejectedToRequester);

      // Scenario 11b: Requester provided clarification, back to VP for review (NEW WORKFLOW)
      const requesterClarifiedToVP = await Request.create({
        title: 'VP Rejected - Requester Clarified',
        purpose: 'This request was rejected by VP, requester provided clarification, now back to VP for review.',
        college: colleges[1],
        department: departments[2],
        costEstimate: 180000,
        expenseCategory: 'Training',
        sopReference: sopRecords[1].code,
        attachments: [],
        requester: requester._id,
        status: RequestStatus.VP_APPROVAL,
        pendingClarification: false, // Clarification completed, now pending VP review
        clarificationLevel: null,
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
            clarificationRequest: 'The training program seems expensive. Please provide: 1) Detailed curriculum breakdown, 2) Number of participants, 3) Alternative training options considered, 4) Expected skill improvement metrics.',
            requiresClarification: true,
            notes: 'VP rejected - requesting clarification from requester'
          },
          {
            action: ActionType.CLARIFY_AND_REAPPROVE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.SUBMITTED,
            newStatus: RequestStatus.VP_APPROVAL,
            clarificationResponse: 'Thank you for the questions. Here are the details: 1) Curriculum: Advanced project management (40%), Leadership skills (30%), Technical training (30%), 2) Participants: 15 senior staff members, 3) Alternatives: Online training (₹50k less but 60% less effective), In-house training (₹80k less but lacks certification), 4) Metrics: 25% improvement in project delivery time, 90% certification rate expected. This training is critical for our upcoming major projects.',
            notes: 'Requester provided detailed clarification as requested'
          }
        ]
      });
      requests.push(requesterClarifiedToVP);

      // Scenario 12: HOI rejected, requester needs to clarify (NEW WORKFLOW - Below Dean)
      const hoiRejectedToRequester = await Request.create({
        title: 'HOI Rejected - Direct to Requester',
        purpose: 'This request was rejected by HOI and sent directly to requester for clarification (HOI is below Dean level).',
        college: colleges[2],
        department: departments[1],
        costEstimate: 300000,
        expenseCategory: 'Infrastructure',
        sopReference: sopRecords[2].code,
        attachments: [],
        requester: requester._id,
        status: RequestStatus.SUBMITTED,
        pendingClarification: true,
        clarificationLevel: UserRole.REQUESTER,
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
            clarificationRequest: 'The infrastructure upgrade scope seems too broad. Please provide: 1) Detailed breakdown of systems to be upgraded, 2) Priority ranking of upgrades, 3) Phased implementation plan, 4) Cost justification for each phase.',
            requiresClarification: true,
            notes: 'HOI rejected - sent directly to requester for clarification (HOI is below Dean level)'
          }
        ]
      });
      requests.push(hoiRejectedToRequester);

      // Scenario 13: Chief Director rejected, Dean reviewing requester's clarification (Above Dean Level)
      const chiefDirectorRejectedDeanReviewing = await Request.create({
        title: 'Chief Director Rejected - Dean Reviewing',
        purpose: 'This request was rejected by Chief Director, sent to Dean, then to requester, and requester has provided clarification. Now Dean is reviewing.',
        college: colleges[1],
        department: departments[3],
        costEstimate: 800000,
        expenseCategory: 'Equipment',
        sopReference: sopRecords[3].code,
        attachments: [],
        requester: requester._id,
        status: RequestStatus.DEAN_REVIEW,
        pendingClarification: true,
        clarificationLevel: UserRole.DEAN,
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
            clarificationRequest: 'This high-value equipment purchase needs more justification. Please provide detailed cost-benefit analysis and alternative options.',
            requiresClarification: true,
            originalRejector: chiefDirector._id,
            isDeanMediated: true,
            notes: 'Chief Director rejected - Dean to handle clarification (above Dean level)'
          },
          {
            action: ActionType.REJECT_WITH_CLARIFICATION,
            actor: dean._id,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.DEAN_REVIEW,
            newStatus: RequestStatus.SUBMITTED,
            clarificationRequest: 'The Chief Director needs more justification for this equipment purchase. Please provide: 1) Detailed cost-benefit analysis, 2) Alternative equipment options considered, 3) Expected ROI timeline, 4) Usage projections.',
            requiresClarification: true,
            notes: 'Dean forwarding Chief Director concerns to requester'
          },
          {
            action: ActionType.CLARIFY_AND_REAPPROVE,
            actor: requester._id,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            previousStatus: RequestStatus.SUBMITTED,
            newStatus: RequestStatus.DEAN_REVIEW,
            clarificationResponse: 'Thank you for the opportunity to clarify. Cost-benefit analysis: Equipment cost ₹800k, expected savings ₹200k/year through efficiency gains. ROI: 4 years. Alternatives considered: Leasing (₹150k/year - more expensive long-term), Refurbished equipment (₹500k but 50% shorter lifespan). Usage: 8 hours/day, 250 days/year. This equipment is essential for our new research projects and will serve 50+ researchers.',
            notes: 'Requester provided comprehensive clarification as requested'
          }
        ]
      });
      requests.push(chiefDirectorRejectedDeanReviewing);

      // Scenario 14: Currently at Chairman level
      const atChairmanLevel = await Request.create({
        title: 'Major Infrastructure Overhaul',
        purpose: 'Complete overhaul of campus infrastructure including electrical, plumbing, and network systems.',
        college: colleges[2],
        department: departments[2],
        costEstimate: 2000000,
        expenseCategory: 'Infrastructure',
        sopReference: sopRecords[4].code,
        attachments: [],
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

      console.log(`✅ Created ${requests.length} sample requests with realistic workflow scenarios`);
      console.log('📊 Request scenarios created:');
      console.log('   • 3 Fully approved requests (Chairman approved)');
      console.log('   • 3 Rejected requests (at different stages)');
      console.log('   • 4 In-progress requests (at various approval stages)');
      console.log('   • 5 CORRECTED CLARIFICATION WORKFLOW scenarios:');
      console.log('     - Chairman rejected → Dean handling (Above Dean)');
      console.log('     - Manager rejected → Requester clarifying (Below Dean)');
      console.log('     - VP rejected → Requester clarified → VP reviewing (Below Dean)');
      console.log('     - HOI rejected → Requester clarifying (Below Dean)');
      console.log('     - Chief Director → Dean → Requester → Dean reviewing (Above Dean)');
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
    [UserRole.REQUESTER]: 'John Requester',
    [UserRole.INSTITUTION_MANAGER]: 'Sarah Manager',
    [UserRole.SOP_VERIFIER]: 'Diana SOP Verifier',
    [UserRole.ACCOUNTANT]: 'Mike Accountant',
    [UserRole.VP]: 'Lisa VP',
    [UserRole.HEAD_OF_INSTITUTION]: 'David HOI',
    [UserRole.DEAN]: 'Dr. Emily Dean',
    [UserRole.MMA]: 'Robert MMA',
    [UserRole.HR]: 'Jennifer HR',
    [UserRole.AUDIT]: 'Tom Audit',
    [UserRole.IT]: 'Alex IT',
    [UserRole.CHIEF_DIRECTOR]: 'Chief Director',
    [UserRole.CHAIRMAN]: 'Chairman Smith',
  };
  return roleNames[role] || role;
}



// Run the seed function
if (require.main === module) {
  seed();
}

export default seed;