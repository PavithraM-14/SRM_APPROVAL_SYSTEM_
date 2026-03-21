import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';

async function checkRequestStatus() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');

    // Find recent requests
    const requests = await Request.find({})
      .populate('requester', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('\n📋 Recent Requests:');
    console.log('==================');
    
    requests.forEach((req, index) => {
      console.log(`${index + 1}. Request ID: ${req.requestId || req._id.toString().slice(-6)}`);
      console.log(`   Title: ${req.title}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Requester: ${req.requester.name} (${req.requester.email})`);
      console.log(`   Created: ${new Date(req.createdAt).toLocaleDateString()}`);
      console.log('   ---');
    });

    // Find requests at institution_verified status specifically
    const verifiedRequests = await Request.find({ status: 'institution_verified' })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 });

    console.log('\n🔍 Requests at INSTITUTION_VERIFIED status:');
    console.log('=============================================');
    
    if (verifiedRequests.length === 0) {
      console.log('❌ No requests found at institution_verified status');
    } else {
      verifiedRequests.forEach((req, index) => {
        console.log(`${index + 1}. Request ID: ${req.requestId || req._id.toString().slice(-6)}`);
        console.log(`   Title: ${req.title}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Budget Available: ${req.budgetAvailable}`);
        console.log(`   SOP Reference: ${req.sopReference || 'None'}`);
        console.log('   ---');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking request status:', error);
    process.exit(1);
  }
}

checkRequestStatus();