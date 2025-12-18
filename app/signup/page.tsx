'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../../lib/types';
import PasswordInput from '../../components/PasswordInput';
import Image from 'next/image';
import SRMRMP_Logo from '../assets/SRMRMP_LOGO.png';
import OTPVerification from '../../components/OTPVerification';

const roleOptions = [
  { value: UserRole.REQUESTER, label: 'Requester/HOD' },
  { value: UserRole.INSTITUTION_MANAGER, label: 'Institution Manager' },
  { value: UserRole.SOP_VERIFIER, label: 'SOP Verifier' },
  { value: UserRole.ACCOUNTANT, label: 'Accountant' },
  { value: UserRole.VP, label: 'Vice President' },
  { value: UserRole.HEAD_OF_INSTITUTION, label: 'Head of Institution' },
  { value: UserRole.DEAN, label: 'Dean' },
  { value: UserRole.MMA, label: 'MMA' },
  { value: UserRole.HR, label: 'HR' },
  { value: UserRole.AUDIT, label: 'Audit' },
  { value: UserRole.IT, label: 'IT' },
  { value: UserRole.CHIEF_DIRECTOR, label: 'Chief Director' },
  { value: UserRole.CHAIRMAN, label: 'Chairman' },
];

const rolesWithDepartment = [UserRole.REQUESTER];
const rolesWithoutCollege = [UserRole.CHAIRMAN];

export default function SignupPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.REQUESTER);
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpData, setOtpData] = useState<{
    otp: string;
    otpTimestamp: string;
  } | null>(null);
  const router = useRouter();

  const inputClass =
    'mt-1 block w-full border border-gray-400 rounded-lg px-3 py-2 ' +
    'bg-white shadow-sm placeholder-gray-500 text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

  const validateContactNo = () => {
    if (contactNo) {
      const digits = contactNo.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Contact number must be exactly 10 digits');
      } else {
        setError('');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const contactDigits = contactNo.replace(/\D/g, '');
    if (contactDigits.length !== 10) {
      setError('Contact number must be exactly 10 digits');
      setLoading(false);
      return;
    }

    const isDepartmentRequired = rolesWithDepartment.includes(selectedRole);
    const isCollegeRequired = !rolesWithoutCollege.includes(selectedRole);

    if (
      !name ||
      !email ||
      !password ||
      !empId ||
      !contactNo ||
      (isCollegeRequired && !college) ||
      (isDepartmentRequired && !department)
    ) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      // Send OTP to email
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'signup',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store OTP data and move to OTP verification step
        setOtpData({
          otp: data.otp,
          otpTimestamp: new Date().toISOString(),
        });
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

  const handleOTPVerified = async (otp: string) => {
    try {
      // Format contact number
      const contactDigits = contactNo.replace(/\D/g, '');
      const formattedContactNo = `+91 ${contactDigits}`;

      const isDepartmentRequired = rolesWithDepartment.includes(selectedRole);
      const isCollegeRequired = !rolesWithoutCollege.includes(selectedRole);

      // Verify OTP and create account
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          type: 'signup',
          userData: {
            name,
            empId,
            email,
            contactNo: formattedContactNo,
            password,
            role: selectedRole,
            college: isCollegeRequired ? college : null,
            department: isDepartmentRequired ? department : null,
            otp: otpData?.otp,
            otpTimestamp: otpData?.otpTimestamp,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login?message=Account created successfully! Please login.');
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'signup',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpData({
          otp: data.otp,
          otpTimestamp: new Date().toISOString(),
        });
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      throw error;
    }
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        email={email}
        type="signup"
        onVerify={handleOTPVerified}
        onResend={handleResendOTP}
        onBack={() => setStep('form')}
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
            Create an account
          </h2>
          <p className="mt-1 text-gray-600 text-sm">
            Sign up for SRM-RMP Institutional Approval System
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSignup}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your Name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
              <input
                type="text"
                required
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="Enter your ID"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@srmrmp.edu.in"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number *</label>
              <input
                type="tel"
                required
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                onBlur={validateContactNo}
                placeholder="Enter 10-digit contact number"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <PasswordInput value={password} onChange={setPassword} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setSelectedRole(role);
                  if (!rolesWithDepartment.includes(role)) setDepartment('');
                  if (rolesWithoutCollege.includes(role)) setCollege('');
                }}
                className={inputClass}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {!rolesWithoutCollege.includes(selectedRole) && (
              <div>
                <label className="block text-sm font-medium text-gray-700">College *</label>
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Enter College Name"
                  className={inputClass}
                />
              </div>
            )}

            {rolesWithDepartment.includes(selectedRole) && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter Department"
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-medium shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
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