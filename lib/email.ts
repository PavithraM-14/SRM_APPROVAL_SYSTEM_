import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SRM Approval System';

const hasSmtpConfig = () => {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
};

export function getEmailConfigurationError(): string | null {
  if (hasSmtpConfig()) {
    return null;
  }

  return 'Configure SMTP with EMAIL_USER and EMAIL_PASSWORD';
};

const createSmtpTransporter = () => {
  if (!hasSmtpConfig()) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD must be set for SMTP');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

async function sendEmailWithSmtp(options: {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = createSmtpTransporter();

  return transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.toEmail,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

function getSmtpErrorDetails(error: unknown): {
  message: string;
  statusCode?: number;
  providerMessage?: string;
} {
  if (!error || typeof error !== 'object') {
    return { message: 'Unknown error' };
  }

  const errorObj = error as {
    message?: string;
    statusCode?: number;
    body?: { message?: string };
  };

  return {
    message: errorObj.message || 'Unknown error',
    statusCode: errorObj.statusCode,
    providerMessage: errorObj.body?.message,
  };
}

async function sendEmail(options: {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (hasSmtpConfig()) {
    const result = await sendEmailWithSmtp(options);
    return { provider: 'smtp', result };
  }

  throw new Error(getEmailConfigurationError() || 'Email service is not configured');
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const subject = 'Verify Your Email - OTP Code';
    const html = `
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
      `;
    const text = `Hello ${name},\n\nThank you for signing up! Your OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this verification, please ignore this email.`;

    const delivery = await sendEmail({
      toEmail: email,
      toName: name,
      subject,
      html,
      text,
    });
    
    console.log('✅ OTP email sent successfully:', {
      provider: delivery.provider,
      response: delivery.result,
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    const details = getSmtpErrorDetails(error);

    console.error('❌ Failed to send OTP email:', {
      error: details.message,
      statusCode: details.statusCode,
      providerMessage: details.providerMessage,
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }

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
    const subject = 'Password Reset Request - OTP Code';
    const html = `
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
      `;
    const text = `Hello ${name},\n\nWe received a request to reset your password. Your OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request a password reset, please ignore this email.`;

    const delivery = await sendEmail({
      toEmail: email,
      toName: name,
      subject,
      html,
      text,
    });
    
    console.log('✅ Password reset email sent successfully:', {
      provider: delivery.provider,
      response: delivery.result,
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    const details = getSmtpErrorDetails(error);

    console.error('❌ Failed to send password reset email:', {
      error: details.message,
      statusCode: details.statusCode,
      providerMessage: details.providerMessage,
      recipient: email,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }

    return false;
  }
}
