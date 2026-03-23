import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Request from '../models/Request';
import BudgetRecord from '../models/BudgetRecord';
import SOPRecord from '../models/SOPRecord';
import EscalationState from '../models/EscalationState';
import { ActionType, RequestStatus, UserRole } from '../lib/types';

const colleges = ['EEC', 'Medicine', 'Business'];
const departments = ['Computer Science', 'Mechanical', 'Electrical', 'Civil'];
const expenseCategories = ['Equipment', 'Software', 'Travel', 'Training', 'Infrastructure'];

function generateRequestId(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.REQUESTER]: 'Raj',
    [UserRole.INSTITUTION_MANAGER]: 'Tharun',
    [UserRole.ACCOUNTANT]: 'Swathy',
    [UserRole.VP_RESEARCH]: 'Shri',
    [UserRole.VP_ACADEMIC]: 'Shri',
    [UserRole.VP_ADMIN]: 'Shri',
    [UserRole.RESEARCH_DIRECTOR]: 'Shri',
    [UserRole.HEAD_OF_INSTITUTION]: 'Priya',
    [UserRole.DEAN]: 'Prashanth',
    [UserRole.MMA]: 'Gopinath',
    [UserRole.HR]: 'Marish',
    [UserRole.AUDIT]: 'Naren',
    [UserRole.IT]: 'Poormila',
    [UserRole.CHIEF_DIRECTOR]: 'Sarvesh',
    [UserRole.CHAIRMAN]: 'Shivakumar',
  };
  return roleNames[role] || role;
}

async function seedEightHr() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined');
      process.exit(1);
    }

    await connectDB();
    console.log('🌱 Seeding demo database...');

    // ── Wipe everything ──────────────────────────────────────────────────────
    await User.deleteMany({});
    await Request.deleteMany({});
    await BudgetRecord.deleteMany({});
    await SOPRecord.deleteMany({});
    await EscalationState.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // ── Users ────────────────────────────────────────────────────────────────
    const users = [];
    let contactCounter = 9876543210;

    for (const role of Object.values(UserRole)) {
      let userDepartment: string | undefined = undefined;
      if (role === UserRole.REQUESTER || role === UserRole.HEAD_OF_INSTITUTION) {
        userDepartment = departments[0];
      }

      // Manager gets the demo email so escalation lands in the right inbox
      const email = role === UserRole.INSTITUTION_MANAGER
        ? 'mdkhubaib94@gmail.com'
        : `${role}@gmail.com`;

      const user = await User.create({
        email,
        name: getRoleDisplayName(role),
        empId: `EMP${role.toUpperCase()}`,
        contactNo: `+91 ${contactCounter.toString().slice(-10)}`,
        password: 'password123',
        role,
        college: 'EEC',
        department: userDepartment,
        isVerified: true,
      });
      users.push(user);
      contactCounter++;
    }
    console.log(`✅ Created ${users.length} users`);

    // ── Budget records ───────────────────────────────────────────────────────
    for (const college of colleges) {
      for (const department of departments) {
        for (const category of expenseCategories) {
          await BudgetRecord.create({
            college, department, category,
            allocated: Math.floor(Math.random() * 1000000) + 100000,
            spent: Math.floor(Math.random() * 50000),
            available: Math.floor(Math.random() * 950000) + 50000,
            fiscalYear: '2024-25',
          });
        }
      }
    }
    console.log('✅ Created budget records');

    // ── SOP records ──────────────────────────────────────────────────────────
    const sopCodes = ['SOP-001', 'SOP-002', 'SOP-003', 'SOP-004', 'SOP-005'];
    for (let i = 0; i < sopCodes.length; i++) {
      await SOPRecord.create({
        code: sopCodes[i],
        title: `Standard Operating Procedure ${i + 1}`,
        description: `This SOP covers the procedures for ${expenseCategories[i]} requests.`,
        college: colleges[i % colleges.length],
        department: i < 2 ? departments[0] : undefined,
        requiresBudgetCheck: true,
        minimumAmount: (i + 1) * 10000,
        isActive: true,
      });
    }
    console.log('✅ Created SOP records');

    // ── Escalation demo request ──────────────────────────────────────────────
    const requester = users.find(u => u.role === UserRole.REQUESTER)!;

    // 8 hours + 1 minute ago — already past the threshold, fires on next timer tick
    const arrivedAtManagerAt = new Date(Date.now() - (8 * 60 * 60 * 1000 + 60 * 1000));

    const demoRequest = await Request.create({
      requestId: generateRequestId(),
      title: '[DEMO] Pending Manager Approval - Escalation Test',
      purpose: 'Demo request to showcase the 8-hour escalation email notification. This request has been at Manager Review for over 8 hours and will trigger an automatic reminder email to the manager.',
      college: 'EEC',
      department: 'Computer Science',
      costEstimate: 150000,
      expenseCategory: 'Equipment',
      sopReference: 'SOP-001',
      attachments: ['demo-document.pdf'],
      requester: requester._id,
      status: RequestStatus.MANAGER_REVIEW,
      escalation: { reminderSent: false, flagged: false },
      history: [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          timestamp: arrivedAtManagerAt,
          previousStatus: RequestStatus.SUBMITTED,
          newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted and forwarded to manager for review',
        },
      ],
    });
    console.log('✅ Created escalation demo request');

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n👥 Login Credentials (password: password123)\n');
    users.forEach(u => console.log(`  ${u.email.padEnd(40)} ${u.name} (${u.role})`));
    console.log(`\n📋 Demo Request ID : ${demoRequest.requestId}`);
    console.log(`   Status          : MANAGER_REVIEW (${Math.round((Date.now() - arrivedAtManagerAt.getTime()) / 60000)} mins overdue)`);
    console.log(`\n📧 Escalation email → mdkhubaib94@gmail.com`);
    console.log('⚡ Will fire automatically within 60 seconds of the server running.\n');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedEightHr();
