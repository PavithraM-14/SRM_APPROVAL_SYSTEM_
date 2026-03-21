import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus, ActionType } from '../lib/types';
import { generateRequestId } from '../lib/id-generator';

async function createVPTestRequest() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');

    // Find the required users
    const requester = await User.findOne({ role: 'requester' });
    const institutionManager = await User.findOne({ role: 'institution_manager' });

    if (!requester || !institutionManager) {
      console.error('❌ Required users not found. Please run the seed script first.');
      process.exit(1);
    }

    // Generate unique 6-digit request ID
    const requestId = await generateRequestId();

    // Create a sample request at VP Research approval stage
    const sampleRequest = await Request.create({
      requestId,
      title: 'AI Research Lab Setup',
      purpose: 'Establish a new AI research laboratory with advanced computing infrastructure for machine learning and deep learning research projects.',
      college: 'EEC',
      department: 'Computer Science and Engineering',
      costEstimate: 500000,
      expenseCategory: 'Research Infrastructure',
      attachments: ['ai-lab-proposal.pdf', 'equipment-specifications.pdf'],
      requester: requester._id,
      status: RequestStatus.VP_RESEARCH_APPROVAL,
      history: [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          notes: 'Request created and forwarded to Institution Manager for review',
          newStatus: RequestStatus.MANAGER_REVIEW,
        },
        {
          action: ActionType.APPROVE,
          actor: institutionManager._id,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          notes: 'Forwarded to VP Research for research-related approval',
          previousStatus: RequestStatus.MANAGER_REVIEW,
          newStatus: RequestStatus.VP_RESEARCH_APPROVAL,
        }
      ],
    });

    console.log('✅ VP Research test request created successfully!');
    console.log(`📋 Request ID: ${requestId}`);
    console.log(`📝 Title: ${sampleRequest.title}`);
    console.log(`🏢 College: ${sampleRequest.college}`);
    console.log(`🎓 Department: ${sampleRequest.department}`);
    console.log(`💰 Cost: ₹${sampleRequest.costEstimate.toLocaleString()}`);
    console.log(`📊 Status: ${sampleRequest.status}`);
    console.log(`👤 Requester: ${requester.name} (${requester.email})`);
    console.log(`🔄 Current Stage: VP Research Approval`);
    console.log(`\n🔑 Login as VP Research to test:`);
    console.log(`   Email: vp_research@gmail.com`);
    console.log(`   Password: password123`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating VP test request:', error);
    process.exit(1);
  }
}

createVPTestRequest();