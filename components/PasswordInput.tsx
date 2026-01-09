'use client';

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export default function PasswordInput({ 
  value, 
  onChange, 
  placeholder = "••••••••", 
  required = false,
  className = "",
  id,
  name,
  autoComplete = "off"
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const baseClassName = `
    mt-1 block w-full border border-gray-400 rounded-lg px-3 py-2 pr-10
    bg-white shadow-sm placeholder-gray-500 text-gray-900
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition
    ${className}
  `;

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={baseClassName}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
        tabIndex={-1}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          // Password is visible, show "eye with slash" to indicate "click to hide"
          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        ) : (
          // Password is hidden, show "eye" to indicate "click to show"
          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        )}
      </button>
    </div>
  );
}