'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PasswordInput from '../../components/PasswordInput';
import Image from "next/image";
import SRMRMP_Logo from "../assets/SRMRMP_LOGO.png"; 

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  /*const validateEmail = () => {
    if (email && !email.endsWith('@srmrmp.edu.in')) {
      setError('Only @srmrmp.edu.in emails are allowed');
    } else {
      setError('');
    }
  };*/

  const handleAuthLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    /*if (!email.endsWith('@srmrmp.edu.in')) {
      setError('Only @srmrmp.edu.in emails are allowed');
      setLoading(false);
      return;
    }*/
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full space-y-8 animate-fadeIn">

        {/* Logo + Title */}
<div className="flex flex-col items-center text-center">
  {/* SRM Logo */}
  <Image
    src={SRMRMP_Logo}
    alt="SRM Logo"
    width={100}
    height={100}
    className="mb-4"
    priority
  />


  {/* Title */}
  <h2 className="text-4xl font-extrabold text-gray-900 drop-shadow-sm">
    SRM-RMP Approval System
  </h2>

  <p className="mt-2 text-gray-600 text-sm">
    Sign in to your account
  </p>
</div>


        {/* Optional Success Message */}
        {message && (
          <div className="bg-green-50 text-green-600 border border-green-200 p-3 rounded-md text-sm text-center">
            {message}
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">

          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleAuthLogin}>
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
                /*onBlur={validateEmail}*/
                placeholder="name@srmrmp.edu.in"
                className="mt-1 block w-full border border-gray-400 rounded-lg px-3 py-2 bg-white shadow-sm
                           placeholder-gray-500 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                required
                placeholder="••••••••"
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-medium shadow-md transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => router.push('/signup')}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}