import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  empId?: string;
  role: string;
  college?: string;
  department?: string;
}

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Validate email domain
    /*if (!email.endsWith('@srmrmp.edu.in')) {
      return NextResponse.json({ error: 'Only @srmrmp.edu.in emails are allowed' }, { status: 400 });
    }*/
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Create JWT token
    const secret = getJwtSecret();
    
    const token = await new SignJWT({ 
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      empId: user.empId,
      role: user.role,
      college: user.college,
      department: user.department,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    
    // Set cookie
    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user.toObject();
    
    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword,
      message: 'Login successful'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}