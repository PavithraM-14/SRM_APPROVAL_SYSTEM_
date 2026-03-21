import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus, ActionType } from '../lib/types';
import { generateRequestId } from '../lib/id-generator';

async function createAllVPTestRequests() {
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

    const vpTestRequests = [
      {
        status: RequestStatus.VP_ACADEMIC_APPROVAL,
        title: 'Academic Excellence Program',
        purpose: 'Launch a comprehensive academic excellence program to enhance student learning outcomes and faculty development.',
        category: 'Academic Development',
        cost: 300000,
        vpRole: 'VP Academic',
        email: 'vp_academic@gmail.com'
      },
      {
        status: RequestStatus.VP_ADMIN_APPROVAL,
        title: 'Campus Infrastructure Upgrade',
        purpose: 'Upgrade campus infrastructure including network systems, security systems, and administrative facilities.',
        category: 'Infrastructure',
        cost: 750000,
        vpRole: 'VP Admin',
        email: 'vp_admin@gmail.com'
      },
      {
        status: RequestStatus.RESEARCH_DIRECTOR_APPROVAL,
        title: 'Multi-disciplinary Research Initiative',
        purpose: 'Establish a multi-disciplinary research initiative focusing on sustainable technology and environmental solutions.',
        category: 'Research Program',
        cost: 1000000,
        vpRole: 'Research Director',
        email: 'research_director@gmail.com'
      }
    ];

    console.log('✅ Creating VP test requests...\n');

    for (const testReq of vpTestRequests) {
      const requestId = await generateRequestId();

      const sampleRequest = await Request.create({
        requestId,
        title: testReq.title,
        purpose: testReq.purpose,
        college: 'EEC',
        department: 'Computer Science and Engineering',
        costEstimate: testReq.cost,
        expenseCategory: testReq.category,
        attachments: [`${testReq.title.toLowerCase().replace(/\s+/g, '-')}-proposal.pdf`],
        requester: requester._id,
        status: testReq.status,
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
            notes: `Forwarded to ${testReq.vpRole} for approval`,
            previousStatus: RequestStatus.MANAGER_REVIEW,
            newStatus: testReq.status,
          }
        ],
      });

      console.log(`📋 Request ID: ${requestId}`);
      console.log(`📝 Title: ${sampleRequest.title}`);
      console.log(`💰 Cost: ₹${sampleRequest.costEstimate.toLocaleString()}`);
      console.log(`📊 Status: ${sampleRequest.status}`);
      console.log(`🔄 Current Stage: ${testReq.vpRole} Approval`);
      console.log(`🔑 Login: ${testReq.email} (password: password123)`);
      console.log('---');
    }

    console.log('\n🎉 All VP test requests created successfully!');
    console.log('\n👥 VP Login Credentials:');
    console.log('========================');
    console.log('VP Research: vp_research@gmail.com');
    console.log('VP Academic: vp_academic@gmail.com');
    console.log('VP Admin: vp_admin@gmail.com');
    console.log('Research Director: research_director@gmail.com');
    console.log('Password for all: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating VP test requests:', error);
    process.exit(1);
  }
}

createAllVPTestRequests();