'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SRMRMP_Logo from '../app/assets/SRMRMP_LOGO.png';

interface OTPVerificationProps {
  email: string;
  type: 'signup' | 'forgot-password';
  onVerify?: (otp: string) => Promise<void>;
  onResend?: () => Promise<boolean>;
  onBack: () => void;
}

export default function OTPVerification({ email, type, onVerify, onResend, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    const lastFilledIndex = newOtp.findIndex(digit => digit === '');
    const focusIndex = lastFilledIndex === -1 ? 5 : lastFilledIndex;
    inputRefs.current[focusIndex]?.focus();

    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode: string) => {
    setLoading(true);
    setError('');

    try {
      if (onVerify) {
        // Custom verification handler (for signup)
        await onVerify(otpCode);
      } else {
        // Default verification (for forgot-password)
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp: otpCode, type }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid OTP');
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          return;
        }

        // For forgot-password, move to reset password step
        if (type === 'forgot-password') {
          router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${otpCode}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');

    try {
      if (onResend) {
        // Custom resend handler (for signup)
        await onResend();
      } else {
        // Default resend (for forgot-password)
        const response = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to resend OTP');
          return;
        }
      }

      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 animate-fadeIn">
      <div className="max-w-md w-full space-y-8">

        <div className="flex flex-col items-center text-center">
          <Image
            src={SRMRMP_Logo}
            alt="SRM Logo"
            width={100}
            height={100}
            className="mb-4"
            priority
          />
          <h1 className="text-3xl font-extrabold text-gray-900 drop-shadow-sm">
            SRM-RMP Approval System
          </h1>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-1 text-gray-600 text-sm">
            We&apos;ve sent a 6-digit code to<br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md text-sm mb-6 flex items-center gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Enter OTP
            </label>
            <div className="flex justify-center gap-2 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 h-14 text-center text-2xl font-bold border rounded-lg 
                    bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
                    focus:border-blue-500 transition ${
                    error
                      ? 'border-red-400 bg-red-50'
                      : digit
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-400'
                  }`}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {loading && (
            <div className="text-center mb-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 mt-2">Verifying...</p>
            </div>
          )}

          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2">Didn&apos;t receive the code?</p>
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                Resend OTP in <span className="font-semibold text-blue-700">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResendOTP}
                disabled={resending}
                className="text-blue-600 font-semibold hover:text-blue-700 disabled:opacity-50 text-sm"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
          </div>

          <button
            onClick={onBack}
            disabled={loading}
            className="w-full border border-gray-400 bg-white hover:bg-gray-50 text-gray-900 py-3 rounded-lg font-medium shadow-sm transition disabled:opacity-50"
          >
            Back to {type === 'signup' ? 'Signup' : 'Login'}
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-gray-700 text-center">
              This code expires in 1 minute. Keep this window open while checking your email.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}