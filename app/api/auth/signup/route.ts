import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { UserRole } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    //  Added contactNo to destructuring
    const { name, empId, email, password, role, college, department, contactNo } = await request.json();
    
    // Added contactNo to validation
    if (!name || !empId || !email || !password || !contactNo) {
      return NextResponse.json({ error: 'Name, employee ID, email, password, and contact number are required' }, { status: 400 });
    }
    
    //  Validate contact number (must be exactly 10 digits)
    const contactNoDigits = contactNo.replace(/\D/g, ''); // Remove non-digits
    if (contactNoDigits.length !== 10) {
      return NextResponse.json({ error: 'Contact number must be exactly 10 digits' }, { status: 400 });
    }
    
    // Format contact number with +91 prefix
    const formattedContactNo = `+91 ${contactNoDigits}`;
    
    // Validate email domain
    if (!email.endsWith('@srmrmp.edu.in')) {
      return NextResponse.json({ error: 'Only @srmrmp.edu.in emails are allowed' }, { status: 400 });
    }
    
    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    // Check if user already exists by employee ID
    const existingUserByEmpId = await User.findOne({ empId });
    if (existingUserByEmpId) {
      return NextResponse.json({ error: 'User with this employee ID already exists' }, { status: 400 });
    }

    // Create user with formatted contactNo included
    const user = await User.create({
      name,
      empId,
      email,
      password, // Don't hash here - let the model do it
      role,
      college: college || null,
      department: department || null,
      contactNo: formattedContactNo, // Contact number added to db with +91 prefix
    });
    
    // Return success response (without password)
    const { password: _, ...userWithoutPassword } = user.toObject();
    
    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 });
  }
}