'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SRMRMP_Logo from '../assets/SRMRMP_LOGO.png';
import OTPVerification from '../../components/OTPVerification';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const inputClass =
    'mt-1 block w-full border border-gray-400 rounded-lg px-3 py-2 ' +
    'bg-white shadow-sm placeholder-gray-500 text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        email={email}
        type="forgot-password"
        onBack={() => setStep('email')}
      />
    );
  }

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
            Forgot Password?
          </h2>
          <p className="mt-1 text-gray-600 text-sm">
            Enter your email address and we'll send you an OTP to reset your password
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@srmrmp.edu.in"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-medium shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                Sign in
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}