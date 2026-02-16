import nodemailer from 'nodemailer';

<<<<<<< Updated upstream
const isGmail = process.env.EMAIL_HOST?.includes('gmail') || process.env.EMAIL_USER?.includes('@gmail.com');

// Create transporter
const transporter = nodemailer.createTransport(
  isGmail
    ? ({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      } as any)
    : ({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: { rejectUnauthorized: false },
      } as any)
);

// Generate 6-digit OTP
=======
/**
 * Generate a 6-digit OTP
 */
>>>>>>> Stashed changes
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

<<<<<<< Updated upstream
// Send OTP email with retry logic
export async function sendOTPEmail(email: string, otp: string, name?: string): Promise<boolean> {
  console.log('Attempting to send OTP email to:', email);
  
  // Construct email content
  const mailOptions = {
    from: `"SRM-RMP Approval System" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Your Login OTP - SRM-RMP Approval System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
          .header { background: linear-gradient(135deg, #dbeafe 0%, #dbeafe 100%); color: #1e3a8a; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .greeting { font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 15px; }
          .otp-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #1d4ed8; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background-color: #fef2f2; border-left: 4px solid #dc2626; color: #991b1b; padding: 12px 16px; margin-top: 20px; border-radius: 4px; font-size: 14px; }
          .info-text { color: #4b5563; font-size: 15px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1> SRM-RMP Approval System</h1></div>
          <div class="content">
            <div class="greeting">Hello${name ? ' ' + name : ''}!</div>
            <p class="info-text">You requested to login to the SRM-RMP Approval System. Please use the following One-Time Password (OTP) to complete your login:</p>
            <div class="otp-box"><div class="otp-code">${otp}</div></div>
            <p class="info-text"><strong> This OTP is valid for 1 minute.</strong></p>
            <p class="info-text">If you didn't request this OTP, please ignore this email and ensure your account is secure.</p>
            <div class="warning"><strong> Security Notice:</strong> Never share this OTP with anyone. </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your OTP is: ${otp}`,
  };

  try {
    console.log('Sending OTP email...');
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully. MessageID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
=======
/**
 * Create and configure Nodemailer transporter
 * Uses Gmail SMTP with App Password authentication
 */
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD must be set in environment variables');
  }

  return nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send OTP email to user
 * @param email - Recipient email address
 * @param otp - 6-digit OTP code
 * @param name - Optional recipient name (defaults to 'User')
 * @returns Promise<boolean> - true if email sent successfully, false otherwise
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  name: string = 'User'
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || 'SRM Approval System'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white; 
              padding: 30px 20px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 15px 0;
              color: #4b5563;
            }
            .otp-box { 
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              border: 2px solid #2563eb; 
              padding: 25px; 
              text-align: center; 
              font-size: 36px; 
              font-weight: bold; 
              letter-spacing: 10px; 
              margin: 30px 0; 
              border-radius: 8px;
              color: #1e40af;
            }
            .expiry {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .expiry strong {
              color: #92400e;
            }
            .footer { 
              text-align: center; 
              padding: 20px 30px;
              background-color: #f9fafb;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
              font-size: 12px; 
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Thank you for signing up! Please use the following OTP code to verify your email address:</p>
              <div class="otp-box">${otp}</div>
              <div class="expiry">
                <strong>⏰ This OTP will expire in 10 minutes.</strong>
              </div>
              <p>If you didn't request this verification, please ignore this email.</p>
              <p>For security reasons, never share this OTP with anyone.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_APP_NAME || 'SRM Approval System'}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ OTP email sent successfully:', {
      messageId: info.messageId,
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }

>>>>>>> Stashed changes
    return false;
  }
}

/**
 * Send password reset OTP email
 * @param email - Recipient email address
 * @param otp - 6-digit OTP code
 * @param name - Optional recipient name (defaults to 'User')
 * @returns Promise<boolean> - true if email sent successfully, false otherwise
 */
export async function sendPasswordResetEmail(
  email: string,
  otp: string,
  name: string = 'User'
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || 'SRM Approval System'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
              color: white; 
              padding: 30px 20px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 15px 0;
              color: #4b5563;
            }
            .otp-box { 
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border: 2px solid #dc2626; 
              padding: 25px; 
              text-align: center; 
              font-size: 36px; 
              font-weight: bold; 
              letter-spacing: 10px; 
              margin: 30px 0; 
              border-radius: 8px;
              color: #991b1b;
            }
            .expiry {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .expiry strong {
              color: #92400e;
            }
            .footer { 
              text-align: center; 
              padding: 20px 30px;
              background-color: #f9fafb;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
              font-size: 12px; 
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>We received a request to reset your password. Please use the following OTP code:</p>
              <div class="otp-box">${otp}</div>
              <div class="expiry">
                <strong>⏰ This OTP will expire in 10 minutes.</strong>
              </div>
              <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
              <p>For security reasons, never share this OTP with anyone.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_APP_NAME || 'SRM Approval System'}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Password reset email sent successfully:', {
      messageId: info.messageId,
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }

    return false;
  }
}
