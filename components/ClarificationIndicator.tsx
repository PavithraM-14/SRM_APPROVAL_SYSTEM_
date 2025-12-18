'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ClarificationIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function ClarificationIndicator({ 
  className = '', 
  size = 'md',
  showText = false 
}: ClarificationIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="relative">
        <ExclamationTriangleIcon 
          className={`${sizeClasses[size]} text-yellow-600 animate-pulse`} 
        />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} text-yellow-700 font-medium`}>
          Needs Clarification
        </span>
      )}
    </div>
  );
}