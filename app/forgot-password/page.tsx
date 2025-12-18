'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import SRMRMP_Logo from '../assets/SRMRMP_LOGO.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    
    if (res.ok) {
      router.push(`/verify-otp?email=${email}`);
    } else {
      setError(data.error || "Failed to send OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">

        {/* LOGO + SYSTEM TITLE */}
                <div className="flex flex-col items-center text-center">
                  <Image
                    src={SRMRMP_Logo}
                    alt="SRM Logo"
                    width={90}
                    height={90}
                    className="mb-4"
                    priority
                  />
                  <h1 className="text-3xl font-extrabold text-gray-900 drop-shadow-sm">
                    SRM-RMP Approval System

                  </h1>
                </div>

        <h2 className="text-3xl font-bold text-center text-gray-900">
          Forgot Password
        </h2>

        <p className="mt-2 text-center text-gray-600">
          Enter your email to receive an OTP
        </p>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        {message && <p className="text-green-600 text-sm mt-3">{message}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@srmrmp.edu.in"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-medium"
          >
            Send OTP
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          Remember your password?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-blue-600"
          >
            Sign in
          </button>
        </p>

      </div>
    </div>
  );
}
