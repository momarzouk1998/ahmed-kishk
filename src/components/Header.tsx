'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="fixed top-0 right-72 left-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-highest z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">
          search
        </span>
        <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">
          notifications
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
          Atelier System v1.0 — Ahmed Kishk
        </span>
      </div>
    </header>
  );
}
