import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateOTP, getEmailConfigurationError, sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 60 * 1000); // 1 minute expiry

    // Save OTP to user
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send password reset OTP email
    const emailSent = await sendPasswordResetEmail(user.email, otp, user.name);

    if (!emailSent) {
      const emailConfigError = getEmailConfigurationError();

      return NextResponse.json(
        {
          error: emailConfigError
            ? `OTP service is not configured on server: ${emailConfigError}`
            : 'Failed to send OTP email. Please try again.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'OTP sent successfully to your email',
      email: user.email,
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}