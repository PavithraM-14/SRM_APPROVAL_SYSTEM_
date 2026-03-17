import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { UserRole } from '../../../lib/types';

export async function POST() {
  try {
    await connectDB();
    
    // Create test users if they don't exist
    const users = [
      {
        email: 'requester@srm.edu',
        name: 'Test Requester',
        empId: 'EMP001',
        password: 'password123',
        role: UserRole.REQUESTER,
        college: 'Engineering',
        department: 'Computer Science'
      },
      {
        email: 'admin@test.com',
        name: 'Test Admin',
        empId: 'ADM001',
        password: 'password123',
        role: UserRole.INSTITUTION_MANAGER,
        college: 'Administration',
        department: 'Management'
      },
      {
        email: 'accountant@test.com',
        name: 'Test Accountant',
        empId: 'ACC001',
        password: 'password123',
        role: UserRole.ACCOUNTANT,
        college: 'Finance',
        department: 'Accounts'
      }
    ];

    const createdUsers = [];
    
    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        // The User model will automatically hash the password via pre-save hook
        const testUser = await User.create(userData);
        createdUsers.push({
          email: testUser.email,
          name: testUser.name,
          role: testUser.role
        });
      }
    }
    
    if (createdUsers.length > 0) {
      return NextResponse.json({ 
        message: `${createdUsers.length} test users created`,
        users: createdUsers
      });
    }
    
    return NextResponse.json({ message: 'All test users already exist' });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({ 
      error: 'Failed to create test user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    
    const users = await User.find({}, { password: 0 }); // Exclude password field
    
    return NextResponse.json({ 
      users: users.map(user => ({
        email: user.email,
        name: user.name,
        role: user.role,
        empId: user.empId
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await connectDB();
    
    // Delete ALL users to start fresh
    const result = await User.deleteMany({});
    
    return NextResponse.json({ 
      message: `${result.deletedCount} users deleted`
    });
  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json({ 
      error: 'Failed to delete users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
