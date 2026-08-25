'use client';

import React from 'react';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="fixed top-0 right-72 left-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-highest z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 text-on-surface-variant">
        {title && <span className="font-display font-bold text-base text-on-surface">{title}</span>}
      </div>
      <div className="flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">search</span>
        <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">notifications</span>
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider hidden md:block">
          Ahmed Kishk v1.0
        </span>
      </div>
    </header>
  );
}
