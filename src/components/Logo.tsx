'use client';

import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-24 h-24 text-2xl',
  };

  if (!imgError) {
    return (
      <img
        src="/logo.png"
        alt="أحمد كشك"
        onError={() => setImgError(true)}
        className={`${sizeClasses[size]} object-contain ${className}`}
      />
    );
  }

  // High quality SVG Vector fallback for AK Circle Logo
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="6" />
      {/* Letter A */}
      <path
        d="M25 72 L45 28 L53 28 L73 72 M33 56 L65 56"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Letter K vertical line */}
      <path
        d="M48 22 L48 78 M48 50 L68 28 M48 50 L72 72"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
