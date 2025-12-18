import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, otp, type, userData } = await req.json();
    // type: 'signup' or 'forgot-password'
    // userData: for signup, contains all user registration data

    // Validate input
    if (!email || !otp || !type) {
      return NextResponse.json(
        { error: 'Email, OTP, and type are required' },
        { status: 400 }
      );
    }

    if (type === 'signup') {
      // For signup: Verify OTP and create user account
      if (!userData) {
        return NextResponse.json(
          { error: 'User data is required for signup' },
          { status: 400 }
        );
      }

      // Verify OTP matches what was sent
      if (userData.otp !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 401 }
        );
      }

      // Check if OTP is expired (10 minutes)
      const otpTimestamp = new Date(userData.otpTimestamp);
      const now = new Date();
      if (now.getTime() - otpTimestamp.getTime() > 10 * 60 * 1000) {
        return NextResponse.json(
          { error: 'OTP has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }

      // Create new user account
      const newUser = await User.create({
        email: userData.email.toLowerCase(),
        name: userData.name,
        empId: userData.empId,
        contactNo: userData.contactNo,
        password: userData.password,
        role: userData.role,
        college: userData.college,
        department: userData.department,
        isVerified: true, // Mark as verified since OTP was confirmed
      });

      return NextResponse.json({
        message: 'Account created successfully',
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
        },
      });

    } else if (type === 'forgot-password') {
      // For forgot password: Verify OTP from database
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if OTP exists
      if (!user.otp || !user.otpExpiry) {
        return NextResponse.json(
          { error: 'No OTP found. Please request a new one.' },
          { status: 400 }
        );
      }

      // Check if OTP is expired
      if (new Date() > user.otpExpiry) {
        return NextResponse.json(
          { error: 'OTP has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      // Verify OTP
      if (user.otp !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 401 }
        );
      }

      // OTP is valid - return success (don't clear OTP yet, will clear after password reset)
      return NextResponse.json({
        message: 'OTP verified successfully',
        email: user.email,
      });
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}