import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateOTP, getEmailConfigurationError, sendOTPEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, type } = await req.json(); // type: 'signup' or 'forgot-password'

    // Validate input
    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type are required' },
        { status: 400 }
      );
    }

    if (type === 'signup') {
      // For signup: Just generate and send new OTP
      const otp = generateOTP();
      
      const emailSent = await sendOTPEmail(email, otp);

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
        message: 'OTP resent successfully',
        otp: otp, // Return new OTP
      });

    } else if (type === 'forgot-password') {
      // For forgot password: Update OTP in database
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update OTP
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP email
      const emailSent = await sendOTPEmail(user.email, otp, user.name);

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
        message: 'OTP resent successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}