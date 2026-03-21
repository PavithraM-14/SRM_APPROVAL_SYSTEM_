import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus, ActionType } from '../lib/types';
import { generateRequestId } from '../lib/id-generator';

async function createVerifiedRequest() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');

    // Find the requester, institution manager, and accountant users
    const requester = await User.findOne({ role: 'requester' });
    const institutionManager = await User.findOne({ role: 'institution_manager' });
    const accountant = await User.findOne({ role: 'accountant' });

    if (!requester || !institutionManager || !accountant) {
      console.error('❌ Required users not found. Please run the seed script first.');
      process.exit(1);
    }

    // Generate unique 6-digit request ID
    const requestId = await generateRequestId();

    // Create a sample request at Institution Verified stage (ready for VP forwarding)
    const sampleRequest = await Request.create({
      requestId,
      title: 'Research Equipment Purchase',
      purpose: 'Purchase advanced research equipment for ongoing AI and Machine Learning research projects in the Computer Science department.',
      college: 'EEC',
      department: 'Computer Science and Engineering',
      costEstimate: 250000,
      expenseCategory: 'Research Equipment',
      attachments: ['research-equipment-proposal.pdf'],
      requester: requester._id,
      status: RequestStatus.INSTITUTION_VERIFIED,
      budgetAllocated: 300000,
      budgetSpent: 50000,
      budgetBalance: 250000,
      budgetAvailable: true,
      sopReference: 'SOP-2024-RES-001',
      history: [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          notes: 'Request created and forwarded to Institution Manager for review',
          newStatus: RequestStatus.MANAGER_REVIEW,
        },
        {
          action: ActionType.FORWARD,
          actor: institutionManager._id,
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
          notes: 'Forwarded to budget verification',
          previousStatus: RequestStatus.MANAGER_REVIEW,
          newStatus: RequestStatus.BUDGET_CHECK,
          sopReference: 'SOP-2024-RES-001',
        },
        {
          action: ActionType.APPROVE,
          actor: accountant._id,
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          notes: 'Budget verified and approved',
          previousStatus: RequestStatus.BUDGET_CHECK,
          newStatus: RequestStatus.INSTITUTION_VERIFIED,
          budgetAvailable: true,
          budgetAllocated: 300000,
          budgetSpent: 50000,
          budgetBalance: 250000,
        }
      ],
    });

    console.log('✅ Verified request created successfully!');
    console.log(`📋 Request ID: ${requestId}`);
    console.log(`📝 Title: ${sampleRequest.title}`);
    console.log(`🏢 College: ${sampleRequest.college}`);
    console.log(`🎓 Department: ${sampleRequest.department}`);
    console.log(`💰 Cost: ₹${sampleRequest.costEstimate.toLocaleString()}`);
    console.log(`📊 Status: ${sampleRequest.status}`);
    console.log(`👤 Requester: ${requester.name} (${requester.email})`);
    console.log(`🔄 Current Stage: Institution Verified - Ready for VP Forwarding`);
    console.log(`💼 Budget Available: ₹${sampleRequest.budgetBalance.toLocaleString()}`);
    console.log(`📋 SOP Reference: ${sampleRequest.sopReference}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating verified request:', error);
    process.exit(1);
  }
}

createVerifiedRequest();