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

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function seedTenHr() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined');
      process.exit(1);
    }

    await connectDB();
    console.log('🌱 Seeding 10-hour flagging demo database...');

    // ── Wipe everything ──────────────────────────────────────────────────────
    await User.deleteMany({});
    await Request.deleteMany({});
    await BudgetRecord.deleteMany({});
    await SOPRecord.deleteMany({});
    await EscalationState.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // ── Users ────────────────────────────────────────────────────────────────
    const colleges = ['EEC', 'Medicine', 'Business'];
    const departments = ['Computer Science', 'Mechanical', 'Electrical', 'Civil'];
    const expenseCategories = ['Equipment', 'Software', 'Travel', 'Training', 'Infrastructure'];

    const users = [];
    let contactCounter = 9876543210;

    for (const role of Object.values(UserRole)) {
      let userDepartment: string | undefined = undefined;
      if (role === UserRole.REQUESTER || role === UserRole.HEAD_OF_INSTITUTION) {
        userDepartment = departments[0];
      }
      const user = await User.create({
        email: `${role}@gmail.com`,
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

    // ── Budget & SOP records ─────────────────────────────────────────────────
    for (const college of colleges) {
      for (const dept of departments) {
        for (const cat of expenseCategories) {
          await BudgetRecord.create({
            college, department: dept, category: cat,
            allocated: 1000000, spent: 50000, available: 950000,
            fiscalYear: '2024-25',
          });
        }
      }
    }
    const sopCodes = ['SOP-001', 'SOP-002', 'SOP-003', 'SOP-004', 'SOP-005'];
    for (let i = 0; i < sopCodes.length; i++) {
      await SOPRecord.create({
        code: sopCodes[i],
        title: `Standard Operating Procedure ${i + 1}`,
        description: `SOP for ${expenseCategories[i]} requests.`,
        college: colleges[i % colleges.length],
        department: i < 2 ? departments[0] : undefined,
        requiresBudgetCheck: true,
        minimumAmount: (i + 1) * 10000,
        isActive: true,
      });
    }
    console.log('✅ Created budget & SOP records');

    const requester  = users.find(u => u.role === UserRole.REQUESTER)!;
    const manager    = users.find(u => u.role === UserRole.INSTITUTION_MANAGER)!;
    const accountant = users.find(u => u.role === UserRole.ACCOUNTANT)!;
    const vpResearch = users.find(u => u.role === UserRole.VP_RESEARCH)!;
    const hoi        = users.find(u => u.role === UserRole.HEAD_OF_INSTITUTION)!;
    const dean       = users.find(u => u.role === UserRole.DEAN)!;
    const chief      = users.find(u => u.role === UserRole.CHIEF_DIRECTOR)!;

    // actor required by schema — use requester id for system-generated entries
    const sys = requester._id;

    // ── FLAGGED REQUESTS ─────────────────────────────────────────────────────

    // 1. Stalled at MANAGER (12h) — VP/HOI/Dean/Chief/Chairman can bypass
    await Request.create({
      requestId: generateRequestId(),
      title: '[FLAGGED] Lab Equipment Purchase — Stalled at Manager',
      purpose: 'Purchase of advanced lab equipment for Computer Science department. Pending manager approval for over 12 hours and auto-flagged by the system.',
      college: 'EEC', department: 'Computer Science',
      costEstimate: 250000, expenseCategory: 'Equipment', sopReference: 'SOP-001',
      attachments: ['lab-equipment-quote.pdf'],
      requester: requester._id,
      status: RequestStatus.MANAGER_REVIEW,
      escalation: {
        reminderSent: true, reminderSentAt: hoursAgo(4),
        flagged: true, flaggedAt: hoursAgo(2),
        stalledRole: UserRole.INSTITUTION_MANAGER,
      },
      history: [
        {
          action: ActionType.CREATE, actor: requester._id,
          timestamp: hoursAgo(12),
          previousStatus: RequestStatus.SUBMITTED, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted for manager review',
        },
        {
          action: ActionType.ESCALATION_FLAGGED, actor: sys,
          timestamp: hoursAgo(2),
          previousStatus: RequestStatus.MANAGER_REVIEW, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Auto-flagged: no action taken in 10 hours',
        },
      ],
    });

    // 2. Stalled at VP (14h) — HOI/Dean/Chief/Chairman can bypass
    await Request.create({
      requestId: generateRequestId(),
      title: '[FLAGGED] Software License Renewal — Stalled at VP',
      purpose: 'Annual renewal of development software licenses. Manager and accountant approved. Pending VP approval for 14 hours.',
      college: 'EEC', department: 'Computer Science',
      costEstimate: 180000, expenseCategory: 'Software', sopReference: 'SOP-002',
      attachments: ['license-renewal-invoice.pdf'],
      requester: requester._id,
      status: RequestStatus.VP_RESEARCH_APPROVAL,
      escalation: {
        reminderSent: true, reminderSentAt: hoursAgo(6),
        flagged: true, flaggedAt: hoursAgo(4),
        stalledRole: UserRole.VP_RESEARCH,
      },
      history: [
        {
          action: ActionType.CREATE, actor: requester._id,
          timestamp: hoursAgo(14),
          previousStatus: RequestStatus.SUBMITTED, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted',
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(13),
          previousStatus: RequestStatus.MANAGER_REVIEW, newStatus: RequestStatus.BUDGET_CHECK,
          notes: 'Forwarded for budget verification',
        },
        {
          action: ActionType.APPROVE, actor: accountant._id,
          timestamp: hoursAgo(12),
          previousStatus: RequestStatus.BUDGET_CHECK, newStatus: RequestStatus.INSTITUTION_VERIFIED,
          notes: 'Budget verified — funds available', budgetAvailable: true,
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(11.5),
          previousStatus: RequestStatus.INSTITUTION_VERIFIED, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Forwarded to VP Research for approval',
        },
        {
          action: ActionType.ESCALATION_FLAGGED, actor: sys,
          timestamp: hoursAgo(4),
          previousStatus: RequestStatus.VP_RESEARCH_APPROVAL, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Auto-flagged: no action taken in 10 hours',
        },
      ],
    });

    // 3. Stalled at HOI (11h) — Dean/Chief/Chairman can bypass
    await Request.create({
      requestId: generateRequestId(),
      title: '[FLAGGED] Faculty Training Program — Stalled at HOI',
      purpose: 'Professional development training for faculty. Pending HOI approval for 11 hours.',
      college: 'EEC', department: 'Mechanical',
      costEstimate: 95000, expenseCategory: 'Training', sopReference: 'SOP-004',
      attachments: ['training-proposal.pdf'],
      requester: requester._id,
      status: RequestStatus.HOI_APPROVAL,
      escalation: {
        reminderSent: true, reminderSentAt: hoursAgo(3),
        flagged: true, flaggedAt: hoursAgo(1),
        stalledRole: UserRole.HEAD_OF_INSTITUTION,
      },
      history: [
        {
          action: ActionType.CREATE, actor: requester._id,
          timestamp: hoursAgo(11),
          previousStatus: RequestStatus.SUBMITTED, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted',
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(10.5),
          previousStatus: RequestStatus.MANAGER_REVIEW, newStatus: RequestStatus.BUDGET_CHECK,
          notes: 'Forwarded for budget check',
        },
        {
          action: ActionType.APPROVE, actor: accountant._id,
          timestamp: hoursAgo(10),
          previousStatus: RequestStatus.BUDGET_CHECK, newStatus: RequestStatus.INSTITUTION_VERIFIED,
          notes: 'Budget verified', budgetAvailable: true,
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(9.5),
          previousStatus: RequestStatus.INSTITUTION_VERIFIED, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Forwarded to VP Research',
        },
        {
          action: ActionType.APPROVE, actor: vpResearch._id,
          timestamp: hoursAgo(11),
          previousStatus: RequestStatus.VP_RESEARCH_APPROVAL, newStatus: RequestStatus.HOI_APPROVAL,
          notes: 'VP Research approved',
        },
        {
          action: ActionType.ESCALATION_FLAGGED, actor: sys,
          timestamp: hoursAgo(1),
          previousStatus: RequestStatus.HOI_APPROVAL, newStatus: RequestStatus.HOI_APPROVAL,
          notes: 'Auto-flagged: no action taken in 10 hours',
        },
      ],
    });

    // 4. Stalled at DEAN (13h) — Chief/Chairman can bypass
    await Request.create({
      requestId: generateRequestId(),
      title: '[FLAGGED] Infrastructure Upgrade — Stalled at Admin Dept',
      purpose: 'Network infrastructure upgrade for Engineering building. Pending Admin Dept review for 13 hours.',
      college: 'EEC', department: 'Electrical',
      costEstimate: 500000, expenseCategory: 'Infrastructure', sopReference: 'SOP-005',
      attachments: ['infrastructure-plan.pdf'],
      requester: requester._id,
      status: RequestStatus.DEAN_REVIEW,
      escalation: {
        reminderSent: true, reminderSentAt: hoursAgo(5),
        flagged: true, flaggedAt: hoursAgo(3),
        stalledRole: UserRole.DEAN,
      },
      history: [
        {
          action: ActionType.CREATE, actor: requester._id,
          timestamp: hoursAgo(13),
          previousStatus: RequestStatus.SUBMITTED, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted',
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(12.5),
          previousStatus: RequestStatus.MANAGER_REVIEW, newStatus: RequestStatus.BUDGET_CHECK,
          notes: 'Forwarded for budget check',
        },
        {
          action: ActionType.APPROVE, actor: accountant._id,
          timestamp: hoursAgo(12),
          previousStatus: RequestStatus.BUDGET_CHECK, newStatus: RequestStatus.INSTITUTION_VERIFIED,
          notes: 'Budget verified', budgetAvailable: true,
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(11.5),
          previousStatus: RequestStatus.INSTITUTION_VERIFIED, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Forwarded to VP Research',
        },
        {
          action: ActionType.APPROVE, actor: vpResearch._id,
          timestamp: hoursAgo(11),
          previousStatus: RequestStatus.VP_RESEARCH_APPROVAL, newStatus: RequestStatus.HOI_APPROVAL,
          notes: 'VP Research approved',
        },
        {
          action: ActionType.APPROVE, actor: hoi._id,
          timestamp: hoursAgo(10.5),
          previousStatus: RequestStatus.HOI_APPROVAL, newStatus: RequestStatus.DEAN_REVIEW,
          notes: 'HOI approved, forwarded to Admin Dept',
        },
        {
          action: ActionType.ESCALATION_FLAGGED, actor: sys,
          timestamp: hoursAgo(3),
          previousStatus: RequestStatus.DEAN_REVIEW, newStatus: RequestStatus.DEAN_REVIEW,
          notes: 'Auto-flagged: no action taken in 10 hours',
        },
      ],
    });

    // 5. Stalled at CHIEF DIRECTOR (10.5h) — Chairman only can bypass
    await Request.create({
      requestId: generateRequestId(),
      title: '[FLAGGED] Research Equipment — Stalled at Head of Campus',
      purpose: 'High-value research equipment for advanced materials lab. Pending Head of Campus approval for over 10 hours.',
      college: 'EEC', department: 'Civil',
      costEstimate: 750000, expenseCategory: 'Equipment', sopReference: 'SOP-003',
      attachments: ['research-equipment-spec.pdf'],
      requester: requester._id,
      status: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
      escalation: {
        reminderSent: true, reminderSentAt: hoursAgo(2.5),
        flagged: true, flaggedAt: hoursAgo(0.5),
        stalledRole: UserRole.CHIEF_DIRECTOR,
      },
      history: [
        {
          action: ActionType.CREATE, actor: requester._id,
          timestamp: hoursAgo(10.5),
          previousStatus: RequestStatus.SUBMITTED, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted',
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(10),
          previousStatus: RequestStatus.MANAGER_REVIEW, newStatus: RequestStatus.BUDGET_CHECK,
          notes: 'Forwarded for budget check',
        },
        {
          action: ActionType.APPROVE, actor: accountant._id,
          timestamp: hoursAgo(9.5),
          previousStatus: RequestStatus.BUDGET_CHECK, newStatus: RequestStatus.INSTITUTION_VERIFIED,
          notes: 'Budget verified', budgetAvailable: true,
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(9),
          previousStatus: RequestStatus.INSTITUTION_VERIFIED, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Forwarded to VP Research',
        },
        {
          action: ActionType.APPROVE, actor: vpResearch._id,
          timestamp: hoursAgo(8.5),
          previousStatus: RequestStatus.VP_RESEARCH_APPROVAL, newStatus: RequestStatus.HOI_APPROVAL,
          notes: 'VP Research approved',
        },
        {
          action: ActionType.APPROVE, actor: hoi._id,
          timestamp: hoursAgo(8),
          previousStatus: RequestStatus.HOI_APPROVAL, newStatus: RequestStatus.DEAN_REVIEW,
          notes: 'HOI approved',
        },
        {
          action: ActionType.APPROVE, actor: dean._id,
          timestamp: hoursAgo(7.5),
          previousStatus: RequestStatus.DEAN_REVIEW, newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
          notes: 'Admin Dept approved, forwarded to Head of Campus',
        },
        {
          action: ActionType.ESCALATION_FLAGGED, actor: sys,
          timestamp: hoursAgo(0.5),
          previousStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL, newStatus: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
          notes: 'Auto-flagged: no action taken in 10 hours',
        },
      ],
    });

    // 6. Already escalated by Dean — shows "escalated past you" state for VP
    await Request.create({
      requestId: generateRequestId(),
      title: '[FLAGGED] Travel Reimbursement — Already Escalated by Dean',
      purpose: 'Conference travel reimbursement. Was stalled at VP; Dean already took escalation action to forward it past the stalled approver.',
      college: 'EEC', department: 'Computer Science',
      costEstimate: 45000, expenseCategory: 'Travel', sopReference: 'SOP-003',
      attachments: ['travel-receipts.pdf'],
      requester: requester._id,
      status: RequestStatus.HOI_APPROVAL,
      escalation: {
        reminderSent: true, reminderSentAt: hoursAgo(8),
        flagged: true, flaggedAt: hoursAgo(6),
        stalledRole: UserRole.VP_RESEARCH,
        actedByHigherRole: UserRole.DEAN,
        actedByHigherRoleAt: hoursAgo(1),
      },
      history: [
        {
          action: ActionType.CREATE, actor: requester._id,
          timestamp: hoursAgo(16),
          previousStatus: RequestStatus.SUBMITTED, newStatus: RequestStatus.MANAGER_REVIEW,
          notes: 'Request submitted',
        },
        {
          action: ActionType.FORWARD, actor: manager._id,
          timestamp: hoursAgo(15.5),
          previousStatus: RequestStatus.MANAGER_REVIEW, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Forwarded to VP Research',
        },
        {
          action: ActionType.ESCALATION_FLAGGED, actor: sys,
          timestamp: hoursAgo(6),
          previousStatus: RequestStatus.VP_RESEARCH_APPROVAL, newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
          notes: 'Auto-flagged: no action taken in 10 hours',
        },
        {
          action: ActionType.ESCALATION_ACTION, actor: dean._id,
          timestamp: hoursAgo(1),
          previousStatus: RequestStatus.VP_RESEARCH_APPROVAL, newStatus: RequestStatus.HOI_APPROVAL,
          skippedRole: UserRole.VP_RESEARCH,
          notes: 'Escalation action by dean — forwarded past stalled VP Research',
        },
      ],
    });

    console.log('✅ Created 6 flagged demo requests');

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n👥 Login Credentials (password: password123)\n');
    users.forEach(u => console.log(`  ${u.email.padEnd(42)} ${u.name.padEnd(12)} (${u.role})`));

    console.log('\n🚩 Flagged Requests — Who Can Bypass:\n');
    console.log('  Stalled at Manager        → VP Research/Academic/Admin, HOI, Dean, Chief, Chairman');
    console.log('  Stalled at VP Research    → HOI, Dean, Chief, Chairman');
    console.log('  Stalled at HOI            → Dean, Chief, Chairman');
    console.log('  Stalled at Admin Dept     → Chief, Chairman');
    console.log('  Stalled at Head of Campus → Chairman only');
    console.log('  Already escalated by Dean → shows "escalated past you" state');

    console.log('\n💡 Demo flow:');
    console.log('  1. Log in as vp@gmail.com            → see 1 flagged request (stalled at manager)');
    console.log('  2. Log in as dean@gmail.com           → see 3 flagged requests');
    console.log('  3. Log in as chairman@gmail.com       → see all 5 active flagged requests');
    console.log('  4. Click Approve / Reject / Forward to bypass the stalled approver\n');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedTenHr();
