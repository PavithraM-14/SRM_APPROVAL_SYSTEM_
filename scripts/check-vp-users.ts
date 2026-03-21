import connectDB from '../lib/mongodb';
import User from '../models/User';

async function checkVPUsers() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');

    // Find all VP-related users
    const vpUsers = await User.find({
      role: { $in: ['vp', 'vp_research', 'vp_academic', 'vp_admin', 'research_director'] }
    }).sort({ role: 1 });

    console.log('\n👥 VP Role Users:');
    console.log('=================');
    
    if (vpUsers.length === 0) {
      console.log('❌ No VP users found');
    } else {
      vpUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   College: ${user.college || 'Not specified'}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
        console.log('   ---');
      });
    }

    // Check all user roles to see what's available
    const allRoles = await User.distinct('role');
    console.log('\n📋 All Available User Roles:');
    console.log('============================');
    allRoles.sort().forEach(role => {
      console.log(`- ${role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking VP users:', error);
    process.exit(1);
  }
}

checkVPUsers();