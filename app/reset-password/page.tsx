'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import SRMRMP_Logo from '../assets/SRMRMP_LOGO.png';
import PasswordInput from '../../components/PasswordInput';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams.get('email');
  const otp = searchParams.get('otp');

  useEffect(() => {
    if (!email || !otp) {
      router.push('/forgot-password');
    }
  }, [email, otp, router]);

  const inputClass =
    'mt-1 block w-full border border-gray-400 rounded-lg px-3 py-2 ' +
    'bg-white shadow-sm placeholder-gray-500 text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login?message=Password reset successfully! Please login with your new password.');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !otp) {
    return null;
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
            Reset Your Password
          </h2>
          <p className="mt-1 text-gray-600 text-sm">
            Enter your new password below
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
              <label className="block text-sm font-medium text-gray-700">
                New Password *
              </label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                required
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-medium shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}