'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/components/SidebarContext';

interface PageShellProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * PageShell - Wraps every authenticated page.
 * Handles:
 *  - Responsive sidebar (drawer on mobile, fixed on desktop)
 *  - Fixed header with hamburger on mobile
 *  - Proper content offset (no pr-72 on mobile)
 *  - Sidebar context provider
 */
export default function PageShell({ title, children }: PageShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <Header title={title} />
        <div className="pt-16 lg:pr-72">
          <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
