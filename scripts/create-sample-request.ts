import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus, ActionType } from '../lib/types';
import { generateRequestId } from '../lib/id-generator';

async function createSampleRequest() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');

    // Find the requester and institution manager users
    const requester = await User.findOne({ role: 'requester' });
    const institutionManager = await User.findOne({ role: 'institution_manager' });

    if (!requester) {
      console.error('❌ No requester user found. Please run the seed script first.');
      process.exit(1);
    }

    if (!institutionManager) {
      console.error('❌ No institution manager user found. Please run the seed script first.');
      process.exit(1);
    }

    // Generate unique 6-digit request ID
    const requestId = await generateRequestId();

    // Create a sample request at Institution Manager approval stage
    const sampleRequest = await Request.create({
      requestId,
      title: 'Purchase of Laboratory Equipment',
      purpose: 'Need to purchase new microscopes and lab equipment for the Computer Science department to enhance practical learning experience for students.',
      college: 'EEC',
      department: 'Computer Science and Engineering',
      costEstimate: 150000,
      expenseCategory: 'Equipment',
      attachments: ['sample-equipment-quotation.pdf'],
      requester: requester._id,
      status: RequestStatus.MANAGER_REVIEW,
      history: [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          notes: 'Request created and forwarded to Institution Manager for review',
          newStatus: RequestStatus.MANAGER_REVIEW,
        }
      ],
    });

    console.log('✅ Sample request created successfully!');
    console.log(`📋 Request ID: ${requestId}`);
    console.log(`📝 Title: ${sampleRequest.title}`);
    console.log(`🏢 College: ${sampleRequest.college}`);
    console.log(`🎓 Department: ${sampleRequest.department}`);
    console.log(`💰 Cost: ₹${sampleRequest.costEstimate.toLocaleString()}`);
    console.log(`📊 Status: ${sampleRequest.status}`);
    console.log(`👤 Requester: ${requester.name} (${requester.email})`);
    console.log(`🔄 Current Stage: Institution Manager Review`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample request:', error);
    process.exit(1);
  }
}

createSampleRequest();