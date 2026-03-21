import connectDB from '../lib/mongodb';
import Request from '../models/Request';

async function deleteAllRequests() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');

    // Delete all requests
    const result = await Request.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} requests`);

    console.log('✅ All requests deleted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting requests:', error);
    process.exit(1);
  }
}

deleteAllRequests();