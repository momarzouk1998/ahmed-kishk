'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';
import { initCentralSync, onSyncReady } from '@/lib/syncService';

interface PageShellProps {
  title?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function ShellContent({ title, badge, action, children }: PageShellProps) {
  const { isCollapsed } = useSidebar();

  // Track whether the first server→localStorage sync has completed
  const [syncReady, setSyncReady] = React.useState(false);

  React.useEffect(() => {
    // Start sync engine (idempotent — only runs once per browser session)
    initCentralSync();

    // When the initial pull from the server is done, flip the flag so
    // child pages re-read their data from a fully-hydrated localStorage.
    onSyncReady(() => setSyncReady(true));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <Header title={title} badge={badge} action={action} />
      <div className={`pt-16 transition-all duration-300 ${isCollapsed ? 'lg:pr-20' : 'lg:pr-64'}`}>
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-full overflow-x-hidden">
          {/*
            Pass syncReady as a key to child content so React remounts
            the subtree once the server sync completes.  This forces
            every page that reads from localStorage in its initial
            useState/useEffect to re-run with the server-hydrated data.
          */}
          <React.Fragment key={syncReady ? 'synced' : 'local'}>
            {children}
          </React.Fragment>
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
