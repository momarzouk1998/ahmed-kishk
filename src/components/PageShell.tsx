'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

interface PageShellProps {
  title?: string;
  badge?: string;
  action?: React.ReactNode;
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
function ShellContent({ title, badge, action, children }: PageShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <Header title={title} badge={badge} action={action} />
      <div className={`pt-16 transition-all duration-300 ${isCollapsed ? 'lg:pr-20' : 'lg:pr-64'}`}>
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PageShell({ title, badge, action, children }: PageShellProps) {
  return (
    <SidebarProvider>
      <ShellContent title={title} badge={badge} action={action}>{children}</ShellContent>
    </SidebarProvider>
  );
}
