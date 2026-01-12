import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../lib/mongodb';
import Request from '../models/Request';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function clearRequests() {
  try {
    // Check if MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.error('Please check your .env.local file');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('🗑️ Clearing all requests from database...');

    // Delete all requests
    const result = await Request.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} requests`);
    console.log('🎉 Database cleared of all requests!');

  } catch (error) {
    console.error('❌ Clear requests failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the clear function
if (require.main === module) {
  clearRequests();
}

export default clearRequests;