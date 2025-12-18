import nodemailer from 'nodemailer';

// Create reusable transporter with institutional email support
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Additional options for institutional servers (useful when you switch to @srmrmp.edu.in)
  tls: {
    rejectUnauthorized: false, // May be needed for self-signed certificates
  },
});

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
export async function sendOTPEmail(email: string, otp: string, name?: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"SRM-RMP Approval System" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Your Login OTP - SRM-RMP Approval System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .header {
              background: linear-gradient(135deg, #dbeafe 0%, #dbeafe 100%);
              color: #1e3a8a;
              padding: 30px 20px;
              text-align: center;
              border-radius: 12px 12px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .greeting {
              font-size: 18px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 15px;
            }
            .otp-box {
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              border: 2px solid #3b82f6;
              padding: 25px;
              text-align: center;
              margin: 25px 0;
              border-radius: 8px;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #1d4ed8;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background-color: #fef2f2;
              border-left: 4px solid #dc2626;
              color: #991b1b;
              padding: 12px 16px;
              margin-top: 20px;
              border-radius: 4px;
              font-size: 14px;
            }
            .info-text {
              color: #4b5563;
              font-size: 15px;
              margin: 15px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1> SRM-RMP Approval System</h1>
            </div>
            <div class="content">
              <div class="greeting">Hello${name ? ' ' + name : ''}!</div>
              <p class="info-text">
                You requested to login to the SRM-RMP Approval System. Please use the following 
                One-Time Password (OTP) to complete your login:
              </p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p class="info-text">
                <strong> This OTP is valid for 1 minute.</strong>
              </p>
              
              <p class="info-text">
                If you didn't request this OTP, please ignore this email and ensure your account is secure.
              </p>
              
              <div class="warning">
                <strong> Security Notice:</strong> Never share this OTP with anyone. 
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello${name ? ' ' + name : ''},

Your OTP for SRM-RMP Approval System login is: ${otp}

This OTP is valid for 1 minute.

If you didn't request this OTP, please ignore this email.

Security Notice: Never share this OTP with anyone.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

// Verify transporter configuration (useful for debugging)
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
}