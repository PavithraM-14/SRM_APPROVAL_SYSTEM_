import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Request from '../models/Request';
import BudgetRecord from '../models/BudgetRecord';
import SOPRecord from '../models/SOPRecord';
import { UserRole, RequestStatus, ActionType } from '../lib/types';
import bcrypt from 'bcryptjs';

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
        email: `${role}@srm.edu`,
        name: getRoleDisplayName(role),
        empId: `EMP${role.toUpperCase()}`, // Add employee ID
        contactNo: `+91-${contactCounter}`, // Add contact number
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

    // Create sample requests
    const requester = users.find(u => u.role === UserRole.REQUESTER);
    const manager = users.find(u => u.role === UserRole.INSTITUTION_MANAGER);
    
    if (requester && manager) {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        const request = await Request.create({
          title: `Sample Request ${i + 1}`,
          purpose: `This is a sample request for ${expenseCategories[i % expenseCategories.length]} purposes. It demonstrates the approval workflow system.`,
          college: colleges[i % colleges.length],
          department: departments[i % departments.length],
          costEstimate: Math.floor(Math.random() * 100000) + 5000,
          expenseCategory: expenseCategories[i % expenseCategories.length],
          sopReference: sopRecords[i % sopRecords.length].code,
          attachments: [],
          requester: requester._id,
          status: getRandomStatus(),
          history: [{
            action: ActionType.CREATE,
            actor: requester._id,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          }],
        });
        requests.push(request);
      }

      console.log(`✅ Created ${requests.length} sample requests`);
    }

    console.log('🎉 Database seeded successfully!');
    console.log('👥 Default users created with emails:');
    users.forEach(user => {
      console.log(`   ${user.email} (${user.role}) - Password: password123`);
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

function getRandomStatus(): RequestStatus {
  const statuses = [
    RequestStatus.MANAGER_REVIEW,
    RequestStatus.SOP_VERIFICATION,
    RequestStatus.BUDGET_CHECK,
    RequestStatus.INSTITUTION_VERIFIED,
    RequestStatus.VP_APPROVAL,
    RequestStatus.HOI_APPROVAL,
    RequestStatus.DEAN_REVIEW,
    RequestStatus.DEPARTMENT_CHECKS,
    RequestStatus.DEAN_VERIFICATION,
    RequestStatus.CHIEF_DIRECTOR_APPROVAL,
    RequestStatus.CHAIRMAN_APPROVAL,
    RequestStatus.APPROVED,
    RequestStatus.REJECTED,
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// Run the seed function
if (require.main === module) {
  seed();
}

export default seed;