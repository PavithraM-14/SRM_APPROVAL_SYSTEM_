import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus, ActionType, UserRole } from '../lib/types';

async function createTestQueries() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Find users for different roles
    const vpResearch = await User.findOne({ role: UserRole.VP_RESEARCH });
    const institutionManager = await User.findOne({ role: UserRole.INSTITUTION_MANAGER });
    const accountant = await User.findOne({ role: UserRole.ACCOUNTANT });
    const requester = await User.findOne({ role: UserRole.REQUESTER });
    const chairman = await User.findOne({ role: UserRole.CHAIRMAN });

    if (!vpResearch || !institutionManager || !accountant || !requester || !chairman) {
      console.log('Missing required users for test');
      return;
    }

    // Create a test request
    const testRequest = new Request({
      title: 'Test Query System - Equipment Purchase',
      purpose: 'Testing the new hierarchical query system functionality',
      college: 'EEC College',
      department: 'Computer Science',
      costEstimate: 50000,
      expenseCategory: 'Equipment',
      attachments: ['test-document.pdf'],
      requester: requester._id,
      status: RequestStatus.MANAGER_REVIEW,
      history: [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          timestamp: new Date(),
          newStatus: RequestStatus.MANAGER_REVIEW
        }
      ]
    });

    await testRequest.save();
    console.log('Created test request:', testRequest._id);

    // VP Research sends query to Institution Manager
    const vpQueryToManager = {
      action: ActionType.REJECT_WITH_CLARIFICATION,
      actor: vpResearch._id,
      notes: 'Please provide more details about the equipment specifications and vendor selection process.',
      queryRequest: 'Please provide more details about the equipment specifications and vendor selection process.',
      requiresClarification: true,
      originalRejector: vpResearch._id,
      previousStatus: RequestStatus.VP_RESEARCH_APPROVAL,
      newStatus: RequestStatus.MANAGER_REVIEW,
      timestamp: new Date()
    };

    await Request.findByIdAndUpdate(testRequest._id, {
      $push: { history: vpQueryToManager },
      $set: {
        status: RequestStatus.MANAGER_REVIEW,
        pendingQuery: true,
        queryLevel: UserRole.INSTITUTION_MANAGER
      }
    });

    console.log('VP Research sent query to Institution Manager');

    // Chairman sends query to Accountant
    const chairmanQueryToAccountant = {
      action: ActionType.REJECT_WITH_CLARIFICATION,
      actor: chairman._id,
      notes: 'Please verify the budget allocation and provide detailed cost breakdown.',
      queryRequest: 'Please verify the budget allocation and provide detailed cost breakdown.',
      requiresClarification: true,
      originalRejector: chairman._id,
      previousStatus: RequestStatus.CHAIRMAN_APPROVAL,
      newStatus: RequestStatus.BUDGET_CHECK,
      timestamp: new Date()
    };

    // Create another test request for Chairman -> Accountant query
    const testRequest2 = new Request({
      title: 'Test Query System - Research Grant',
      purpose: 'Testing Chairman to Accountant query functionality',
      college: 'SRMIST',
      department: 'Engineering and Technology',
      costEstimate: 200000,
      expenseCategory: 'Research',
      attachments: ['research-proposal.pdf'],
      requester: requester._id,
      status: RequestStatus.BUDGET_CHECK,
      pendingQuery: true,
      queryLevel: UserRole.ACCOUNTANT,
      history: [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          newStatus: RequestStatus.MANAGER_REVIEW
        },
        chairmanQueryToAccountant
      ]
    });

    await testRequest2.save();
    console.log('Created Chairman -> Accountant query test request:', testRequest2._id);

    console.log('\n✅ Test queries created successfully!');
    console.log('\nTest scenarios:');
    console.log('1. VP Research -> Institution Manager query');
    console.log('2. Chairman -> Accountant query');
    console.log('\nNow you can test:');
    console.log('- Login as Institution Manager to see VP Research query');
    console.log('- Login as Accountant to see Chairman query');
    console.log('- Check that Queries page shows in navigation for all roles');
    console.log('- Verify query count badges work correctly');

  } catch (error) {
    console.error('Error creating test queries:', error);
  } finally {
    process.exit(0);
  }
}

createTestQueries();