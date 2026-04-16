import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../lib/mongodb';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function clearDatabase() {
  try {
    // Check if MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.error('Please check your .env.local file');
      process.exit(1);
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    console.log('🗑️  Clearing all collections...');
    
    // Get all collection names from the database
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('ℹ️  Database is already empty');
      return;
    }
    
    console.log(`📋 Found ${collections.length} collections to clear`);
    
    let totalDeleted = 0;
    
    // Clear each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      
      try {
        if (!mongoose.connection.db) {
          throw new Error('Database connection not established');
        }
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        
        if (count > 0) {
          await mongoose.connection.db.collection(collectionName).deleteMany({});
          console.log(`✅ Cleared ${collectionName}: ${count} documents deleted`);
          totalDeleted += count;
        } else {
          console.log(`ℹ️  ${collectionName}: Already empty`);
        }
      } catch (error) {
        console.log(`⚠️  Could not clear ${collectionName}: ${error}`);
      }
    }
    
    console.log(`\n🎉 Database cleared successfully!`);
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('IP') || error.message.includes('whitelist')) {
        console.error('❌ Connection failed: IP address not whitelisted');
        console.log('\n💡 To fix this:');
        console.log('   1. Go to MongoDB Atlas dashboard');
        console.log('   2. Navigate to Network Access');
        console.log('   3. Add your current IP address to the IP Access List');
        console.log('   4. Try running the script again');
      } else {
        console.error('❌ Error clearing database:', error.message);
      }
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  clearDatabase();
}

export default clearDatabase;