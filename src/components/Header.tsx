'use client';

import React from 'react';
import { useSidebar } from '@/components/SidebarContext';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const { toggle, isCollapsed } = useSidebar();

  return (
    <header className={`fixed top-0 right-0 left-0 transition-all duration-300 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-xs ${
      isCollapsed ? 'lg:right-20' : 'lg:right-64'
    }`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger - mobile only */}
        <button
          onClick={toggle}
          className="lg:hidden w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
          aria-label="فتح القائمة"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="w-2.5 h-2.5 rounded-full bg-brand-gold shrink-0 hidden sm:block"></div>
        {title && (
          <h1 className="font-display font-bold text-sm sm:text-base text-slate-900 tracking-tight truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
          الفرع الرئيسي
        </span>
      </div>
    </header>
  );
}
